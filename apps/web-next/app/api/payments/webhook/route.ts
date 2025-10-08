import { json } from "../../orders/utils";
import { getAdminClient } from "@/utils/supabase/admin";
import { ensureStripe, normalizeCurrency, upsertPaymentRecord, updateOrderPaymentState } from "../utils";
import type Stripe from "stripe";

const ORDER_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

export async function POST(request: Request) {
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

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const orderId = extractOrderId(intent);
    if (!orderId) {
      return json({ ok: true, skipped: true });
    }

    const amountCents = intent.amount_received || intent.amount || 0;
    const currency = normalizeCurrency(intent.currency);

    const updateError = await updateOrderPaymentState(supabase, orderId, {
      status: "paid",
      paid_at: resolvePaidAt(intent),
      payment_intent_id: intent.id,
      amount_cents: amountCents,
      currency,
    });

    if (updateError) {
      return json({ ok: false, code: "db", message: updateError.message || String(updateError) }, 500);
    }

    await upsertPaymentRecord(supabase, orderId, intent, currency, amountCents);
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

    const updateError = await updateOrderPaymentState(supabase, orderId, {
      status: "failed",
      paid_at: null,
      payment_intent_id: intent.id,
      amount_cents: amountCents,
      currency,
    });

    if (updateError) {
      return json({ ok: false, code: "db", message: updateError.message || String(updateError) }, 500);
    }

    await upsertPaymentRecord(supabase, orderId, intent, currency, amountCents);
    return json({ ok: true });
  }

  return json({ ok: true, received: event.type });
}

export async function GET() {
  return json({ ok: false, code: "method_not_allowed" }, 405);
}
