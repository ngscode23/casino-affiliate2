import { json } from "../utils";
import { requireAuth } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";
import { getOrderDetails } from "@shared/sdk/ordersClient";

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
    const detail = await getOrderDetails(supabase, orderId, { userId: user.id });
    if (!detail) {
      return json({ ok: false, code: "not_found" }, 404);
    }

    const payment = detail.payments.length ? detail.payments[0] : null;

    return json({
      ok: true,
      order: {
        id: detail.summary.id,
        created_at: detail.summary.createdAt,
        amount_subtotal: detail.summary.subtotalAmount,
        amount_discounts: detail.summary.discountAmount,
        amount_tax: detail.summary.taxAmount,
        amount_total: detail.summary.totalAmount,
        currency: detail.summary.currency,
        status: detail.summary.status,
        payment_status: detail.summary.paymentStatus,
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
            provider_ref: payment.providerReference,
            created_at: payment.createdAt,
          }
        : null,
      payments: detail.payments,
      refunds: detail.refunds,
      history: detail.history,
    });
  } catch (error) {
    return json({ ok: false, code: "internal", message: String((error as Error)?.message ?? error) }, 500);
  }
}
