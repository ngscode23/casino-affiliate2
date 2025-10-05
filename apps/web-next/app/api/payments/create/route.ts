import { json, toNumber } from "../../orders/utils";
import { requireAuth } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";
import { ensureStripe, normalizeCurrency, upsertPaymentRecord, updateOrderPaymentState, type AdminSupabaseClient } from "../utils";
import type Stripe from "stripe";

type OrderRow = {
  id: string;
  user_id: string | null;
  status: string | null;
  amount_cents: number | null;
  currency: string | null;
  paid_at: string | null;
  payment_intent_id: string | null;
  subtotal?: number | string | null;
  discount_total?: number | string | null;
  shipping_total?: number | string | null;
  grand_total?: number | string | null;
};

const ORDER_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function resolveAmountCents(
  supabase: AdminSupabaseClient,
  orderId: string,
  row: OrderRow
): Promise<{ amountCents: number; currency: string }> {
  let amountCents = Number(row.amount_cents ?? 0);
  let currency = normalizeCurrency(row.currency);

  if (!(amountCents > 0)) {
    const { data: viewRow } = await supabase
      .from("order_v2")
      .select("amount_total, currency")
      .eq("id", orderId)
      .maybeSingle();
    if (viewRow) {
      amountCents = Math.round(toNumber((viewRow as any).amount_total) * 100);
      currency = normalizeCurrency((viewRow as any).currency) || currency;
    }
  }

  if (!(amountCents > 0)) {
    const subtotal = toNumber(row.subtotal);
    const discount = toNumber(row.discount_total);
    const shipping = toNumber(row.shipping_total);
    const grand = toNumber(row.grand_total);
    const fallbackTotal = grand || subtotal - discount + shipping;
    if (fallbackTotal > 0) {
      amountCents = Math.round(fallbackTotal * 100);
    }
  }

  if (!(amountCents > 0)) {
    const { data: items } = await supabase
      .from("order_items")
      .select("total, qty, unit_price")
      .eq("order_id", orderId);

    if (Array.isArray(items)) {
      const sum = items.reduce((acc, item: any) => {
        const total = toNumber(item.total);
        if (total > 0) return acc + total;
        const qty = toNumber(item.qty);
        const unit = toNumber(item.unit_price);
        return acc + qty * unit;
      }, 0);
      if (sum > 0) {
        amountCents = Math.round(sum * 100);
      }
    }
  }

  return { amountCents, currency };
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ("response" in auth) return auth.response;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, code: "bad_request", message: "invalid_json" }, 400);
    }

    const orderId = typeof (body as any)?.order_id === "string" ? (body as any).order_id.trim() : "";
    if (!ORDER_ID_RE.test(orderId)) {
      return json({ ok: false, code: "bad_request", message: "order_id_invalid" }, 400);
    }

    const supabase = getAdminClient();
    const { data: orderRow, error: orderError } = await supabase
      .from("orders")
      .select(
        "id, user_id, status, amount_cents, currency, payment_intent_id, paid_at, subtotal, discount_total, shipping_total, grand_total"
      )
      .eq("id", orderId)
      .maybeSingle<OrderRow>();

    if (orderError) {
      return json({ ok: false, code: "db", message: orderError.message }, 500);
    }
    if (!orderRow) {
      return json({ ok: false, code: "not_found" }, 404);
    }

    if (orderRow.user_id && orderRow.user_id !== auth.user.id) {
      return json({ ok: false, code: "forbidden" }, 403);
    }

    const status = String(orderRow.status || "").toLowerCase();
    if (status === "paid" || status === "succeeded" || orderRow.paid_at) {
      return json({ ok: false, code: "already_paid" }, 409);
    }

    const { amountCents, currency } = await resolveAmountCents(supabase, orderId, orderRow);
    if (!(amountCents > 0)) {
      await supabase
        .from("orders")
        .update({ status: "failed" })
        .eq("id", orderId);
      return json({ ok: false, code: "invalid_amount" }, 422);
    }

    let stripe;
    try {
      stripe = ensureStripe();
    } catch (error: any) {
      return json({ ok: false, code: "config_error", message: error?.message ?? "stripe_not_configured" }, 500);
    }

    let existingIntentId = orderRow.payment_intent_id?.trim() || "";
    if (!existingIntentId) {
      const { data: paymentRow } = await supabase
        .from("payments")
        .select("provider_ref, provider")
        .eq("order_id", orderId)
        .eq("provider", "stripe")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<{ provider_ref: string | null }>();
      if (paymentRow?.provider_ref) {
        existingIntentId = paymentRow.provider_ref.trim();
      }
    }

    let intent: Stripe.PaymentIntent | null = null;

    if (existingIntentId) {
      try {
        const fetched = await stripe.paymentIntents.retrieve(existingIntentId);
        if (fetched.status === "succeeded") {
          const updateError = await updateOrderPaymentState(supabase, orderId, {
            status: "paid",
            paid_at: fetched.created ? new Date(fetched.created * 1000).toISOString() : new Date().toISOString(),
            payment_intent_id: fetched.id,
            amount_cents: amountCents,
            currency,
          });
          if (updateError) {
            return json({ ok: false, code: "db", message: updateError.message || String(updateError) }, 500);
          }
          await upsertPaymentRecord(supabase, orderId, fetched, currency, amountCents);
          return json({ ok: false, code: "already_paid" }, 409);
        }
        if (fetched.amount !== amountCents || fetched.currency !== currency) {
          intent = await stripe.paymentIntents.update(existingIntentId, {
            amount: amountCents,
            currency,
            metadata: { order_id: orderId, user_id: auth.user.id },
          });
        } else {
          intent = fetched;
        }
      } catch {
        intent = null;
      }
    }

    if (!intent) {
      intent = await stripe.paymentIntents.create(
        {
          amount: amountCents,
          currency,
          metadata: { order_id: orderId, user_id: auth.user.id },
          automatic_payment_methods: { enabled: true },
        },
        { idempotencyKey: `order-${orderId}` }
      );
    }

    const updateError = await updateOrderPaymentState(supabase, orderId, {
      status: intent.status === "succeeded" ? "paid" : "pending",
      paid_at: intent.status === "succeeded" ? new Date().toISOString() : null,
      payment_intent_id: intent.id,
      amount_cents: amountCents,
      currency,
    });

    if (updateError) {
      return json({ ok: false, code: "db", message: updateError.message || String(updateError) }, 500);
    }

    await upsertPaymentRecord(supabase, orderId, intent, currency, amountCents);

    if (!intent.client_secret) {
      return json({ ok: false, code: "stripe_error", message: "missing_client_secret" }, 502);
    }

    return json({
      ok: true,
      order_id: orderId,
      client_secret: intent.client_secret,
      status: intent.status,
    });
  } catch (error: any) {
    const message = error?.message ?? "internal_error";
    return json({ ok: false, code: "internal", message }, 500);
  }
}

export async function GET() {
  return json({ ok: false, code: "method_not_allowed" }, 405);
}
