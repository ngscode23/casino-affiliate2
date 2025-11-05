import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@shared/lib/database.types";
import { loadPromotions } from "./loader";
import { evaluatePromotions } from "./engine";
import type {
  PromotionEvaluationContext,
  PromotionEvaluationResult,
  Promotion,
  AppliedPromotion,
} from "./types";

type PublicClient = SupabaseClient<Database>;

export interface ApplyPromotionsInput {
  supabase: PublicClient;
  orderId: string;
  couponCodes?: string[];
  contextOverrides?: Partial<Omit<PromotionEvaluationContext, "couponCodes" | "items" | "subtotal" | "shippingTotal" | "currency" | "now">>;
  now?: Date;
}

export interface ApplyPromotionsResult extends PromotionEvaluationResult {
  orderId: string;
  currency: string;
  subtotal: number;
  shippingTotal: number;
  grandTotal: number;
  couponCodes: string[];
  updatedRows: number;
}

export async function applyPromotionsToOrder(input: ApplyPromotionsInput): Promise<ApplyPromotionsResult> {
  const { supabase, orderId, now = new Date() } = input;

  const orderResponse = await supabase
    .from("orders" as const)
    .select(
      "id, user_id, subtotal, shipping_total, discount_total, grand_total, currency, coupon_codes, applied_promotions, checkout_metadata",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (orderResponse.error) {
    throw new Error(`Failed to load order for promotions: ${orderResponse.error.message}`);
  }
  const orderRow = orderResponse.data;
  if (!orderRow) {
    throw new Error(`Order ${orderId} not found`);
  }

  const itemsResponse = await supabase
    .from("order_items" as const)
    .select("product_id, qty, unit_price, total, meta")
    .eq("order_id", orderId);

  if (itemsResponse.error) {
    throw new Error(`Failed to load order items: ${itemsResponse.error.message}`);
  }

  const subtotal = Number(orderRow.subtotal ?? 0);
  const shippingTotal = Number(orderRow.shipping_total ?? 0);
  const currency = String(orderRow.currency ?? "USD");
  const existingCodes = Array.isArray(orderRow.coupon_codes) ? orderRow.coupon_codes : [];
  const suppliedCodes = Array.isArray(input.couponCodes) ? input.couponCodes : [];
  const couponCodes = normalizeCouponCodes([...existingCodes, ...suppliedCodes]);

  const items = (itemsResponse.data ?? []).map((row) => {
    const unitPrice = Number(row.unit_price ?? 0);
    const qty = Number(row.qty ?? 0);
    const subtotalRow =
      row.total != null ? Number(row.total) : roundCurrency(unitPrice * qty);
    const meta =
      row.meta && typeof row.meta === "object" ? (row.meta as Record<string, unknown>) : undefined;
    return {
      productId: row.product_id ? String(row.product_id) : "",
      qty,
      unitPrice,
      subtotal: subtotalRow,
      metadata: meta,
    };
  });

  const evaluationContext: PromotionEvaluationContext = {
    now,
    currency,
    items,
    subtotal,
    shippingTotal,
    couponCodes,
    userId: orderRow.user_id ?? undefined,
    userSegments: input.contextOverrides?.userSegments,
    utm:
      (orderRow.checkout_metadata as any)?.utm ??
      (input.contextOverrides?.utm ?? undefined),
    additionalMetadata: input.contextOverrides?.additionalMetadata,
  };

  const promotions = await loadPromotions(supabase, {
    couponCodes,
    now,
  });
  const evaluation = evaluatePromotions(evaluationContext, promotions);

  const newShippingTotal = Math.max(
    0,
    roundCurrency(shippingTotal - evaluation.shippingDiscount),
  );
  const newDiscountTotal = roundCurrency(evaluation.subtotalDiscount);
  const newGrandTotal = Math.max(
    0,
    roundCurrency(subtotal - evaluation.subtotalDiscount + newShippingTotal),
  );

  const orderUpdatePayload: Record<string, unknown> = {
    discount_total: newDiscountTotal,
    shipping_total: newShippingTotal,
    grand_total: newGrandTotal,
    applied_promotions: evaluation.appliedPromotions,
    coupon_codes: couponCodes,
  };

  const updateResponse = await supabase
    .from("orders" as const)
    .update(orderUpdatePayload)
    .eq("id", orderId);

  if (updateResponse.error) {
    throw new Error(`Failed to update order with promotions: ${updateResponse.error.message}`);
  }

  await persistPromotionUsages({
    supabase,
    orderId,
    promotions,
    applied: evaluation.appliedPromotions,
    currency,
    userId: orderRow.user_id ?? undefined,
    subtotal,
    shippingTotal,
    couponCodes,
  });

  return {
    ...evaluation,
    orderId,
    currency,
    subtotal,
    shippingTotal: newShippingTotal,
    grandTotal: newGrandTotal,
    couponCodes,
    updatedRows: updateResponse.count ?? 0,
  };
}

async function persistPromotionUsages(params: {
  supabase: PublicClient;
  orderId: string;
  promotions: Promotion[];
  applied: AppliedPromotion[];
  currency: string;
  userId?: string;
  subtotal: number;
  shippingTotal: number;
  couponCodes: string[];
}) {
  const { supabase, orderId, promotions, applied, currency, userId, subtotal, shippingTotal, couponCodes } = params;

  if (applied.length === 0) {
    await supabase.from("promotion_usages" as const).delete().eq("order_id", orderId);
    return;
  }

  const promotionMap = new Map<string, Promotion>();
  promotions.forEach((promotion) => {
    promotionMap.set(promotion.id, promotion);
  });

  await supabase.from("promotion_usages" as const).delete().eq("order_id", orderId);

  const rows: Database["public"]["Tables"]["promotion_usages"]["Insert"][] = applied.map((entry) => {
    const promotion = promotionMap.get(entry.promotionId);
    const coupon = promotion?.coupons.find((c) => entry.coupons.includes(c.code));
    const discountAmount = roundCurrency(entry.discountTotal + entry.shippingDiscount);
    return {
      promotion_id: entry.promotionId,
      coupon_id: coupon?.id ?? null,
      order_id: orderId,
      user_id: userId ?? null,
      discount_amount: discountAmount,
      currency,
      context: toDatabaseJson({
        subtotal,
        shipping_total: shippingTotal,
        coupon_codes: couponCodes,
      }),
      applied_actions: toDatabaseJson(
        entry.actions.map((action) => ({
          id: action.id,
          kind: action.kind,
          amount: action.amount,
          ...(action.meta ? { meta: toDatabaseJson(action.meta) } : {}),
        })),
      ),
    };
  });

  const insertResponse = await supabase.from("promotion_usages" as const).insert(rows);
  if (insertResponse.error) {
    throw new Error(`Failed to insert promotion usage rows: ${insertResponse.error.message}`);
  }
}

function normalizeCouponCodes(codes: string[]): string[] {
  const normalized = new Set<string>();
  codes.forEach((code) => {
    if (typeof code !== "string") return;
    const trimmed = code.trim();
    if (!trimmed) return;
    normalized.add(trimmed);
  });
  return Array.from(normalized);
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toDatabaseJson(value: unknown): Json {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => toDatabaseJson(item));
  }

  if (typeof value === "object") {
    const result: { [key: string]: Json | undefined } = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (val === undefined) continue;
      result[key] = toDatabaseJson(val);
    }
    return result;
  }

  return null;
}
