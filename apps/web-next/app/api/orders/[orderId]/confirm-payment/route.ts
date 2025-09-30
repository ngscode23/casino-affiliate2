import { json, toNumber } from "../../utils";
import { requireAuth } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

const MAX_TOTAL_ALLOWED = (() => {
  const raw = Number(process.env.ORDER_MAX_TOTAL || "9999.99");
  return Number.isFinite(raw) && raw > 0 ? raw : 9999.99;
})();

const DEFAULT_SCENARIO = String(process.env.ORDER_DEFAULT_SCENARIO || "succeeded").toLowerCase();

const ALLOWED_SCENARIOS = new Set(["authorized", "requires_action", "failed", "succeeded"]);

export async function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const auth = await requireAuth(request);
  if ("response" in auth) return auth.response;
  const { user } = auth;
  const params = await context.params;
  const orderId = params.orderId;

  if (!orderId) return json({ ok: false, code: "bad_request", message: "orderId_required" }, 400);

  const supabase = getAdminClient();

  const { data: orderRow, error: orderError } = await supabase
    .from("orders")
    .select("id, user_id, status, currency")
    .eq("id", orderId)
    .single();

  if (orderError || !orderRow) {
    return json({ ok: false, code: "not_found" }, 404);
  }

  if ((orderRow as any).user_id !== user.id) {
    return json({ ok: false, code: "forbidden" }, 403);
  }

  const status = String((orderRow as any).status || "");
  if (!["pending", "processing"].includes(status)) {
    return json({ ok: false, code: "conflict", message: "invalid_status_for_payment" }, 409);
  }

  // Determine amount and currency from view with fallbacks
  let amount = 0;
  let currency = (orderRow as any).currency ? String((orderRow as any).currency) : "EUR";

  try {
    const { data: viewRow, error: viewError } = await supabase
      .from("order_v2")
      .select("amount_total, currency")
      .eq("id", orderId)
      .single();

    if (!viewError && viewRow) {
      amount = toNumber((viewRow as any).amount_total);
      currency = (viewRow as any).currency || currency;
    } else {
      const { data: fallbackOrder } = await supabase
        .from("orders")
        .select("grand_total, subtotal, discount_total, shipping_total, currency")
        .eq("id", orderId)
        .single();

      if (fallbackOrder) {
        const grand = toNumber((fallbackOrder as any).grand_total);
        if (grand > 0) {
          amount = grand;
        } else {
          const subtotal = toNumber((fallbackOrder as any).subtotal);
          const discount = toNumber((fallbackOrder as any).discount_total);
          const shipping = toNumber((fallbackOrder as any).shipping_total);
          amount = subtotal - discount + shipping;
        }
        currency = (fallbackOrder as any).currency || currency;
      } else {
        const { data: items } = await supabase
          .from("order_items")
          .select("total")
          .eq("order_id", orderId);
        if (Array.isArray(items)) {
          amount = items.reduce((sum, row: any) => sum + toNumber(row.total), 0);
        }
      }
    }
  } catch {
    // fall back to validation below
  }

  if (!(amount > 0 && amount <= MAX_TOTAL_ALLOWED)) {
    await supabase.from("orders").update({ status: "failed" }).eq("id", orderId);
    return json({
      ok: false,
      code: "invalid_total",
      message: `Order total out of allowed range (<= ${MAX_TOTAL_ALLOWED})`,
    }, 422);
  }

  const url = new URL(request.url);
  let scenario = (url.searchParams.get("scenario") || "").toLowerCase();
  if (!scenario) scenario = DEFAULT_SCENARIO;
  if (!ALLOWED_SCENARIOS.has(scenario)) scenario = "authorized";

  const dbStatus = scenario;

  const { error: paymentError } = await supabase.from("payments").insert({
    order_id: orderId,
    provider: "mockpay",
    provider_ref: scenario,
    amount,
    currency,
    status: dbStatus,
  });

  if (paymentError) {
    return json({ ok: false, code: "db", message: paymentError.message }, 500);
  }

  if (scenario === "authorized") {
    await supabase.from("orders").update({ status: "processing" }).eq("id", orderId);
  }

  if (scenario === "succeeded") {
    await supabase.from("orders").update({ status: "succeeded", paid_at: new Date().toISOString() }).eq("id", orderId);
  }

  if (scenario === "requires_action") {
    return json({ ok: true, status: scenario, next_action: { type: "redirect_3ds", url: "https://example.test/3ds" } });
  }

  return json({ ok: true, status: scenario });
}