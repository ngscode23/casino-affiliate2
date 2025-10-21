import { json as jsonResponse } from "../../orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";
import { ensureStripe } from "../utils";
import { resetOrdersCache } from "@shared/sdk/ordersClient";

type RefundBody = {
  order_id?: string;
  amount_cents?: number | null;
  reason?: string | null; // free-form; mapped to Stripe reasons if applicable
};

const ORDER_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200) {
  if (status < 400) {
    resetOrdersCache();
  }
  return jsonResponse(body, status);
}

function normalizeReason(input: string | null | undefined): "duplicate" | "fraudulent" | "requested_by_customer" | undefined {
  const v = (input || "").toLowerCase().trim();
  if (!v) return undefined;
  if (v.includes("duplic")) return "duplicate";
  if (v.includes("fraud")) return "fraudulent";
  return "requested_by_customer";
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  let body: RefundBody;
  try {
    body = (await request.json()) as RefundBody;
  } catch {
    return json({ ok: false, code: "bad_request", message: "invalid_json" }, 400);
  }

  const orderId = (body.order_id || "").trim();
  if (!ORDER_ID_RE.test(orderId)) {
    return json({ ok: false, code: "order_id_invalid" }, 400);
  }

  const supabase = getAdminClient();
  const { data: orderRow, error: orderError } = await supabase
    .from("orders")
    .select("id, status, amount_cents, currency, payment_intent_id, paid_at")
    .eq("id", orderId)
    .maybeSingle();
  if (orderError) {
    return json({ ok: false, code: "db", message: orderError.message }, 500);
  }
  if (!orderRow) {
    return json({ ok: false, code: "not_found" }, 404);
  }

  const status = String(orderRow.status || "").toLowerCase();
  if (!(["paid", "fulfilled"].includes(status))) {
    return json({ ok: false, code: "invalid_state", message: `status=${status}` }, 409);
  }

  const amountCents = typeof body.amount_cents === "number" && body.amount_cents > 0 ? Math.floor(body.amount_cents) : null;
  const reason = normalizeReason(body.reason);

  let stripe;
  try {
    stripe = ensureStripe();
  } catch (error: any) {
    return json({ ok: false, code: "config_error", message: error?.message ?? "stripe_not_configured" }, 500);
  }

  // Resolve PaymentIntent
  let intentId = (orderRow.payment_intent_id || "").trim();
  if (!intentId) {
    const { data: paymentRow } = await supabase
      .from("payments")
      .select("provider, provider_ref")
      .eq("order_id", orderId)
      .eq("provider", "stripe")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ provider_ref: string | null }>();
    intentId = paymentRow?.provider_ref?.trim() || "";
  }

  if (!intentId) {
    return json({ ok: false, code: "missing_intent" }, 409);
  }

  // Create refund in Stripe (full or partial)
  const refund = await stripe.refunds.create({
    payment_intent: intentId,
    amount: amountCents || undefined,
    reason,
  });

  // Persist and transition state atomically via RPC
  const rpc = await supabase.rpc("refund_order_apply", {
    p_order_id: orderId,
    p_refund_id: refund.id,
    p_amount_cents: refund.amount ?? amountCents ?? 0,
    p_currency: ((refund.currency || orderRow.currency || "usd") as string).toUpperCase(),
    p_reason: body.reason || null,
  });
  if (rpc.error) {
    return json({ ok: false, code: "db", message: rpc.error.message }, 500);
  }

  return json({ ok: true, order_id: orderId, refund_id: refund.id });
}

export async function GET() {
  return json({ ok: false, code: "method_not_allowed" }, 405);
}
