export type PromotionStatus = "draft" | "scheduled" | "active" | "expired" | "archived";

export type PromotionActionKind =
  | "percentage_discount"
  | "fixed_amount_discount"
  | "buy_x_get_y"
  | "free_shipping"
  | "gift_product";

export type PromotionConditionKind =
  | "product"
  | "category"
  | "collection"
  | "order_total"
  | "order_quantity"
  | "user_segment"
  | "utm"
  | "schedule"
  | "custom";

export type PercentageDiscountConfig = {
  percent: number;
  maxAmount?: number;
  productIds?: string[];
  minSubtotal?: number;
};

export type FixedAmountDiscountConfig = {
  amount: number;
  currency?: string;
  minSubtotal?: number;
  productIds?: string[];
};

export type BuyXGetYConfig = {
  buyProductId: string;
  buyQty: number;
  getProductId?: string;
  getQty: number;
  discountPercent?: number;
};

export type FreeShippingConfig = {
  maxShipping?: number;
  minSubtotal?: number;
};

export type GiftProductConfig = {
  productId: string;
  qty: number;
  title?: string;
};

export type PromotionActionConfig =
  | PercentageDiscountConfig
  | FixedAmountDiscountConfig
  | BuyXGetYConfig
  | FreeShippingConfig
  | GiftProductConfig
  | Record<string, unknown>;

export interface PromotionAction {
  id: string;
  promotionId: string;
  kind: PromotionActionKind;
  config: PromotionActionConfig;
}

export type PromotionConditionConfig = Record<string, unknown>;

export interface PromotionCondition {
  id: string;
  promotionId: string;
  kind: PromotionConditionKind;
  config: PromotionConditionConfig;
}

export interface PromotionCoupon {
  id: string;
  promotionId: string;
  code: string;
  startsAt: string | null;
  endsAt: string | null;
  usageLimitTotal: number | null;
  usageLimitPerUser: number | null;
  metadata: Record<string, unknown>;
}

export interface Promotion {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: PromotionStatus;
  priority: number;
  combinable: boolean;
  stackGroup: string | null;
  startsAt: string | null;
  endsAt: string | null;
  metadata: Record<string, unknown>;
  actions: PromotionAction[];
  conditions: PromotionCondition[];
  coupons: PromotionCoupon[];
}

export interface OrderItemInput {
  productId: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
  metadata?: Record<string, unknown>;
}

export interface PromotionEvaluationContext {
  now: Date;
  currency: string;
  items: OrderItemInput[];
  subtotal: number;
  shippingTotal: number;
  couponCodes: string[];
  userId?: string | null;
  userSegments?: string[];
  utm?: Record<string, string | undefined>;
  additionalMetadata?: Record<string, unknown>;
}

export interface AppliedPromotionAction {
  id: string;
  kind: PromotionActionKind;
  amount: number;
  meta?: Record<string, unknown>;
}

export interface AppliedPromotion {
  promotionId: string;
  slug: string;
  actions: AppliedPromotionAction[];
  discountTotal: number;
  shippingDiscount: number;
  giftItems: GiftProductConfig[];
  coupons: string[];
}

export interface PromotionEvaluationResult {
  subtotalDiscount: number;
  shippingDiscount: number;
  giftItems: GiftProductConfig[];
  appliedPromotions: AppliedPromotion[];
}

