import { requireAuth } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";
import { applyPromotionsToOrder } from "@/lib/promotions/apply";
import { json } from "../../utils";

type RequestPayload = {
  coupons?: string[];
  context?: Record<string, unknown>;
};

function parsePayload(raw: unknown): RequestPayload {
  if (!raw || typeof raw !== "object") return {};
  const source = raw as Record<string, unknown>;
  const couponsRaw = source.coupons;
  const coupons: string[] | undefined = Array.isArray(couponsRaw)
    ? couponsRaw.filter((entry): entry is string => typeof entry === "string")
    : undefined;
  const context = typeof source.context === "object" && source.context ? (source.context as Record<string, unknown>) : undefined;
  return {
    coupons,
    context,
  };
}

export async function POST(
  request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  const auth = await requireAuth(request);
  if ("response" in auth) return auth.response;
  const { user } = auth;

  const { orderId } = await context.params;
  if (!orderId) {
    return json({ ok: false, code: "bad_request", message: "orderId_required" }, 400);
  }

  const payload = parsePayload(await request.json().catch(() => null));
  const supabase = getAdminClient();

  const orderOwner = await supabase
    .from("orders" as const)
    .select("id, user_id")
    .eq("id", orderId)
    .maybeSingle();

  if (orderOwner.error) {
    return json({ ok: false, code: "db", message: orderOwner.error.message }, 500);
  }
  if (!orderOwner.data) {
    return json({ ok: false, code: "not_found", message: "order_not_found" }, 404);
  }
  if (orderOwner.data.user_id && orderOwner.data.user_id !== user.id) {
    return json({ ok: false, code: "forbidden" }, 403);
  }

  try {
    const result = await applyPromotionsToOrder({
      supabase,
      orderId,
      couponCodes: payload.coupons,
      contextOverrides: {
        userSegments: Array.isArray(payload.context?.segments)
          ? (payload.context?.segments as string[])
          : undefined,
        utm: (payload.context?.utm as Record<string, string>) ?? undefined,
        additionalMetadata: payload.context?.meta as Record<string, unknown> | undefined,
      },
    });

    return json({
      ok: true,
      order: {
        id: result.orderId,
        subtotal: result.subtotal,
        discount_total: result.subtotalDiscount,
        shipping_total: result.shippingTotal,
        grand_total: result.grandTotal,
        coupons: result.couponCodes,
        currency: result.currency,
      },
      promotions: result.appliedPromotions,
      gifts: result.giftItems,
    });
  } catch (error) {
    console.error("[orders.apply-promotions]", error);
    return json(
      {
        ok: false,
        code: "internal",
        message: error instanceof Error ? error.message : "failed_to_apply_promotions",
      },
      500,
    );
  }
}
