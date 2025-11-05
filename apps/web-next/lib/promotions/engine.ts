import type {
  AppliedPromotion,
  AppliedPromotionAction,
  BuyXGetYConfig,
  FixedAmountDiscountConfig,
  FreeShippingConfig,
  GiftProductConfig,
  PercentageDiscountConfig,
  Promotion,
  PromotionCondition,
  PromotionEvaluationContext,
  PromotionEvaluationResult,
  PromotionConditionConfig,
  PromotionAction,
  PromotionActionConfig,
  PromotionConditionKind,
  PromotionActionKind,
} from "./types";

const ORDER_TOTAL_CONDITION_KEYS = new Set(["min", "max", "currency", "gte", "lte"]);

export function evaluatePromotions(
  context: PromotionEvaluationContext,
  promotions: Promotion[],
): PromotionEvaluationResult {
  const sortedPromotions = promotions.slice().sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.slug.localeCompare(b.slug);
  });

  const couponSet = new Set(context.couponCodes.map((code) => code.toLowerCase()));
  let subtotalDiscount = 0;
  let shippingDiscount = 0;
  const giftItems: GiftProductConfig[] = [];
  const applied: AppliedPromotion[] = [];

  let nonStackableHit = false;
  const blockedGroups = new Set<string>();
  const now = context.now;

  for (const promotion of sortedPromotions) {
    if (!isPromotionActive(promotion, now)) continue;
    if (!promotion.combinable) {
      if (nonStackableHit && !promotion.stackGroup) {
        continue;
      }
      if (promotion.stackGroup && blockedGroups.has(promotion.stackGroup)) {
        continue;
      }
    } else if (promotion.stackGroup && blockedGroups.has(promotion.stackGroup)) {
      continue;
    }

    if (promotion.coupons.length > 0) {
      const matchesCoupon = promotion.coupons.some((coupon) => couponSet.has(coupon.code.toLowerCase()));
      if (!matchesCoupon) continue;
    }

    if (!satisfiesConditions(promotion.conditions, context)) {
      continue;
    }

    const availableSubtotal = () => Math.max(0, roundCurrency(context.subtotal - subtotalDiscount));
    const availableShipping = () => Math.max(0, roundCurrency(context.shippingTotal - shippingDiscount));
    const appliedActions: AppliedPromotionAction[] = [];
    let promoSubtotalDiscount = 0;
    let promoShippingDiscount = 0;
    const promoGifts: GiftProductConfig[] = [];

    for (const action of promotion.actions) {
      const actionResult = applyAction(action, context, {
        availableSubtotal: availableSubtotal(),
        availableShipping: availableShipping(),
      });

      if (!actionResult) continue;

      if (actionResult.amount > 0) {
        if (isShippingAction(action.kind)) {
          const delta = Math.min(actionResult.amount, availableShipping());
          if (delta > 0) {
            shippingDiscount = roundCurrency(shippingDiscount + delta);
            promoShippingDiscount = roundCurrency(promoShippingDiscount + delta);
            appliedActions.push({
              id: action.id,
              kind: action.kind,
              amount: roundCurrency(delta),
              meta: actionResult.meta,
            });
          }
        } else {
          const delta = Math.min(actionResult.amount, availableSubtotal());
          if (delta > 0) {
            subtotalDiscount = roundCurrency(subtotalDiscount + delta);
            promoSubtotalDiscount = roundCurrency(promoSubtotalDiscount + delta);
            appliedActions.push({
              id: action.id,
              kind: action.kind,
              amount: roundCurrency(delta),
              meta: actionResult.meta,
            });
          }
        }
      } else if (action.kind === "gift_product" && actionResult.meta?.gift) {
        const gift = actionResult.meta.gift as GiftProductConfig;
        promoGifts.push(gift);
        giftItems.push(gift);
        appliedActions.push({
          id: action.id,
          kind: action.kind,
          amount: 0,
          meta: actionResult.meta,
        });
      }
    }

    if (appliedActions.length === 0 && promoGifts.length === 0) continue;

    applied.push({
      promotionId: promotion.id,
      slug: promotion.slug,
      actions: appliedActions,
      discountTotal: roundCurrency(promoSubtotalDiscount),
      shippingDiscount: roundCurrency(promoShippingDiscount),
      giftItems: promoGifts,
      coupons: promotion.coupons
        .map((coupon) => coupon.code)
        .filter((code) => couponSet.has(code.toLowerCase())),
    });

    if (!promotion.combinable) {
      nonStackableHit = true;
      if (promotion.stackGroup) blockedGroups.add(promotion.stackGroup);
    } else if (promotion.stackGroup) {
      blockedGroups.add(promotion.stackGroup);
    }
  }

  return {
    subtotalDiscount: roundCurrency(subtotalDiscount),
    shippingDiscount: roundCurrency(shippingDiscount),
    giftItems,
    appliedPromotions: applied,
  };
}

