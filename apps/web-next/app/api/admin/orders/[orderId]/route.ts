import { NextResponse } from "next/server";

import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export async function GET(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const { orderId } = await context.params;
  if (!orderId) return json({ ok: false, error: "bad_request" }, 400);

  try {
    const supabase = getAdminClient();

    const { data: order, error: orderError } = await supabase
      .from("order_v2")
      .select(
        "id, user_id, created_at, amount_subtotal, amount_discounts, amount_tax, amount_total, currency, status, payment_status"
      )
      .eq("id", orderId)
      .maybeSingle();

    if (orderError) {
      return json({ ok: false, error: orderError.message || "db" }, 500);
    }
    if (!order) {
      return json({ ok: false, error: "not_found" }, 404);
    }

    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("id, product_id, title, qty, unit_price, total")
      .eq("order_id", orderId)
      .order("id", { ascending: true });

    if (itemsError) {
      return json({ ok: false, error: itemsError.message || "db" }, 500);
    }

    const { data: payments, error: paymentsError } = await supabase
      .from("payments")
      .select("id, status, amount, currency, provider, provider_ref, created_at")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });

    if (paymentsError) {
      return json({ ok: false, error: paymentsError.message || "db" }, 500);
    }

    const { data: statusHistory, error: historyError } = await supabase
      .from("order_status_history")
      .select("id, from_status, to_status, changed_by, reason, created_at")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (historyError) {
      return json({ ok: false, error: historyError.message || "db" }, 500);
    }

    const { data: refunds, error: refundsError } = await supabase
      .from("payment_refunds")
      .select("refund_id, amount_cents, currency, reason, created_at")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });

    if (refundsError) {
      return json({ ok: false, error: refundsError.message || "db" }, 500);
    }

    return json({
      ok: true,
      order,
      items: items ?? [],
      payments: payments ?? [],
      statusHistory: statusHistory ?? [],
      refunds: refunds ?? [],
    });
  } catch (error: unknown) {
    return json({ ok: false, error: String((error as Error)?.message ?? error) }, 500);
  }
}
