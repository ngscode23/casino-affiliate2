import { json as jsonResponse } from "../../orders/utils";
import { getAdminClient } from "@/utils/supabase/admin";
import {
  ensureStripe,
  mapPaymentStatus,
  normalizeCurrency,
  resolveOrderAmount,
  mergeOrderMetadata,
  upsertPaymentRecord,
  updateOrderPaymentState,
  type OrderRow,
} from "../utils";
import type Stripe from "stripe";
import { notifyPayment } from "../notify";
import { emitPaymentMetric, recordWebhookLog, type WebhookLogStatus } from "../observability";
import { resetOrdersCache } from "@shared/sdk/ordersClient";

const ORDER_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MUTABLE_STATUSES = ["pending", "failed", "cancelled"];

export const runtime = "nodejs";

function json(body: unknown, status = 200) {
  if (status < 400) {
    resetOrdersCache();
  }
  return jsonResponse(body, status);
}

function extractOrderId(intent: Stripe.PaymentIntent): string | null {
  const value = intent.metadata?.order_id || intent.metadata?.orderId || "";
  const trimmed = typeof value === "string" ? value.trim() : "";
  return ORDER_ID_RE.test(trimmed) ? trimmed : null;
}

function extractOrderIdFromCharge(charge: Stripe.Charge): string | null {
  const value = charge.metadata?.order_id || charge.metadata?.orderId || "";
  const trimmed = typeof value === "string" ? value.trim() : "";
  return ORDER_ID_RE.test(trimmed) ? trimmed : null;
}

