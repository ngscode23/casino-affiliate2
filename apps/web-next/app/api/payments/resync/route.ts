import { json as jsonResponse } from "../../orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";
import {
  ensureStripe,
  mapPaymentStatus,
  mergeOrderMetadata,
  normalizeCurrency,
  resolveOrderAmount,
  upsertPaymentRecord,
  updateOrderPaymentState,
  type OrderRow,
} from "../utils";
import type Stripe from "stripe";
import { emitPaymentMetric, recordWebhookLog } from "../observability";
import { resetOrdersCache } from "@shared/sdk/ordersClient";

const MUTABLE_STATUSES = ["pending", "failed", "paid", "refunded"];

function json(body: unknown, status = 200) {
  if (status < 400) {
    resetOrdersCache();
  }
  return jsonResponse(body, status);
}

async function updateWithRetry(
  supabase: ReturnType<typeof getAdminClient>,
  orderId: string,
  payload: Record<string, unknown>,
  stage: string
) {
  const maxAttempts = 3;
  let attempt = 0;
  let lastError: { message?: string } | null = null;
  while (attempt < maxAttempts) {
    attempt += 1;
    const error = await updateOrderPaymentState(
      supabase,
      orderId,
      payload,
      { allowedStatuses: MUTABLE_STATUSES }
    );
    if (!error) return null;
    lastError = error;
    await new Promise((resolve) => setTimeout(resolve, attempt * 100));
  }
  await recordWebhookLog({
    supabase,
    type: "payments.resync.update_failed",
    status: "pending_manual_review",
    message: stage,
    payload: { orderId, stage, error: lastError?.message || "update_failed" },
  });
  return lastError;
}

export async function POST(request: Request) {
  const adminToken = process.env.ADMIN_TOKEN?.trim() ?? "";
  const headerToken =
    (request.headers.get("x-admin-token") || request.headers.get("X-Admin-Token") || "").trim();

  if (!adminToken || headerToken !== adminToken) {
    const auth = await requireAdmin(request);
    if ("response" in auth) return auth.response;
  }

  const supabase = getAdminClient();

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, code: "bad_request", message: "invalid_json" }, 400);
  }

  const rawOrderId = typeof body?.order_id === "string" ? body.order_id.trim() : "";
  const rawIntentId = typeof body?.payment_intent_id === "string" ? body.payment_intent_id.trim() : "";

  if (!rawOrderId && !rawIntentId) {
    return json({ ok: false, code: "bad_request", message: "order_id_or_intent_id_required" }, 400);
  }

  const lookup = supabase
    .from("orders")
    .select(
      "id, user_id, status, amount_cents, currency, payment_intent_id, paid_at, subtotal, discount_total, shipping_total, grand_total, metadata_b"
    )
    .limit(1);

  let orderRow: OrderRow | null = null;

  if (rawOrderId) {
    const { data, error } = await lookup.eq("id", rawOrderId).maybeSingle<OrderRow>();
    if (error) return json({ ok: false, code: "db", message: error.message }, 500);
    orderRow = data ?? null;
  } else if (rawIntentId) {
    const { data, error } = await lookup.eq("payment_intent_id", rawIntentId).maybeSingle<OrderRow>();
    if (error) return json({ ok: false, code: "db", message: error.message }, 500);
    orderRow = data ?? null;
  }

  if (!orderRow) {
    return json({ ok: false, code: "not_found" }, 404);
  }

  const intentId = rawIntentId || orderRow.payment_intent_id;
  if (!intentId) {
    return json({ ok: false, code: "bad_request", message: "payment_intent_missing" }, 400);
  }

  let stripe: Stripe;
  try {
    stripe = ensureStripe();
  } catch (error: any) {
    return json({ ok: false, code: "config_error", message: error?.message ?? "stripe_not_configured" }, 500);
  }

  let intent: Stripe.PaymentIntent;
  try {
    intent = await stripe.paymentIntents.retrieve(intentId, {
      expand: ["charges.data.balance_transaction", "latest_charge.balance_transaction"],
    });
  } catch (error: any) {
    return json({ ok: false, code: "stripe_error", message: error?.message ?? "intent_not_found" }, 502);
  }

  const { amountCents: expectedAmount, currency: expectedCurrency } = await resolveOrderAmount(
    supabase,
    orderRow.id,
    orderRow
  );

  const stripeAmount = intent.amount_received ?? intent.amount ?? expectedAmount ?? 0;
  const stripeCurrency = normalizeCurrency(intent.currency || expectedCurrency || orderRow.currency);
  const paymentStatus = mapPaymentStatus(intent.status);
  const paidAt =
    intent.status === "succeeded"
      ? intent.created
        ? new Date(intent.created * 1000).toISOString()
        : new Date().toISOString()
      : null;

  const metadataPatch = mergeOrderMetadata(orderRow.metadata_b, {
    resync: {
      intent_id: intent.id,
      status: intent.status,
      synced_at: new Date().toISOString(),
    },
  });

  const updateError = await updateWithRetry(
    supabase,
    orderRow.id,
    {
      payment_status: paymentStatus,
      payment_intent_id: intent.id,
      amount_cents: stripeAmount,
      currency: stripeCurrency,
      paid_at: paidAt,
      metadata_b: metadataPatch,
      ...(paymentStatus === "succeeded" ? { status: "paid" } : {}),
    },
    "resync"
  );

  if (updateError) {
    return json({ ok: false, code: "db", message: updateError.message || "order_update_failed" }, 500);
  }

  await upsertPaymentRecord(supabase, orderRow.id, intent, stripeCurrency, stripeAmount);

  void emitPaymentMetric("payments.resync.completed", {
    orderId: orderRow.id,
    paymentStatus,
    stripeAmount,
    stripeCurrency,
  });

  return json({
    ok: true,
    order_id: orderRow.id,
    payment_status: paymentStatus,
    amount_cents: stripeAmount,
    currency: stripeCurrency,
  });
}

export async function GET() {
  return json({ ok: false, code: "method_not_allowed" }, 405);
}
