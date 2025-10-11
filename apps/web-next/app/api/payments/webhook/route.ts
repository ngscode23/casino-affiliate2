import { json } from "../../orders/utils";
import { getAdminClient } from "@/utils/supabase/admin";
import {
  ensureStripe,
  normalizeCurrency,
  resolveOrderAmount,
  upsertPaymentRecord,
  updateOrderPaymentState,
  type OrderRow,
} from "../utils";
import type Stripe from "stripe";
import { notifyPayment } from "../notify";

const ORDER_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MUTABLE_STATUSES = ["pending", "failed"];

export const runtime = "nodejs";

function extractOrderId(intent: Stripe.PaymentIntent): string | null {
  const value = intent.metadata?.order_id || intent.metadata?.orderId || "";
  const trimmed = typeof value === "string" ? value.trim() : "";
  return ORDER_ID_RE.test(trimmed) ? trimmed : null;
}

function resolvePaidAt(intent: Stripe.PaymentIntent): string {
  if (intent.created) {
    return new Date(intent.created * 1000).toISOString();
  }
  return new Date().toISOString();
}

async function markWebhookMetadata(
  supabase: ReturnType<typeof getAdminClient>,
  eventId: string,
  payload: Record<string, unknown>
) {
  const { error } = await supabase.from("stripe_webhooks").update(payload).eq("id", eventId);
  if (error) {
    console.warn("[payments][webhook] failed to update stripe_webhooks", {
      eventId,
      payloadKeys: Object.keys(payload),
      error: error.message || String(error),
    });
  }
}

