import type { AssignmentScope, DiscountType, Prisma } from "@generated/prisma/client";

export type DiscountWithRelations = Prisma.DiscountGetPayload<{
  include: {
    assignments: true;
    exclusions: true;
    coupons: true;
  };
}>;

export interface LoadedProduct {
  id: string;
  sku: string;
  name: string;
  currency: string;
  priceCents: number;
  brandId?: string | null;
  vendorId?: string | null;
  categoryId?: string | null;
}

export interface CartItemInput {
  productId: string;
  sku: string;
  quantity: number;
  unitPriceCents: number;
  currency: string;
  brandId?: string | null;
  vendorId?: string | null;
  categoryId?: string | null;
}

export interface DiscountEvaluationContext {
  now: Date;
  channel: string;
  currency: string;
  customerId?: string | null;
  customerGroups?: string[];
  couponCodes?: string[];
  items: CartItemInput[];
  minimumSubtotalCents?: number;
}

export interface DiscountEvaluationOptions {
  couponUsage?: CouponUsageSnapshot[];
  discountUsage?: DiscountUsageSnapshot[];
}

export interface ItemDiscountBreakdown {
  productId: string;
  sku: string;
  quantity: number;
  unitPriceCents: number;
  totalBeforeCents: number;
  discountCents: number;
  totalAfterCents: number;
}

export interface AppliedDiscount {
  id: string;
  name: string;
  type: DiscountType;
  priority: number;
  stackable: boolean;
  amountCents: number;
  couponsApplied: string[];
  items: Array<{
    productId: string;
    sku: string;
    amountCents: number;
    quantity: number;
  }>;
  meta?: Record<string, unknown>;
}

export interface DiscountEvaluationResult {
  subtotalBeforeCents: number;
  subtotalAfterCents: number;
  totalDiscountCents: number;
  applied: AppliedDiscount[];
  breakdown: ItemDiscountBreakdown[];
}

export interface DiscountFilterSet {
  productIds: string[];
  brandIds: string[];
  vendorIds: string[];
  categoryIds: string[];
  customerGroupIds: string[];
}

export interface RepositoryFilters {
  channel: string;
  now: Date;
  couponCodes?: string[];
  includeInactive?: boolean;
  discountIds?: string[];
  scopes?: {
    scope: AssignmentScope;
    refIds: string[];
  }[];
}

export interface CouponUsageSnapshot {
  couponId: string;
  discountId: string;
  totalRedemptions: number;
  userRedemptions: number;
}

export interface DiscountUsageSnapshot {
  discountId: string;
  totalRedemptions: number;
  userRedemptions: number;
}