function isPromotionActive(promotion: Promotion, now: Date): boolean {
  if (promotion.status === "archived") return false;
  if (promotion.status === "expired") return false;
  if (promotion.status === "draft") return false;
  if (promotion.startsAt) {
    const start = new Date(promotion.startsAt);
    if (start > now) return false;
  }
  if (promotion.endsAt) {
    const end = new Date(promotion.endsAt);
    if (end < now) return false;
  }
  return true;
}

function satisfiesConditions(conditions: PromotionCondition[], context: PromotionEvaluationContext): boolean {
  return conditions.every((condition) => evaluateCondition(condition, context));
}

function evaluateCondition(condition: PromotionCondition, context: PromotionEvaluationContext): boolean {
  const config = (condition.config ?? {}) as PromotionConditionConfig;
  switch (condition.kind as PromotionConditionKind) {
    case "order_total":
      return evaluateOrderTotalCondition(config, context);
    case "order_quantity":
      return evaluateOrderQuantityCondition(config, context);
    case "product":
      return evaluateProductCondition(config, context);
    case "user_segment":
      return evaluateUserSegmentCondition(config, context);
    case "utm":
      return evaluateUtmCondition(config, context);
    case "schedule":
      return evaluateScheduleCondition(config, context.now);
    case "category":
    case "collection":
      return evaluateMetadataCondition(condition.kind, config, context);
    default:
      return true;
  }
}

function evaluateOrderTotalCondition(config: PromotionConditionConfig, context: PromotionEvaluationContext): boolean {
  if (Object.keys(config).length === 0) return true;
  const normalized: Record<string, number> = {};
  for (const [key, value] of Object.entries(config)) {
    if (!ORDER_TOTAL_CONDITION_KEYS.has(key)) continue;
    const numeric = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(numeric)) continue;
    normalized[key] = numeric;
  }

  if (normalized.min != null && context.subtotal < normalized.min) return false;
  if (normalized.gte != null && context.subtotal < normalized.gte) return false;
  if (normalized.max != null && context.subtotal > normalized.max) return false;
  if (normalized.lte != null && context.subtotal > normalized.lte) return false;
  return true;
}

function evaluateOrderQuantityCondition(config: PromotionConditionConfig, context: PromotionEvaluationContext): boolean {
  const min = getNumber(config, "minQty") ?? getNumber(config, "min") ?? 0;
  const productId = getString(config, "productId") ?? getString(config, "product_id");
  const totalQty = productId
    ? context.items.filter((item) => item.productId === productId).reduce((acc, item) => acc + item.qty, 0)
    : context.items.reduce((acc, item) => acc + item.qty, 0);
  return totalQty >= min;
}

function evaluateProductCondition(config: PromotionConditionConfig, context: PromotionEvaluationContext): boolean {
  const productIds = normalizeStringArray(config.productIds ?? config.product_ids ?? config.products);
  if (!productIds.length) return true;
  const mode = (getString(config, "mode") ?? "any").toLowerCase();
  if (mode === "all") {
    return productIds.every((id) => context.items.some((item) => item.productId === id));
  }
  return productIds.some((id) => context.items.some((item) => item.productId === id));
}

