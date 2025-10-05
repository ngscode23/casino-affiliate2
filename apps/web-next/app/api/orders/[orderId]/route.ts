import { json, toNumber } from "../utils";
import { requireAuth } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

export async function GET(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const auth = await requireAuth(request);
  if ("response" in auth) return auth.response;
  const { user } = auth;
  const params = await context.params;
  const orderId = params.orderId;

  if (!orderId) {
    return json({ ok: false, code: "bad_request", message: "orderId_required" }, 400);
  }

  const supabase = getAdminClient();

  try {
    const { data: order, error } = await supabase
      .from("order_v2")
      .select(
        "id, user_id, created_at, amount_subtotal, amount_discounts, amount_tax, amount_total, currency, status, payment_status",
      )
      .eq("id", orderId)
      .single();

    if (!error && order) {
      if ((order as any).user_id !== user.id) {
        return json({ ok: false, code: "forbidden" }, 403);
      }

      const { data: items, error: itemsError } = await supabase
        .from("order_items")
        .select("id, product_id, title, qty, unit_price, total")
        .eq("order_id", orderId);

      if (itemsError) {
        return json({ ok: false, code: "db", message: itemsError.message }, 500);
      }

      const { data: payment } = await supabase
        .from("payments")
        .select("id, status, amount, currency, provider, provider_ref, created_at")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return json({
        ok: true,
        order: {
          id: String(order.id),
          created_at: String(order.created_at),
          amount_subtotal: toNumber((order as any).amount_subtotal),
          amount_discounts: toNumber((order as any).amount_discounts),
          amount_tax: toNumber((order as any).amount_tax),
          amount_total: toNumber((order as any).amount_total),
          currency: (order as any).currency || "EUR",
          status: String((order as any).status || ""),
          payment_status: (order as any).payment_status ? String((order as any).payment_status) : null,
        },
        items: Array.isArray(items) ? items : [],
        payment: payment
          ? {
              id: String(payment.id),
              status: String(payment.status || ""),
              amount: toNumber(payment.amount),
              currency: payment.currency || null,
              provider: payment.provider ?? null,
              provider_ref: payment.provider_ref ?? null,
              created_at: String(payment.created_at || new Date().toISOString()),
            }
          : null,
      });
    }
  } catch (error) {
    // proceed to fallback
  }

  try {
    const { data: ord, error: ordError } = await supabase
      .from("orders")
      .select("id, user_id, created_at, status, subtotal, discount_total, shipping_total, grand_total, currency")
      .eq("id", orderId)
      .single();

    if (ordError || !ord) {
      return json({ ok: false, code: "not_found" }, 404);
    }

    if ((ord as any).user_id !== user.id) {
      return json({ ok: false, code: "forbidden" }, 403);
    }

    const amount_subtotal = toNumber((ord as any).subtotal);
    const amount_discounts = toNumber((ord as any).discount_total);
    const amount_tax = toNumber((ord as any).shipping_total);
    const grand = toNumber((ord as any).grand_total);
    const amount_total = grand || amount_subtotal - amount_discounts + amount_tax;

    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("id, product_id, title, qty, unit_price, total")
      .eq("order_id", orderId);

    const { data: payment } = await supabase
      .from("payments")
      .select("id, status, amount, currency, provider, provider_ref, created_at")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return json({
      ok: true,
      order: {
        id: String((ord as any).id),
        created_at: String((ord as any).created_at),
        amount_subtotal,
        amount_discounts,
        amount_tax,
        amount_total,
        currency: (ord as any).currency || "EUR",
        status: String((ord as any).status || ""),
        payment_status: null,
      },
      items: itemsError ? [] : Array.isArray(items) ? items : [],
      payment: payment
        ? {
            id: String(payment.id),
            status: String(payment.status || ""),
            amount: toNumber(payment.amount),
            currency: payment.currency || null,
            provider: payment.provider ?? null,
            provider_ref: payment.provider_ref ?? null,
            created_at: String(payment.created_at || new Date().toISOString()),
          }
        : null,
    });
  } catch (error) {
    return json({ ok: false, code: "internal", message: String((error as Error)?.message ?? error) }, 500);
  }
}