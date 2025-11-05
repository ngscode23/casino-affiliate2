import { json } from "../utils";
import { requireAuth } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";
import { getOrdersClient } from "@shared/sdk/ordersClient";

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
  const started = Date.now();
  let cacheHit = false;
  const ordersClient = getOrdersClient({
    supabase,
    metrics: {
      log: (event, meta) => {
        if (event === "orders.details.cache_hit") {
          cacheHit = Boolean(meta?.hit);
        }
      },
    },
  });
  const cacheInfo = ordersClient.getCacheMetadata();

  try {
    const detail = await ordersClient.getOrderDetails(orderId, user.id);
    if (!detail) {
      return json({ ok: false, code: "not_found" }, 404);
    }
    const order = detail.order;
    const payment = detail.payments[0] ?? null;

    const tookMs = Date.now() - started;

    return json({
      ok: true,
      order: {
        id: order.id,
        created_at: order.createdAt,
        amount_subtotal: order.subtotal,
        amount_discounts: order.discount,
        amount_tax: order.tax,
        amount_total: order.total,
        shipping_total: order.shipping ?? 0,
        currency: order.currency,
        status: order.status,
        payment_status: order.paymentStatus,
        coupons: order.couponCodes ?? [],
        promotions: order.appliedPromotions ?? [],
      },
      items: detail.items.map((item) => ({
        id: item.id,
        product_id: item.productId,
        title: item.title,
        qty: item.quantity,
        unit_price: item.unitPrice,
        total: item.total,
      })),
      payment: payment
        ? {
            id: payment.id,
            status: payment.status,
            amount: payment.amount,
            currency: payment.currency,
            provider: payment.provider,
            provider_ref: payment.providerRef,
            created_at: payment.createdAt,
          }
        : null,
      payments: detail.payments,
      refunds: detail.refunds,
      history: detail.history,
      meta: {
        tookMs,
        cache: {
          hit: cacheHit,
          adapter: cacheInfo.adapter,
          ttlMs: cacheInfo.ttlMs,
        },
      },
    });
  } catch (error) {
    return json({ ok: false, code: "internal", message: String((error as Error)?.message ?? error) }, 500);
  }
}