function evaluateUserSegmentCondition(config: PromotionConditionConfig, context: PromotionEvaluationContext): boolean {
  const segments = normalizeStringArray(config.segments ?? config.segment ?? config.segmentIds);
  if (!segments.length) return true;
  const userSegments = context.userSegments ?? [];
  return segments.some((segment) => userSegments.includes(segment));
}

function evaluateUtmCondition(config: PromotionConditionConfig, context: PromotionEvaluationContext): boolean {
  if (!context.utm) return false;
  const required: Record<string, string> = {};
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === "string") {
      required[key.toLowerCase()] = value.toLowerCase();
    }
  }
  return Object.entries(required).every(([key, value]) => {
    const ctxValue = context.utm?.[key]?.toLowerCase();
    return ctxValue === value;
  });
}

function evaluateScheduleCondition(config: PromotionConditionConfig, now: Date): boolean {
  const days = normalizeNumberArray(config.days ?? config.daysOfWeek ?? config.weekdays);
  if (days.length && !days.includes(now.getUTCDay())) {
    return false;
  }
  const startHour = getNumber(config, "startHour");
  const endHour = getNumber(config, "endHour");
  if (startHour != null && now.getUTCHours() < startHour) return false;
  if (endHour != null && now.getUTCHours() >= endHour) return false;
  return true;
}

function evaluateMetadataCondition(
  kind: PromotionConditionKind,
  config: PromotionConditionConfig,
  context: PromotionEvaluationContext,
): boolean {
  const key = kind === "category" ? "category" : "collection";
  const allowed = normalizeStringArray(config.slugs ?? config.ids ?? config[key]);
  if (!allowed.length) return true;
  return context.items.some((item) => {
    const metaValue = item.metadata?.[key];
    if (Array.isArray(metaValue)) {
      return metaValue.some((value) => allowed.includes(String(value)));
    }
    if (typeof metaValue === "string") {
      return allowed.includes(metaValue);
    }
    return false;
  });
}

function applyAction(
  action: PromotionAction,
  context: PromotionEvaluationContext,
  state: { availableSubtotal: number; availableShipping: number },
):
  | {
      amount: number;
      meta?: Record<string, unknown>;
    }
  | null {
  const config = action.config as PromotionActionConfig;
  switch (action.kind as PromotionActionKind) {
    case "percentage_discount":
      return applyPercentageDiscount(config as PercentageDiscountConfig, context, state);
    case "fixed_amount_discount":
      return applyFixedAmountDiscount(config as FixedAmountDiscountConfig, context, state);
    case "buy_x_get_y":
      return applyBuyXGetY(config as BuyXGetYConfig, context, state);
    case "free_shipping":
      return applyFreeShipping(config as FreeShippingConfig, context, state);
    case "gift_product":
      return applyGiftProduct(config as GiftProductConfig);
    default:
      return null;
  }
}

function applyPercentageDiscount(
  config: PercentageDiscountConfig,
  context: PromotionEvaluationContext,
  state: { availableSubtotal: number },
) {
  const percent = getNumber(config, "percent");
  if (!percent || percent <= 0) return null;
  const minSubtotal = getNumber(config, "minSubtotal") ?? 0;
  if (context.subtotal < minSubtotal) return null;

  const eligibleSubtotal = resolveEligibleSubtotal(config.productIds ?? [], context);
  if (eligibleSubtotal <= 0) return null;

  const amount = roundCurrency((eligibleSubtotal * percent) / 100);
  if (amount <= 0) return null;
  const maxAmount = getNumber(config, "maxAmount");
  const capped = maxAmount ? Math.min(amount, maxAmount) : amount;
  return {
    amount: Math.min(capped, state.availableSubtotal),
    meta: { percent, eligibleSubtotal },
  };
}