async function resolveOrderContextFromCharge(
  stripe: Stripe,
  charge: Stripe.Charge
): Promise<{ orderId: string | null; intent: Stripe.PaymentIntent | null }> {
  const directOrderId = extractOrderIdFromCharge(charge);
  if (directOrderId) {
    const intent =
      typeof charge.payment_intent === "object" && charge.payment_intent
        ? (charge.payment_intent as Stripe.PaymentIntent)
        : null;
    return { orderId: directOrderId, intent };
  }

  const intentRef = charge.payment_intent;
  if (typeof intentRef === "string" && intentRef.trim()) {
    try {
      const intent = await stripe.paymentIntents.retrieve(intentRef);
      return { orderId: extractOrderId(intent), intent };
    } catch (error: any) {
      console.warn("[payments][webhook] failed to retrieve payment intent for charge", {
        chargeId: charge.id,
        intentId: intentRef,
        error: error?.message || String(error),
      });
      return { orderId: null, intent: null };
    }
  }

  if (typeof intentRef === "object" && intentRef) {
    const intent = intentRef as Stripe.PaymentIntent;
    return { orderId: extractOrderId(intent), intent };
  }

  return { orderId: null, intent: null };
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

const UPDATE_RETRY_ATTEMPTS = 3;
const UPDATE_RETRY_BASE_DELAY_MS = 150;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureStripeWebhookRow(
  supabase: ReturnType<typeof getAdminClient>,
  event: Stripe.Event,
  rawBody: string
): Promise<void> {
  const eventId = typeof event.id === "string" ? event.id.trim() : "";
  if (!eventId) return;

  let rawPayload: unknown = null;
  try {
    rawPayload = JSON.parse(rawBody);
  } catch {
    rawPayload = event;
  }

  const createdAt =
    typeof event.created === "number" && event.created > 0
      ? new Date(event.created * 1000).toISOString()
      : new Date().toISOString();

  try {
    const { error } = await supabase
      .from("stripe_webhooks")
      .upsert(
        {
          id: eventId,
          type: event.type ?? "unknown",
          created_utc: createdAt,
          livemode: Boolean(event.livemode),
          api_version: event.api_version ?? null,
          mode: (event as any)?.mode ?? null,
          data: event.data ?? {},
          raw: rawPayload,
        },
        { onConflict: "id", ignoreDuplicates: true }
      );
    if (error && !String(error.message || "").toLowerCase().includes("duplicate")) {
      console.warn("[payments][webhook] stripe_webhooks insert failed", {
        eventId,
        error: error.message || String(error),
      });
    }
  } catch (error: any) {
    console.warn("[payments][webhook] stripe_webhooks insert exception", {
      eventId,
      error: error?.message || String(error),
    });
  }
}

type UpdateRetryContext = {
  eventId: string;
  orderId: string;
  stage: string;
};

async function updateOrderStateWithRetry(
  supabase: ReturnType<typeof getAdminClient>,
  orderId: string,
  payload: Record<string, unknown>,
  options: Parameters<typeof updateOrderPaymentState>[3],
  context: UpdateRetryContext
): Promise<{ success: boolean; error?: { message?: string } }> {
  for (let attempt = 1; attempt <= UPDATE_RETRY_ATTEMPTS; attempt += 1) {
    const error = await updateOrderPaymentState(supabase, orderId, payload, options);
    if (!error) {
      return { success: true };
    }

    if (attempt >= UPDATE_RETRY_ATTEMPTS) {
        void recordWebhookLog({
          supabase,
          type: "payments.webhook.update_failed",
          status: "pending_manual_review",
          eventId: context.eventId,
          message: context.stage,
          payload: {
            orderId: context.orderId,
            stage: context.stage,
            error: error.message || String(error),
            payloadKeys: Object.keys(payload),
          },
        });
      return { success: false, error };
    }

    await delay(UPDATE_RETRY_BASE_DELAY_MS * attempt * attempt);
  }

  return { success: false, error: { message: "retry_exhausted" } };
}

async function fetchFreshPaymentIntent(
  stripe: Stripe,
  intentId: string
): Promise<Stripe.PaymentIntent | null> {
  try {
    return await stripe.paymentIntents.retrieve(intentId, {
      expand: ["charges.data.balance_transaction", "latest_charge.balance_transaction"],
    });
  } catch (error: any) {
    console.warn("[payments][webhook] failed to refresh payment intent", {
      intentId,
      error: error?.message || String(error),
    });
    return null;
  }
}

export async function POST(request: Request) {
  // Admin simulation shortcut (dev/admin tooling): allow bypass with x-admin-token
  const ADMIN_TOKEN = process.env.ADMIN_TOKEN?.trim() ?? "";
  const adminHeaderToken =
    (request.headers.get("x-admin-token") || request.headers.get("X-Admin-Token") || "").trim();

  if (ADMIN_TOKEN && adminHeaderToken && adminHeaderToken === ADMIN_TOKEN) {
    try {
      const allowedIpList = (process.env.ADMIN_SIM_ALLOWED_IPS || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      const forwarded =
        request.headers.get("x-forwarded-for") ||
        request.headers.get("X-Forwarded-For") ||
        "";
      const forwardedIp = forwarded
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)[0];
      const clientIp =
        forwardedIp ||
        request.headers.get("x-real-ip") ||
        request.headers.get("X-Real-IP") ||
        "";
      if (allowedIpList.length > 0 && (!clientIp || !allowedIpList.includes(clientIp))) {
        return json({ ok: false, code: "admin_sim_ip_forbidden" }, 403);
      }

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
          "id, user_id, status, amount_cents, currency, payment_intent_id, paid_at, subtotal, discount_total, shipping_total, grand_total, metadata_b"
        )
        .eq("id", orderId)
        .maybeSingle<OrderRow>();
      if (orderError) return json({ ok: false, code: "db", message: orderError.message }, 500);
      if (!orderRow) return json({ ok: false, code: "not_found" }, 404);

      if (status === "succeeded" || status === "paid") {
        const { amountCents, currency } = await resolveOrderAmount(supabase, orderId, orderRow);
        const updateResult = await updateOrderStateWithRetry(
          supabase,
          orderId,
          {
            status: "succeeded",
            paid_at: new Date().toISOString(),
            payment_intent_id: intentId || orderRow.payment_intent_id,
            amount_cents: amountCents,
            currency,
            payment_status: mapPaymentStatus("succeeded"),
          },
          { allowedStatuses: MUTABLE_STATUSES },
          { eventId: "admin-sim", orderId, stage: "admin_sim_succeeded" }
        );
        if (!updateResult.success) {
          return json({ ok: false, code: "db", message: updateResult.error?.message || "admin_update_failed" }, 500);
        }

        const fakeIntent = { id: intentId || "admin_sim", status: "succeeded" } as unknown as Stripe.PaymentIntent;
        await upsertPaymentRecord(supabase, orderId, fakeIntent, currency, amountCents);
        return json({ ok: true, admin_simulated: true, status: "succeeded" });
      }

      if (status === "failed" || status === "canceled" || status === "cancelled") {
        const amountCents = Number(orderRow.amount_cents || 0);
        const currency = normalizeCurrency(orderRow.currency);
        const updateResult = await updateOrderStateWithRetry(
          supabase,
          orderId,
          {
            status: "failed",
            paid_at: null,
            payment_intent_id: intentId || orderRow.payment_intent_id,
            amount_cents: amountCents,
            currency,
            payment_status: "failed",
          },
          { allowedStatuses: MUTABLE_STATUSES },
          { eventId: "admin-sim", orderId, stage: "admin_sim_failed" }
        );
        if (!updateResult.success) {
          return json({ ok: false, code: "db", message: updateResult.error?.message || "admin_update_failed" }, 500);
        }

        const fakeIntent = { id: intentId || "admin_sim", status: "canceled" } as unknown as Stripe.PaymentIntent;
        await upsertPaymentRecord(supabase, orderId, fakeIntent, currency, amountCents);
        return json({ ok: true, admin_simulated: true, status: "failed" });
      }

      if (status === "refunded") {
        const refundAmountCentsRaw =
          typeof body?.refund_amount_cents === "number"
            ? Number(body.refund_amount_cents)
            : typeof body?.refund_amount === "number"
              ? Math.round(Number(body.refund_amount) * 100)
              : null;
        const refundAmountCents =
          refundAmountCentsRaw && refundAmountCentsRaw > 0
            ? refundAmountCentsRaw
            : Number(orderRow.amount_cents || 0);
        const refundCurrency = normalizeCurrency(orderRow.currency);
        const refundId =
          (typeof body?.refund_id === "string" && body.refund_id.trim()) || `admin-sim-${Date.now()}`;
        const rpcResult = await supabase.rpc("refund_order_apply", {
          p_order_id: orderId,
          p_refund_id: refundId,
          p_amount_cents: refundAmountCents,
          p_currency: refundCurrency.toUpperCase(),
          p_reason: (typeof body?.reason === "string" && body.reason.trim()) || "admin_simulated",
        });
        if (rpcResult.error) {
          return json({ ok: false, code: "db", message: rpcResult.error.message || "refund_apply_failed" }, 500);
        }

        const { data: refundRows } = await supabase
          .from("payment_refunds")
          .select("amount_cents, currency, refund_id")
          .eq("order_id", orderId);
        const totalRefunded = (refundRows ?? []).reduce((acc, row: any) => acc + Number(row.amount_cents || 0), 0);
        const refundCount = refundRows?.length ?? 0;
        const metadataPatch = mergeOrderMetadata(orderRow.metadata_b, {
          refunds: {
            total_cents: totalRefunded,
            count: refundCount,
            last_refund_id: refundId,
            last_amount_cents: refundAmountCents,
            last_currency: refundCurrency,
            last_reason: (typeof body?.reason === "string" && body.reason.trim()) || "admin_simulated",
            updated_at: new Date().toISOString(),
            admin: true,
          },
        });

        const updateResult = await updateOrderStateWithRetry(
          supabase,
          orderId,
          {
            status: "refunded",
            payment_status: "refunded",
            payment_intent_id: intentId || orderRow.payment_intent_id,
            refunded_at: new Date().toISOString(),
            metadata_b: metadataPatch,
          },
          { allowedStatuses: ["paid", "refunded", "failed"] },
          { eventId: "admin-sim", orderId, stage: "admin_sim_refunded" }
        );
        if (!updateResult.success) {
          return json({ ok: false, code: "db", message: updateResult.error?.message || "admin_update_failed" }, 500);
        }

        return json({
          ok: true,
          admin_simulated: true,
          status: "refunded",
          refund_id: refundId,
          total_refunded_cents: totalRefunded,
        });
      }

      if (status === "partial_refund") {
        const refundAmountCents =
          typeof body?.refund_amount_cents === "number"
            ? Number(body.refund_amount_cents)
            : typeof body?.refund_amount === "number"
              ? Math.round(Number(body.refund_amount) * 100)
              : null;
        if (!(refundAmountCents && refundAmountCents > 0)) {
          return json({ ok: false, code: "admin_sim_missing_amount" }, 400);
        }
        const refundCurrency = normalizeCurrency(orderRow.currency);
        const refundId =
          (typeof body?.refund_id === "string" && body.refund_id.trim()) || `admin-sim-${Date.now()}`;
        const rpcResult = await supabase.rpc("refund_order_apply", {
          p_order_id: orderId,
          p_refund_id: refundId,
          p_amount_cents: refundAmountCents,
          p_currency: refundCurrency.toUpperCase(),
          p_reason: (typeof body?.reason === "string" && body.reason.trim()) || "admin_partial_refund",
        });
        if (rpcResult.error) {
          return json({ ok: false, code: "db", message: rpcResult.error.message || "refund_apply_failed" }, 500);
        }

        const { data: refundRows } = await supabase
          .from("payment_refunds")
          .select("amount_cents, currency, refund_id")
          .eq("order_id", orderId);
        const totalRefunded = (refundRows ?? []).reduce((acc, row: any) => acc + Number(row.amount_cents || 0), 0);
        const refundCount = refundRows?.length ?? 0;

        const metadataPatch = mergeOrderMetadata(orderRow.metadata_b, {
          refunds: {
            total_cents: totalRefunded,
            count: refundCount,
            last_refund_id: refundId,
            last_amount_cents: refundAmountCents,
            last_currency: refundCurrency,
            last_reason: (typeof body?.reason === "string" && body.reason.trim()) || "admin_partial_refund",
            updated_at: new Date().toISOString(),
            admin: true,
          },
        });

        const updateResult = await updateOrderStateWithRetry(
          supabase,
          orderId,
          {
            payment_status: "partial_refund",
            payment_intent_id: intentId || orderRow.payment_intent_id,
            metadata_b: metadataPatch,
          },
          { allowedStatuses: ["paid", "refunded", "failed"] },
          { eventId: "admin-sim", orderId, stage: "admin_sim_partial_refund" }
        );
        if (!updateResult.success) {
          return json({ ok: false, code: "db", message: updateResult.error?.message || "admin_update_failed" }, 500);
        }

        return json({
          ok: true,
          admin_simulated: true,
          status: "partial_refund",
          refund_id: refundId,
          total_refunded_cents: totalRefunded,
        });
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

  await ensureStripeWebhookRow(supabase, event, rawBody);
  void emitPaymentMetric("webhook.received", {
    eventType: event.type ?? "unknown",
    eventId,
    livemode: Boolean(event.livemode),
  });

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const orderId = extractOrderId(intent);
    if (!orderId) {
      return json({ ok: true, skipped: true });
    }

    const { data: orderRow, error: orderError } = await supabase
      .from("orders")
      .select(
        "id, user_id, status, amount_cents, currency, payment_intent_id, paid_at, subtotal, discount_total, shipping_total, grand_total, metadata_b"
      )
      .eq("id", orderId)
      .maybeSingle<OrderRow>();

    if (orderError) {
      return json({ ok: false, code: "db", message: orderError.message || "orders_query_failed" }, 500);
    }

    if (!orderRow) {
      const refreshedIntent = await fetchFreshPaymentIntent(stripe, intent.id);
      const intentForLogs = refreshedIntent ?? intent;
      const stripeAmount = intentForLogs.amount_received ?? intentForLogs.amount ?? 0;
      const stripeCurrency = normalizeCurrency(intentForLogs.currency);
      await markWebhookMetadata(supabase, eventId, {
        mismatch_reason: "order_not_found",
        expected_amount_cents: null,
        expected_currency: null,
      });
      void notifyPayment("desync", {
        orderId,
        amountCents: stripeAmount,
        currency: stripeCurrency,
        paymentIntentId: intentForLogs.id,
        webhookEventId: eventId,
        reason: "order_not_found",
        stripeAmountCents: stripeAmount,
        stripeCurrency,
        notes: ["Stripe payment succeeded but corresponding order was not found."],
      });
      return json({ ok: true, skipped: true });
    }

    const { amountCents: expectedAmount, currency: expectedCurrency } = await resolveOrderAmount(
      supabase,
      orderId,
      orderRow
    );
    let intentSnapshot: Stripe.PaymentIntent = intent;
    let stripeAmount = intentSnapshot.amount_received ?? intentSnapshot.amount ?? 0;
    let stripeCurrency = normalizeCurrency(intentSnapshot.currency);

    const expectedMetadata = {
      expected_amount_cents: expectedAmount > 0 ? expectedAmount : null,
      expected_currency: expectedCurrency || null,
    };

    let amountForUpdate = expectedAmount;
    let currencyForUpdate = expectedCurrency;
    let paymentStatus = mapPaymentStatus(intent.status);
    let mismatchDetected = false;

    if (!(expectedAmount > 0) || stripeAmount !== expectedAmount || stripeCurrency !== expectedCurrency) {
      const refreshed = await fetchFreshPaymentIntent(stripe, intent.id);
      if (refreshed) {
        intentSnapshot = refreshed;
        stripeAmount = refreshed.amount_received ?? refreshed.amount ?? stripeAmount;
        stripeCurrency = normalizeCurrency(refreshed.currency);
        paymentStatus = mapPaymentStatus(intentSnapshot.status);
      }
      mismatchDetected = true;
      amountForUpdate = stripeAmount;
      currencyForUpdate = stripeCurrency;
      await markWebhookMetadata(supabase, eventId, {
        mismatch_reason: "amount_mismatch",
        ...expectedMetadata,
        stripe_amount_cents: stripeAmount,
        stripe_currency: stripeCurrency,
      });
      console.warn("[payments][webhook] amount mismatch", {
        orderId,
        eventId,
        expectedAmount,
        stripeAmount,
        expectedCurrency,
        stripeCurrency,
      });
    } else {
      await markWebhookMetadata(supabase, eventId, {
        mismatch_reason: null,
        ...expectedMetadata,
      });
    }

    if (!(amountForUpdate > 0)) {
      void notifyPayment("desync", {
        orderId,
        amountCents: stripeAmount,
        currency: stripeCurrency,
        paymentIntentId: intent.id,
        webhookEventId: eventId,
        userId: orderRow.user_id ?? null,
        reason: "invalid_amount",
        expectedAmountCents: expectedAmount > 0 ? expectedAmount : null,
        expectedCurrency: expectedCurrency || null,
        stripeAmountCents: stripeAmount,
        stripeCurrency,
        notes: ["Stripe reported amount could not be applied because it evaluated to zero or less."],
      });
      return json({ ok: true, mismatch: true, reason: "invalid_amount" });
    }

    const updateResult = await updateOrderStateWithRetry(
      supabase,
      orderId,
      {
        status: "succeeded",
        paid_at: resolvePaidAt(intentSnapshot),
        payment_intent_id: intentSnapshot.id,
        amount_cents: amountForUpdate,
        currency: currencyForUpdate,
        payment_status: paymentStatus,
      },
      { allowedStatuses: MUTABLE_STATUSES },
      { eventId, orderId, stage: "payment_intent_succeeded" }
    );

    if (!updateResult.success) {
      await markWebhookMetadata(supabase, eventId, {
        processing_state: "queued_manual_review",
        processing_error: updateResult.error?.message || "order_update_failed",
      });
      void emitPaymentMetric("payment_intent.succeeded.queued", {
        orderId,
        eventId,
        mismatch: mismatchDetected,
      });
      return json({ ok: true, queued: true, reason: "order_update_failed" }, 202);
    }

    await upsertPaymentRecord(supabase, orderId, intentSnapshot, currencyForUpdate, amountForUpdate);
    void emitPaymentMetric("payment_intent.succeeded.applied", {
      orderId,
      eventId,
      amountCents: amountForUpdate,
      currency: currencyForUpdate,
      mismatch: mismatchDetected,
    });

    if (mismatchDetected) {
      void notifyPayment("desync", {
        orderId,
        amountCents: amountForUpdate,
        currency: currencyForUpdate,
        paymentIntentId: intentSnapshot.id,
        webhookEventId: eventId,
        userId: orderRow.user_id ?? null,
        reason: "amount_mismatch",
        expectedAmountCents: expectedAmount > 0 ? expectedAmount : null,
        expectedCurrency: expectedCurrency || null,
        stripeAmountCents: stripeAmount,
        stripeCurrency,
        notes: ["Order totals updated using Stripe amount due to mismatch detected in webhook."],
      });
      return json({ ok: true, mismatch: true, resolved_with: "stripe_amount" });
    }

    // Fire-and-forget notification (config-driven)
    void notifyPayment("succeeded", {
      orderId,
      amountCents: amountForUpdate,
      currency: currencyForUpdate,
      paymentIntentId: intentSnapshot.id,
      webhookEventId: eventId,
      userId: orderRow.user_id ?? null,
      expectedAmountCents: expectedAmount > 0 ? expectedAmount : null,
      expectedCurrency: expectedCurrency || null,
    });

    return json({ ok: true });
  }

  if (event.type === "payment_intent.requires_action") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const orderId = extractOrderId(intent);
    if (!orderId) {
      void emitPaymentMetric("payment_intent.requires_action.skipped", {
        reason: "missing_order_id",
        eventId,
      });
      return json({ ok: true, skipped: true });
    }

    const { data: orderRow, error: orderError } = await supabase
      .from("orders")
      .select(
        "id, user_id, status, amount_cents, currency, payment_intent_id, paid_at, subtotal, discount_total, shipping_total, grand_total, metadata_b"
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
      void recordWebhookLog({
        supabase,
        type: "payments.webhook.requires_action.missing_order",
        status: "warning",
        eventId,
        message: "Missing order for requires_action intent",
        payload: { orderId, paymentIntentId: intent.id },
      });
      return json({ ok: true, skipped: true });
    }

    const amountCents = intent.amount ?? orderRow.amount_cents ?? 0;
    const currency = normalizeCurrency(intent.currency || orderRow.currency);
    const updateResult = await updateOrderStateWithRetry(
      supabase,
      orderId,
      {
        status: "pending",
        paid_at: null,
        payment_intent_id: intent.id,
        amount_cents: amountCents,
        currency,
        payment_status: mapPaymentStatus(intent.status),
      },
      { allowedStatuses: ["pending", "failed", "canceled"] },
      { eventId, orderId, stage: "payment_intent_requires_action" }
    );

    if (!updateResult.success) {
      await markWebhookMetadata(supabase, eventId, {
        processing_state: "queued_manual_review",
        processing_error: updateResult.error?.message || "order_update_failed",
      });
      void emitPaymentMetric("payment_intent.requires_action.queued", {
        orderId,
        eventId,
      });
      return json({ ok: true, queued: true, reason: "order_update_failed" }, 202);
    }

    await upsertPaymentRecord(supabase, orderId, intent, currency, amountCents);
    const reason =
      (intent.next_action && (intent.next_action as any)?.type) ||
      (intent.last_payment_error?.message as string | undefined) ||
      null;
    void emitPaymentMetric("payment_intent.requires_action.marked", {
      orderId,
      eventId,
      reason,
    });
    void notifyPayment("requires_action", {
      orderId,
      amountCents,
      currency,
      paymentIntentId: intent.id,
      webhookEventId: eventId,
      userId: orderRow.user_id ?? null,
      reason: reason ?? "Additional customer confirmation required",
    });
    return json({ ok: true, requires_action: true });
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const paymentIntentId =
      typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : charge.payment_intent && typeof charge.payment_intent === "object"
          ? (charge.payment_intent as Stripe.PaymentIntent).id
          : null;
    const chargeCurrency = normalizeCurrency(charge.currency);
    const chargeAmountRefunded = charge.amount_refunded ?? 0;

    const { orderId, intent } = await resolveOrderContextFromCharge(stripe, charge);
    if (!orderId) {
      await markWebhookMetadata(supabase, eventId, {
        mismatch_reason: "refund_order_not_found",
        expected_amount_cents: null,
        expected_currency: null,
        stripe_amount_cents: chargeAmountRefunded,
        stripe_currency: chargeCurrency,
      });
      void emitPaymentMetric("charge.refunded.missing_order", {
        eventId,
        chargeId: charge.id,
      });
      void notifyPayment("desync", {
        orderId: paymentIntentId || "unknown",
        amountCents: chargeAmountRefunded,
        currency: chargeCurrency,
        paymentIntentId,
        webhookEventId: eventId,
        reason: "refund_missing_order_id",
        stripeAmountCents: chargeAmountRefunded,
        stripeCurrency: chargeCurrency,
        chargeId: charge.id,
        notes: ["Stripe refund webhook did not include a valid order_id metadata."],
      });
      return json({ ok: true, mismatch: true, reason: "order_not_found_for_refund" });
    }

    const { data: orderRow, error: orderError } = await supabase
      .from("orders")
      .select(
        "id, user_id, status, amount_cents, currency, payment_intent_id, paid_at, subtotal, discount_total, shipping_total, grand_total, metadata_b"
      )
      .eq("id", orderId)
      .maybeSingle<OrderRow>();

    if (orderError) {
      return json({ ok: false, code: "db", message: orderError.message || "orders_query_failed" }, 500);
    }

    if (!orderRow) {
      await markWebhookMetadata(supabase, eventId, {
        mismatch_reason: "refund_order_not_found",
        expected_amount_cents: null,
        expected_currency: null,
        stripe_amount_cents: chargeAmountRefunded,
        stripe_currency: chargeCurrency,
      });
      void emitPaymentMetric("charge.refunded.unknown_order", {
        eventId,
        orderId,
        chargeId: charge.id,
      });
      void notifyPayment("desync", {
        orderId,
        amountCents: chargeAmountRefunded,
        currency: chargeCurrency,
        paymentIntentId,
        webhookEventId: eventId,
        reason: "refund_order_missing",
        stripeAmountCents: chargeAmountRefunded,
        stripeCurrency: chargeCurrency,
        chargeId: charge.id,
        notes: ["Stripe refund webhook referenced order that does not exist in database."],
      });
      return json({ ok: true, mismatch: true, reason: "order_not_found_for_refund" });
    }

    const refundsList = Array.isArray(charge.refunds?.data) ? (charge.refunds?.data as Stripe.Refund[]) : [];
    const processedRefunds: Stripe.Refund[] = [];

    for (const refund of refundsList) {
      const refundId = (refund?.id || "").trim();
      const amountCents = refund?.amount ?? 0;
      if (!refundId || !(amountCents > 0)) continue;
      const refundCurrency = normalizeCurrency(refund.currency || charge.currency);
      const rpcResult = await supabase.rpc("refund_order_apply", {
        p_order_id: orderId,
        p_refund_id: refundId,
        p_amount_cents: amountCents,
        p_currency: (refundCurrency || "usd").toUpperCase(),
        p_reason: (refund?.reason as string | undefined) || null,
      });
      if (rpcResult.error) {
        await markWebhookMetadata(supabase, eventId, {
          processing_state: "queued_manual_review",
          processing_error: rpcResult.error.message || "refund_apply_failed",
        });
      void recordWebhookLog({
        supabase,
        type: "payments.webhook.refund.rpc_failed",
        status: "pending_manual_review",
        eventId,
        message: "refund_order_apply failed",
        payload: {
          orderId,
          refundId,
          error: rpcResult.error.message || "refund_apply_failed",
        },
      });
        return json({ ok: true, queued: true, reason: "refund_apply_failed" }, 202);
      }
      processedRefunds.push(refund);
    }

    const { data: refundRows, error: refundsQueryError } = await supabase
      .from("payment_refunds")
      .select("amount_cents, currency, reason, refund_id, created_at")
      .eq("order_id", orderId);

    if (refundsQueryError) {
      await markWebhookMetadata(supabase, eventId, {
        processing_state: "queued_manual_review",
        processing_error: refundsQueryError.message || "refunds_lookup_failed",
      });
      void recordWebhookLog({
        supabase,
        type: "payments.webhook.refund.lookup_failed",
        status: "pending_manual_review",
        eventId,
        message: "payment_refunds lookup failed",
        payload: {
          orderId,
          error: refundsQueryError.message || "refunds_lookup_failed",
        },
      });
      return json({ ok: true, queued: true, reason: "refunds_lookup_failed" }, 202);
    }

    const { amountCents: orderTotalCents, currency: orderCurrency } = await resolveOrderAmount(
      supabase,
      orderId,
      orderRow
    );

    const totalRefundedCents = (refundRows ?? []).reduce((acc, row: any) => acc + Number(row.amount_cents || 0), 0);
    const refundCount = refundRows?.length ?? 0;
    const fullyRefunded = orderTotalCents > 0 && totalRefundedCents >= orderTotalCents;
    const paymentStatus = fullyRefunded ? "refunded" : "partial_refund";

    const latestRefund =
      processedRefunds.length > 0
        ? processedRefunds[processedRefunds.length - 1]
        : (refundRows?.length ? (refundRows[refundRows.length - 1] as any) : null);

    const metadataPatch = mergeOrderMetadata(orderRow.metadata_b, {
      refunds: {
        total_cents: totalRefundedCents,
        count: refundCount,
        last_refund_id:
          (latestRefund && "refund_id" in latestRefund && latestRefund.refund_id) || (latestRefund?.id ?? null),
        last_amount_cents: latestRefund ? Number((latestRefund as any).amount ?? latestRefund.amount_cents ?? 0) : null,
        last_currency: normalizeCurrency(
          (latestRefund as Stripe.Refund)?.currency || (latestRefund as any)?.currency || chargeCurrency
        ),
        last_reason:
          (latestRefund && "reason" in latestRefund
            ? (latestRefund as any).reason
            : (latestRefund as Stripe.Refund)?.reason) || null,
        updated_at: new Date().toISOString(),
      },
    });

    await markWebhookMetadata(supabase, eventId, {
      mismatch_reason: fullyRefunded ? null : "partial_refund",
      expected_amount_cents: orderTotalCents > 0 ? orderTotalCents : null,
      expected_currency: orderCurrency || null,
      stripe_amount_cents: totalRefundedCents,
      stripe_currency: chargeCurrency,
    });

    const updatePayload: Record<string, unknown> = {
      payment_status: paymentStatus,
      payment_intent_id: paymentIntentId || orderRow.payment_intent_id,
      metadata_b: metadataPatch,
    };

    if (fullyRefunded) {
      updatePayload.status = "refunded";
      updatePayload.refunded_at = new Date().toISOString();
    }

    const updateResult = await updateOrderStateWithRetry(
      supabase,
      orderId,
      updatePayload,
      { allowedStatuses: ["paid", "refunded", "canceled", "cancelled", "failed"] },
      { eventId, orderId, stage: "charge_refunded" }
    );

    if (!updateResult.success) {
      await markWebhookMetadata(supabase, eventId, {
        processing_state: "queued_manual_review",
        processing_error: updateResult.error?.message || "order_update_failed",
      });
      void emitPaymentMetric("charge.refunded.queued", {
        eventId,
        orderId,
        paymentStatus,
      });
      return json({ ok: true, queued: true, reason: "order_update_failed" }, 202);
    }

    void emitPaymentMetric("charge.refunded.processed", {
      orderId,
      eventId,
      paymentStatus,
      totalRefundedCents,
      refundCount,
    });

    const notes: string[] = [];
    if (!intent) {
      notes.push("Stripe refund processed without cached PaymentIntent metadata.");
    }
    if (refundCount > 1) {
      notes.push(`Stripe reports ${refundCount} refunds recorded for this order.`);
    }
    if (!fullyRefunded && orderTotalCents > 0) {
      const percent = ((totalRefundedCents / orderTotalCents) * 100).toFixed(2);
      notes.push(`Refunded ${percent}% (${totalRefundedCents}/${orderTotalCents} cents).`);
    }

    void notifyPayment("refunded", {
      orderId,
      amountCents: fullyRefunded ? totalRefundedCents : chargeAmountRefunded,
      currency: chargeCurrency,
      paymentIntentId,
      webhookEventId: eventId,
      userId: orderRow.user_id ?? null,
      refundId:
        (latestRefund && "refund_id" in latestRefund && latestRefund.refund_id) || (latestRefund?.id ?? null) || null,
      refundAmountCents:
        latestRefund && "amount" in latestRefund
          ? Number((latestRefund as any).amount || 0)
          : Number((latestRefund as any)?.amount_cents || 0) || null,
      refundReason:
        (latestRefund && "reason" in latestRefund
          ? (latestRefund as any).reason
          : (latestRefund as Stripe.Refund)?.reason) || null,
      chargeId: charge.id,
      notes: notes.length ? notes : undefined,
    });

    return json({
      ok: true,
      refunds_processed: processedRefunds.length,
      payment_status: paymentStatus,
      total_refunded_cents: totalRefundedCents,
    });
  }

  if (event.type?.startsWith("charge.dispute.")) {
    const dispute = event.data.object as Stripe.Dispute;
    const chargeRef = dispute.charge;
    const chargeId =
      typeof chargeRef === "string"
        ? chargeRef
        : chargeRef && typeof chargeRef === "object"
          ? (chargeRef as Stripe.Charge).id
          : null;
    let charge: Stripe.Charge | null = null;

    if (chargeId) {
      try {
        charge = await stripe.charges.retrieve(chargeId, { expand: ["payment_intent"] });
      } catch (error: any) {
        console.warn("[payments][webhook] failed to retrieve charge for dispute", {
          chargeId,
          eventId,
          error: error?.message || String(error),
        });
      }
    }

    const { orderId, intent } = charge
      ? await resolveOrderContextFromCharge(stripe, charge)
      : { orderId: null, intent: null };

    if (!orderId) {
      await markWebhookMetadata(supabase, eventId, {
        mismatch_reason: "dispute_order_not_found",
        expected_amount_cents: null,
        expected_currency: null,
      });
      void emitPaymentMetric("charge.dispute.missing_order", {
        eventId,
        chargeId,
        disputeId: dispute.id,
        type: event.type,
      });
      void notifyPayment("desync", {
        orderId: chargeId || "unknown",
        amountCents: dispute.amount ?? 0,
        currency: normalizeCurrency(dispute.currency || (charge as Stripe.Charge | null)?.currency || "usd"),
        paymentIntentId: (intent as Stripe.PaymentIntent | null)?.id ?? null,
        webhookEventId: eventId,
        reason: `charge_dispute_${dispute.status || "unknown"}`,
        stripeAmountCents: dispute.amount ?? null,
        stripeCurrency: normalizeCurrency(dispute.currency || (charge as Stripe.Charge | null)?.currency || "usd"),
        chargeId: chargeId || undefined,
        notes: ["Dispute received without matching order metadata."],
      });
      return json({ ok: true, mismatch: true, reason: "dispute_order_not_found" });
    }

    const { data: orderRow, error: orderError } = await supabase
      .from("orders")
      .select(
        "id, user_id, status, amount_cents, currency, payment_intent_id, paid_at, subtotal, discount_total, shipping_total, grand_total, metadata_b"
      )
      .eq("id", orderId)
      .maybeSingle<OrderRow>();

    if (orderError) {
      return json({ ok: false, code: "db", message: orderError.message || "orders_query_failed" }, 500);
    }

    if (!orderRow) {
      await markWebhookMetadata(supabase, eventId, {
        mismatch_reason: "dispute_order_not_found",
        expected_amount_cents: null,
        expected_currency: null,
      });
      void recordWebhookLog({
        supabase,
        type: "payments.webhook.dispute.missing_order",
        status: "warning",
        eventId,
        message: "Dispute event without matching order",
        payload: { orderId, disputeId: dispute.id },
      });
      return json({ ok: true, mismatch: true, reason: "dispute_order_not_found" });
    }

    const paymentIntentId =
      (intent as Stripe.PaymentIntent | null)?.id ??
      (typeof dispute.payment_intent === "string" ? dispute.payment_intent : null) ??
      orderRow.payment_intent_id ??
      null;

    const disputeStatus = String(dispute.status || "").toLowerCase();
    const disputeReason = (dispute.reason as string | undefined) || null;
    const disputeCurrency = normalizeCurrency(
      dispute.currency || (charge as Stripe.Charge | null)?.currency || orderRow.currency
    );
    const disputedAmount = dispute.amount ?? 0;

    let targetPaymentStatus: string = "failed";
    let targetOrderStatus: string | null = null;
    if (disputeStatus === "won") {
      targetPaymentStatus = "succeeded";
    } else if (disputeStatus === "lost") {
      targetPaymentStatus = "failed";
      targetOrderStatus = "failed";
    } else {
      targetPaymentStatus = "failed";
    }

    const evidenceDueBySeconds = dispute.evidence_details?.due_by ?? null;
    const metadataPatch = mergeOrderMetadata(orderRow.metadata_b, {
      dispute: {
        id: dispute.id,
        status: disputeStatus || event.type.split(".").slice(-1)[0],
        reason: disputeReason,
        amount_cents: disputedAmount,
        currency: disputeCurrency,
        charge_id: chargeId,
        evidence_due_by: evidenceDueBySeconds ? new Date(evidenceDueBySeconds * 1000).toISOString() : null,
        created_at: dispute.created ? new Date(dispute.created * 1000).toISOString() : null,
        updated_at: new Date().toISOString(),
      },
    });

    const updatePayload: Record<string, unknown> = {
      payment_status: targetPaymentStatus,
      payment_intent_id: paymentIntentId,
      metadata_b: metadataPatch,
    };

    if (targetOrderStatus) {
      updatePayload.status = targetOrderStatus;
    }

    await markWebhookMetadata(supabase, eventId, {
      mismatch_reason: targetPaymentStatus === "failed" ? "dispute" : null,
      processing_state: `dispute_${disputeStatus || "unknown"}`,
    });

    const updateResult = await updateOrderStateWithRetry(
      supabase,
      orderId,
      updatePayload,
      { allowedStatuses: ["paid", "pending", "failed", "refunded"] },
      { eventId, orderId, stage: event.type }
    );

    if (!updateResult.success) {
      await markWebhookMetadata(supabase, eventId, {
        processing_state: "queued_manual_review",
        processing_error: updateResult.error?.message || "order_update_failed",
      });
      void recordWebhookLog({
        supabase,
        type: "payments.webhook.dispute.update_failed",
        status: "pending_manual_review",
        eventId,
        message: "Failed to update order for dispute event",
        payload: {
          orderId,
          disputeId: dispute.id,
          error: updateResult.error?.message || "order_update_failed",
        },
      });
      return json({ ok: true, queued: true, reason: "order_update_failed" }, 202);
    }

    void emitPaymentMetric("charge.dispute.processed", {
      orderId,
      eventId,
      disputeId: dispute.id,
      disputeStatus,
      disputedAmount,
    });

    const notes: string[] = [`Stripe dispute status: ${disputeStatus || "unknown"}.`];
    if (disputeReason) notes.push(`Reason: ${disputeReason}`);
    if (disputedAmount > 0) notes.push(`Disputed amount: ${disputedAmount} cents.`);

    void notifyPayment("desync", {
      orderId,
      amountCents: disputedAmount || orderRow.amount_cents || 0,
      currency: disputeCurrency || normalizeCurrency(orderRow.currency),
      paymentIntentId,
      webhookEventId: eventId,
      userId: orderRow.user_id ?? null,
      reason: `charge_dispute_${disputeStatus || "unknown"}`,
      stripeAmountCents: disputedAmount || null,
      stripeCurrency: disputeCurrency,
      chargeId: chargeId || undefined,
      notes,
    });

    return json({ ok: true, dispute_status: disputeStatus || "unknown" });
  }

  if (event.type === "payment_intent.payment_failed" || event.type === "payment_intent.canceled") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const orderId = extractOrderId(intent);
    if (!orderId) {
      return json({ ok: true, skipped: true });
    }

    const amountCents = intent.amount || 0;
    const currency = normalizeCurrency(intent.currency);

    const updateResult = await updateOrderStateWithRetry(
      supabase,
      orderId,
      {
        status: "failed",
        paid_at: null,
        payment_intent_id: intent.id,
        amount_cents: amountCents,
        currency,
        payment_status: mapPaymentStatus(intent.status),
      },
      { allowedStatuses: MUTABLE_STATUSES },
      { eventId, orderId, stage: "payment_intent_failed" }
    );

    if (!updateResult.success) {
      await markWebhookMetadata(supabase, eventId, {
        processing_state: "queued_manual_review",
        processing_error: updateResult.error?.message || "order_update_failed",
      });
      void emitPaymentMetric("payment_intent.failed.queued", {
        orderId,
        eventId,
      });
      return json({ ok: true, queued: true, reason: "order_update_failed" }, 202);
    }

    await upsertPaymentRecord(supabase, orderId, intent, currency, amountCents);
    void emitPaymentMetric("payment_intent.failed.processed", {
      orderId,
      eventId,
      amountCents,
      currency,
    });

    const failureReason =
      (intent.last_payment_error?.message as string | undefined) ||
      (intent.cancellation_reason as string | undefined) ||
      null;

    // Fire-and-forget notification (config-driven)
    void notifyPayment("failed", {
      orderId,
      amountCents,
      currency,
      paymentIntentId: intent.id,
      webhookEventId: eventId,
      userId: null,
      reason: failureReason,
    });

    return json({ ok: true });
  }

  const dataObject = (event.data?.object ?? null) as Partial<Stripe.PaymentIntent> &
    Partial<Stripe.Charge> &
    Record<string, unknown>;
  let fallbackOrderId: string | null = null;
  if (dataObject && typeof dataObject === "object") {
    if ((dataObject as Stripe.PaymentIntent).object === "payment_intent") {
      fallbackOrderId = extractOrderId(dataObject as Stripe.PaymentIntent);
    } else if ((dataObject as Stripe.Charge).object === "charge") {
      fallbackOrderId = extractOrderIdFromCharge(dataObject as Stripe.Charge);
    } else if (typeof (dataObject as any)?.metadata === "object") {
      const raw = (dataObject as any)?.metadata?.order_id || (dataObject as any)?.metadata?.orderId;
      if (typeof raw === "string" && ORDER_ID_RE.test(raw.trim())) {
        fallbackOrderId = raw.trim();
      }
    }
  }

  const fallbackCurrency = normalizeCurrency((dataObject as any)?.currency || null);
  const fallbackAmount =
    typeof (dataObject as any)?.amount === "number"
      ? Number((dataObject as any).amount)
      : typeof (dataObject as any)?.amount_cents === "number"
        ? Number((dataObject as any).amount_cents)
        : null;

  void emitPaymentMetric("webhook.unhandled", {
    eventType: event.type ?? "unknown",
    eventId,
    orderId: fallbackOrderId ?? "unknown",
  });
  void recordWebhookLog({
    supabase,
    type: "payments.webhook.unhandled",
    status: "warning",
    eventId,
    message: `Unhandled webhook event: ${event.type ?? "unknown"}`,
    payload: {
      eventType: event.type ?? "unknown",
      orderId: fallbackOrderId ?? null,
    },
  });

  if (fallbackOrderId) {
    void notifyPayment("desync", {
      orderId: fallbackOrderId,
      amountCents: fallbackAmount ?? 0,
      currency: fallbackCurrency,
      paymentIntentId: (dataObject as Stripe.PaymentIntent)?.id ?? null,
      webhookEventId: eventId,
      reason: `unhandled_event:${event.type ?? "unknown"}`,
      stripeAmountCents: fallbackAmount,
      stripeCurrency: fallbackCurrency,
      notes: ["Stripe sent an unhandled webhook event type. Manual review recommended."],
    });
  }

  return json({ ok: true, received: event.type, handled: false });
}

export async function GET() {
  return json({ ok: false, code: "method_not_allowed" }, 405);
}