export async function POST(request: Request) {
  // Admin simulation shortcut (dev/admin tooling): allow bypass with x-admin-token
  const ADMIN_TOKEN = process.env.ADMIN_TOKEN?.trim() ?? "";
  const adminHeaderToken =
    (request.headers.get("x-admin-token") || request.headers.get("X-Admin-Token") || "").trim();

  if (ADMIN_TOKEN && adminHeaderToken && adminHeaderToken === ADMIN_TOKEN) {
    try {
      const supabase = getAdminClient();
      let body: any = {};
      try {
        body = await request.json();
      } catch {
        body = {};
      }

      const status = String(body?.status || "").toLowerCase();
      let orderId = typeof body?.order_id === "string" ? body.order_id.trim() : "";
      const paymentRowId = typeof body?.payment_id === "string" ? body.payment_id.trim() : "";
      let intentId = typeof body?.payment_intent_id === "string" ? body.payment_intent_id.trim() : "";

      if (!orderId && (paymentRowId || intentId)) {
        if (paymentRowId) {
          const { data: pay } = await supabase
            .from("payments")
            .select("order_id, provider_ref")
            .eq("id", paymentRowId)
            .maybeSingle<{ order_id: string; provider_ref: string | null }>();
          if (pay) {
            orderId = pay.order_id;
            if (!intentId && pay.provider_ref) intentId = pay.provider_ref;
          }
        }
        if (!orderId && intentId) {
          const { data: pay2 } = await supabase
            .from("payments")
            .select("order_id")
            .eq("provider_ref", intentId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle<{ order_id: string }>();
          if (pay2) orderId = pay2.order_id;
        }
      }

      if (!orderId) {
        return json({ ok: false, code: "admin_sim_no_order" }, 400);
      }

      const { data: orderRow, error: orderError } = await supabase
        .from("orders")
        .select(
          "id, user_id, status, amount_cents, currency, payment_intent_id, paid_at, subtotal, discount_total, shipping_total, grand_total"
        )
        .eq("id", orderId)
        .maybeSingle<OrderRow>();
      if (orderError) return json({ ok: false, code: "db", message: orderError.message }, 500);
      if (!orderRow) return json({ ok: false, code: "not_found" }, 404);

      if (status === "succeeded" || status === "paid") {
        const { amountCents, currency } = await resolveOrderAmount(supabase, orderId, orderRow);
        const updateError = await updateOrderPaymentState(
          supabase,
          orderId,
          {
            status: "paid",
            paid_at: new Date().toISOString(),
            payment_intent_id: intentId || orderRow.payment_intent_id,
            amount_cents: amountCents,
            currency,
          },
          { allowedStatuses: MUTABLE_STATUSES }
        );
        if (updateError) return json({ ok: false, code: "db", message: updateError.message }, 500);

        const fakeIntent = { id: intentId || "admin_sim", status: "succeeded" } as unknown as Stripe.PaymentIntent;
        await upsertPaymentRecord(supabase, orderId, fakeIntent, currency, amountCents);
        return json({ ok: true, admin_simulated: true, status: "paid" });
      }

      if (status === "failed" || status === "canceled" || status === "cancelled") {
        const amountCents = Number(orderRow.amount_cents || 0);
        const currency = normalizeCurrency(orderRow.currency);
        const updateError = await updateOrderPaymentState(
          supabase,
          orderId,
          {
            status: "failed",
            paid_at: null,
            payment_intent_id: intentId || orderRow.payment_intent_id,
            amount_cents: amountCents,
            currency,
          },
          { allowedStatuses: MUTABLE_STATUSES }
        );
        if (updateError) return json({ ok: false, code: "db", message: updateError.message }, 500);

        const fakeIntent = { id: intentId || "admin_sim", status: "canceled" } as unknown as Stripe.PaymentIntent;
        await upsertPaymentRecord(supabase, orderId, fakeIntent, currency, amountCents);
        return json({ ok: true, admin_simulated: true, status: "failed" });
      }

      return json({ ok: false, code: "admin_sim_unknown_status" }, 400);
    } catch (e: any) {
      return json({ ok: false, code: "admin_sim_error", message: e?.message || String(e) }, 500);
    }
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
  if (!webhookSecret) {
    return json({ ok: false, code: "config_error", message: "STRIPE_WEBHOOK_SECRET missing" }, 500);
  }

  let stripe;
  try {
    stripe = ensureStripe();
  } catch (error: any) {
    return json({ ok: false, code: "config_error", message: error?.message ?? "stripe_not_configured" }, 500);
  }

  const signature =
    request.headers.get("stripe-signature") ||
    request.headers.get("Stripe-Signature") ||
    request.headers.get("STRIPE-SIGNATURE");

  if (!signature) {
    return json({ ok: false, code: "missing_signature" }, 400);
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error: any) {
    return json({ ok: false, code: "invalid_signature", message: error?.message ?? "signature_verification_failed" }, 400);
  }

  const supabase = getAdminClient();
  const eventId = typeof event.id === "string" ? event.id.trim() : "";
  if (!eventId) {
    return json({ ok: false, code: "invalid_event_id" }, 400);
  }

  const { data: existingEvent, error: processedLookupError } = await supabase
    .from("processed_events")
    .select("event_id")
    .eq("event_id", eventId)
    .maybeSingle<{ event_id: string }>();

  if (processedLookupError) {
    return json({ ok: false, code: "db", message: processedLookupError.message || "processed_lookup_failed" }, 500);
  }

  if (existingEvent?.event_id) {
    return json({ ok: true, duplicate: true });
  }

  const { error: processedInsertError } = await supabase.from("processed_events").insert({
    event_id: eventId,
    event_type: event.type ?? null,
  });

  if (processedInsertError) {
    return json({ ok: false, code: "db", message: processedInsertError.message || "processed_insert_failed" }, 500);
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const orderId = extractOrderId(intent);
    if (!orderId) {
      return json({ ok: true, skipped: true });
    }

    const { data: orderRow, error: orderError } = await supabase
      .from("orders")
      .select(
        "id, user_id, status, amount_cents, currency, payment_intent_id, paid_at, subtotal, discount_total, shipping_total, grand_total"
      )
      .eq("id", orderId)
      .maybeSingle<OrderRow>();

    if (orderError) {
      return json({ ok: false, code: "db", message: orderError.message || "orders_query_failed" }, 500);
    }

    if (!orderRow) {
      await markWebhookMetadata(supabase, eventId, {
        mismatch_reason: "order_not_found",
        expected_amount_cents: null,
        expected_currency: null,
      });
      return json({ ok: true, skipped: true });
    }

    const { amountCents: expectedAmount, currency: expectedCurrency } = await resolveOrderAmount(supabase, orderId, orderRow);
    const stripeAmount = intent.amount_received ?? intent.amount ?? 0;
    const stripeCurrency = normalizeCurrency(intent.currency);

    const expectedMetadata = {
      expected_amount_cents: expectedAmount > 0 ? expectedAmount : null,
      expected_currency: expectedCurrency || null,
    };

    if (!(expectedAmount > 0) || stripeAmount !== expectedAmount || stripeCurrency !== expectedCurrency) {
      await markWebhookMetadata(supabase, eventId, {
        mismatch_reason: "amount_mismatch",
        ...expectedMetadata,
      });
      console.warn("[payments][webhook] amount mismatch", {
        orderId,
        eventId,
        expectedAmount,
        stripeAmount,
        expectedCurrency,
        stripeCurrency,
      });
      return json({ ok: true, mismatch: true });
    }

    await markWebhookMetadata(supabase, eventId, {
      mismatch_reason: null,
      ...expectedMetadata,
    });

    const updateError = await updateOrderPaymentState(
      supabase,
      orderId,
      {
        status: "paid",
        paid_at: resolvePaidAt(intent),
        payment_intent_id: intent.id,
        amount_cents: expectedAmount,
        currency: expectedCurrency,
      },
      { allowedStatuses: MUTABLE_STATUSES }
    );

    if (updateError) {
      return json({ ok: false, code: "db", message: updateError.message || String(updateError) }, 500);
    }

    await upsertPaymentRecord(supabase, orderId, intent, expectedCurrency, expectedAmount);

    // Fire-and-forget notification (config-driven)
    void notifyPayment("succeeded", {
      orderId,
      amountCents: expectedAmount,
      currency: expectedCurrency,
      paymentIntentId: intent.id,
      webhookEventId: eventId,
      userId: orderRow.user_id ?? null,
    });

    return json({ ok: true });
  }

  if (event.type === "payment_intent.payment_failed" || event.type === "payment_intent.canceled") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const orderId = extractOrderId(intent);
    if (!orderId) {
      return json({ ok: true, skipped: true });
    }

    const amountCents = intent.amount || 0;
    const currency = normalizeCurrency(intent.currency);

    const updateError = await updateOrderPaymentState(
      supabase,
      orderId,
      {
        status: "failed",
        paid_at: null,
        payment_intent_id: intent.id,
        amount_cents: amountCents,
        currency,
      },
      { allowedStatuses: MUTABLE_STATUSES }
    );

    if (updateError) {
      return json({ ok: false, code: "db", message: updateError.message || String(updateError) }, 500);
    }

    await upsertPaymentRecord(supabase, orderId, intent, currency, amountCents);

    // Fire-and-forget notification (config-driven)
    void notifyPayment("failed", {
      orderId,
      amountCents,
      currency,
      paymentIntentId: intent.id,
      webhookEventId: eventId,
      userId: null,
    });

    return json({ ok: true });
  }

  return json({ ok: true, received: event.type });
}

export async function GET() {
  return json({ ok: false, code: "method_not_allowed" }, 405);
}