function applyFixedAmountDiscount(
  config: FixedAmountDiscountConfig,
  context: PromotionEvaluationContext,
  state: { availableSubtotal: number },
) {
  const amount = getNumber(config, "amount");
  if (!amount || amount <= 0) return null;
  const minSubtotal = getNumber(config, "minSubtotal") ?? 0;
  if (context.subtotal < minSubtotal) return null;
  const eligibleSubtotal = resolveEligibleSubtotal(config.productIds ?? [], context);
  if (eligibleSubtotal <= 0) return null;
  const capped = Math.min(amount, state.availableSubtotal, eligibleSubtotal);
  if (capped <= 0) return null;
  return {
    amount: roundCurrency(capped),
  };
}

function applyBuyXGetY(config: BuyXGetYConfig, context: PromotionEvaluationContext, state: { availableSubtotal: number }) {
  const buyProductId = config.buyProductId;
  const getProductId = config.getProductId ?? buyProductId;
  const buyQty = Math.max(1, getNumber(config, "buyQty") ?? 0);
  const getQty = Math.max(1, getNumber(config, "getQty") ?? 0);
  if (!buyProductId || !buyQty || !getQty) return null;

  const buyItem = context.items.find((item) => item.productId === buyProductId);
  if (!buyItem) return null;
  const getItem = context.items.find((item) => item.productId === getProductId) ?? buyItem;
  if (!getItem) return null;

  const eligibleSets = Math.floor(buyItem.qty / buyQty);
  if (eligibleSets <= 0) return null;
  const discountPercent = clampNumber(getNumber(config, "discountPercent") ?? 100, 0, 100);
  const eligibleQty = eligibleSets * getQty;
  const rawDiscount = (getItem.unitPrice * eligibleQty * discountPercent) / 100;
  const amount = roundCurrency(Math.min(rawDiscount, state.availableSubtotal));
  if (amount <= 0) return null;
  return {
    amount,
    meta: {
      buyQty,
      getQty,
      discountPercent,
      productId: getProductId,
      eligibleQty,
    },
  };
}

function applyFreeShipping(
  config: FreeShippingConfig,
  context: PromotionEvaluationContext,
  state: { availableShipping: number },
) {
  const minSubtotal = getNumber(config, "minSubtotal") ?? 0;
  if (context.subtotal < minSubtotal) return null;
  const maxShipping = getNumber(config, "maxShipping") ?? context.shippingTotal;
  if (state.availableShipping <= 0) return null;
  const amount = roundCurrency(Math.min(maxShipping, state.availableShipping));
  if (amount <= 0) return null;
  return {
    amount,
    meta: { maxShipping },
  };
}

function applyGiftProduct(config: GiftProductConfig) {
  if (!config.productId) return null;
  const gift: GiftProductConfig = {
    productId: config.productId,
    qty: Math.max(1, config.qty ?? 1),
    title: config.title,
  };
  return {
    amount: 0,
    meta: { gift },
  };
}

function resolveEligibleSubtotal(productIds: string[] | undefined, context: PromotionEvaluationContext): number {
  if (!productIds || productIds.length === 0) {
    return context.subtotal;
  }
  const normalizedIds = new Set(productIds.map(String));
  return roundCurrency(
    context.items
      .filter((item) => normalizedIds.has(item.productId))
      .reduce((acc, item) => acc + item.subtotal, 0),
  );
}

function isShippingAction(kind: PromotionActionKind): boolean {
  return kind === "free_shipping";
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getNumber(source: PromotionConditionConfig | PromotionActionConfig, key: string): number | undefined {
  const value = (source as Record<string, unknown>)[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function getString(source: PromotionConditionConfig | PromotionActionConfig, key: string): string | undefined {
  const value = (source as Record<string, unknown>)[key];
  if (typeof value === "string") return value;
  return undefined;
}

function normalizeStringArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
      .map((entry) => entry.trim());
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }
  return [];
}

function normalizeNumberArray(value: unknown): number[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === "number") return entry;
        const parsed = Number(entry);
        return Number.isFinite(parsed) ? parsed : null;
      })
      .filter((entry): entry is number => entry !== null);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => Number(entry.trim()))
      .filter((entry) => Number.isFinite(entry));
  }
  return [];
}

