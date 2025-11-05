import type {
  AppliedDiscount,
  CartItemInput,
  DiscountEvaluationContext,
  DiscountEvaluationOptions,
  DiscountEvaluationResult,
  DiscountWithRelations,
} from "./types";
import { compareDiscountPriority, isDiscountCurrentlyActive, normalizeCouponCodes } from "./utils";

type MutableItem = CartItemInput & {
  totalBefore: number;
  remainingCents: number;
  locked: boolean;
  discountApplied: number;
};

type DiscountAssignmentRecord = DiscountWithRelations["assignments"][number];
type DiscountExclusionRecord = DiscountWithRelations["exclusions"][number];
type DiscountCouponRecord = DiscountWithRelations["coupons"][number];

export function evaluateDiscounts(
  discounts: DiscountWithRelations[],
  context: DiscountEvaluationContext,
  options: DiscountEvaluationOptions = {}
): DiscountEvaluationResult {
  const couponCodes = normalizeCouponCodes(context.couponCodes);
  const subtotalBefore = context.items.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0
  );

  const items = context.items.map<MutableItem>((item) => ({
    ...item,
    totalBefore: item.unitPriceCents * item.quantity,
    remainingCents: item.unitPriceCents * item.quantity,
    locked: false,
    discountApplied: 0,
  }));

  const sorted = discounts
    .filter((discount) => filterByChannel(discount, context.channel))
    .filter((discount) => isDiscountCurrentlyActive(discount, context.now))
    .filter((discount) => passesCustomerGroup(discount, context.customerGroups))
    .sort(compareDiscountPriority);

  const applied: AppliedDiscount[] = [];

  for (const discount of sorted) {
    const result = applySingleDiscount({
      discount,
      items,
      couponCodes,
      context,
      options,
    });

    if (!result) continue;
    applied.push(result);
  }

  const subtotalAfter = Math.max(
    0,
    Math.round(subtotalBefore - applied.reduce((sum, d) => sum + d.amountCents, 0))
  );

  return {
    subtotalBeforeCents: subtotalBefore,
    subtotalAfterCents: subtotalAfter,
    totalDiscountCents: subtotalBefore - subtotalAfter,
    applied,
    breakdown: items.map((item) => ({
      productId: item.productId,
      sku: item.sku,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      totalBeforeCents: item.totalBefore,
      discountCents: item.discountApplied,
      totalAfterCents: Math.max(0, item.totalBefore - item.discountApplied),
    })),
  };
}

function applySingleDiscount(params: {
  discount: DiscountWithRelations;
  items: MutableItem[];
  couponCodes: string[];
  context: DiscountEvaluationContext;
  options: DiscountEvaluationOptions;
}): AppliedDiscount | null {
  const { discount, items, couponCodes, context, options } = params;

  const usageEntry = options.discountUsage?.find(
    (entry) => entry.discountId === discount.id
  );
  if (
    discount.usageLimitTotal != null &&
    (usageEntry?.totalRedemptions ?? 0) >= discount.usageLimitTotal
  ) {
    return null;
  }
  if (
    discount.usageLimitPerUser != null &&
    context.customerId &&
    (usageEntry?.userRedemptions ?? 0) >= discount.usageLimitPerUser
  ) {
    return null;
  }

  const eligibleIndexes = findEligibleItemIndexes(discount, items);
  if (!eligibleIndexes.length) return null;

  const subtotalRemaining = eligibleIndexes.reduce(
    (sum, index) => sum + items[index].remainingCents,
    0
  );
  const qtyRemaining = eligibleIndexes.reduce(
    (sum, index) => sum + items[index].quantity,
    0
  );

  if (discount.minSubtotalCts != null && subtotalRemaining < discount.minSubtotalCts) {
    return null;
  }
  if (discount.minQty != null && qtyRemaining < discount.minQty) {
    return null;
  }

  const couponResult = resolveCoupon(discount, couponCodes, context, options);
  if (couponResult?.blocked) {
    return null;
  }

  const calculators: Record<
    DiscountWithRelations["type"],
    (indices: number[]) => DiscountComputation | null
  > = {
    percent_off: () => computePercentOff(discount, items, eligibleIndexes),
    amount_off: () => computeAmountOff(discount, items, eligibleIndexes),
    coupon: () =>
      computeCouponDiscount(discount, items, eligibleIndexes, couponResult?.percentOff),
    bogo: () => computeBogo(discount, items, eligibleIndexes),
    tiered: () => computeTiered(discount, items, eligibleIndexes),
  };

  const calculator = calculators[discount.type];
  const computation = calculator?.(eligibleIndexes);

  if (!computation || computation.amountCents <= 0) {
    return null;
  }

  const allocations = allocateAmount(computation.amountCents, eligibleIndexes, items);
  if (!allocations.length) return null;

  const couponsApplied = couponResult?.codes ?? [];

  for (const allocation of allocations) {
    const item = items[allocation.index];
    item.remainingCents = Math.max(0, item.remainingCents - allocation.amountCents);
    item.discountApplied += allocation.amountCents;
    if (!discount.stackable) {
      item.locked = true;
    }
  }

  if (options.discountUsage) {
    const existing = options.discountUsage.find((entry) => entry.discountId === discount.id);
    if (existing) {
      existing.totalRedemptions += 1;
      if (context.customerId) {
        existing.userRedemptions += 1;
      }
    } else {
      options.discountUsage.push({
        discountId: discount.id,
        totalRedemptions: 1,
        userRedemptions: context.customerId ? 1 : 0,
      });
    }
  }

  return {
    id: discount.id,
    name: discount.name,
    type: discount.type,
    priority: discount.priority,
    stackable: discount.stackable,
    amountCents: allocations.reduce((sum, entry) => sum + entry.amountCents, 0),
    couponsApplied,
    items: allocations.map((allocation) => {
      const item = items[allocation.index];
      return {
        productId: item.productId,
        sku: item.sku,
        amountCents: allocation.amountCents,
        quantity: item.quantity,
      };
    }),
    meta: computation.meta,
  };
}

type DiscountComputation = {
  amountCents: number;
  meta?: Record<string, unknown>;
};

function filterByChannel(discount: DiscountWithRelations, channel: string): boolean {
  if (discount.channel === "all") return true;
  return discount.channel === channel;
}

function passesCustomerGroup(discount: DiscountWithRelations, customerGroups?: string[] | null): boolean {
  const assignments: DiscountAssignmentRecord[] = discount.assignments;
  const groupAssignments = assignments.filter(
    (assignment: DiscountAssignmentRecord) => assignment.scope === "CUSTOMER_GROUP"
  );
  if (!groupAssignments.length) return true;
  const groups = new Set((customerGroups ?? []).map((value) => value.toString()));
  if (!groups.size) return false;
  return groupAssignments.some((assignment) => groups.has(assignment.refId));
}

function findEligibleItemIndexes(discount: DiscountWithRelations, items: MutableItem[]): number[] {
  const assignments: DiscountAssignmentRecord[] = discount.assignments;
  const exclusions: DiscountExclusionRecord[] = discount.exclusions;

  const productAssignments = new Set<string>();
  const brandAssignments = new Set<string>();
  const vendorAssignments = new Set<string>();
  const categoryAssignments = new Set<string>();

  for (const assignment of assignments) {
    switch (assignment.scope) {
      case "PRODUCT":
        productAssignments.add(assignment.refId);
        break;
      case "BRAND":
        brandAssignments.add(assignment.refId);
        break;
      case "VENDOR":
        vendorAssignments.add(assignment.refId);
        break;
      case "CATEGORY":
        categoryAssignments.add(assignment.refId);
        break;
      default:
        break;
    }
  }

  const hasAssignments =
    productAssignments.size ||
    brandAssignments.size ||
    vendorAssignments.size ||
    categoryAssignments.size;

  const excludedProductIds = new Set<string>();
  const excludedBrandIds = new Set<string>();
  const excludedVendorIds = new Set<string>();
  const excludedCategoryIds = new Set<string>();

  for (const exclusion of exclusions) {
    switch (exclusion.scope) {
      case "PRODUCT":
        excludedProductIds.add(exclusion.refId);
        break;
      case "BRAND":
        excludedBrandIds.add(exclusion.refId);
        break;
      case "VENDOR":
        excludedVendorIds.add(exclusion.refId);
        break;
      case "CATEGORY":
        excludedCategoryIds.add(exclusion.refId);
        break;
      default:
        break;
    }
  }

  const eligible: number[] = [];
  items.forEach((item, index) => {
    if (item.remainingCents <= 0) return;
    if (item.locked) return;

    const matches =
      !hasAssignments ||
      productAssignments.has(item.productId) ||
      (item.brandId && brandAssignments.has(item.brandId)) ||
      (item.vendorId && vendorAssignments.has(item.vendorId)) ||
      (item.categoryId && categoryAssignments.has(item.categoryId));

    if (!matches) return;

    if (excludedProductIds.has(item.productId)) return;
    if (item.brandId && excludedBrandIds.has(item.brandId)) return;
    if (item.vendorId && excludedVendorIds.has(item.vendorId)) return;
    if (item.categoryId && excludedCategoryIds.has(item.categoryId)) return;

    eligible.push(index);
  });

  return eligible;
}

function computePercentOff(
  discount: DiscountWithRelations,
  items: MutableItem[],
  eligibleIndexes: number[]
): DiscountComputation | null {
  if (discount.percentOff == null) return null;
  const percentValue = Number(discount.percentOff);
  if (!Number.isFinite(percentValue) || percentValue <= 0) return null;

  const subtotal = eligibleIndexes.reduce(
    (sum, index) => sum + items[index].remainingCents,
    0
  );
  if (subtotal <= 0) return null;

  const percent = percentValue / 100;
  const raw = subtotal * percent;
  const amount = Math.min(Math.round(raw), subtotal);
  return { amountCents: amount, meta: { percent } };
}

function computeAmountOff(
  discount: DiscountWithRelations,
  items: MutableItem[],
  eligibleIndexes: number[]
): DiscountComputation | null {
  if (discount.amountOffCts == null || discount.amountOffCts <= 0) {
    return null;
  }
  const subtotal = eligibleIndexes.reduce(
    (sum, index) => sum + items[index].remainingCents,
    0
  );
  if (subtotal <= 0) return null;

  const amount = Math.min(discount.amountOffCts, subtotal);
  return { amountCents: amount };
}

function computeCouponDiscount(
  discount: DiscountWithRelations,
  items: MutableItem[],
  eligibleIndexes: number[],
  overridePercent?: number
): DiscountComputation | null {
  if (overridePercent != null) {
    const subtotal = eligibleIndexes.reduce(
      (sum, index) => sum + items[index].remainingCents,
      0
    );
    if (subtotal <= 0) return null;
    const raw = subtotal * overridePercent;
    return { amountCents: Math.min(Math.round(raw), subtotal) };
  }

  if (discount.percentOff != null) {
    return computePercentOff(discount, items, eligibleIndexes);
  }
  if (discount.amountOffCts != null) {
    return computeAmountOff(discount, items, eligibleIndexes);
  }
  return null;
}

function computeBogo(
  discount: DiscountWithRelations,
  items: MutableItem[],
  eligibleIndexes: number[]
): DiscountComputation | null {
  const buyQty = discount.bogoBuyQty ?? 0;
  const getQty = discount.bogoGetQty ?? 0;
  if (buyQty <= 0 || getQty <= 0) return null;

  let totalDiscount = 0;
  const groupsMeta: Array<{ sku: string; freeQty: number }> = [];

  for (const index of eligibleIndexes) {
    const item = items[index];
    const groupSize = buyQty + getQty;
    if (groupSize <= 0) continue;
    const groups = Math.floor(item.quantity / groupSize);
    if (groups <= 0) continue;
    const freeUnits = groups * getQty;
    const discountAmount = Math.min(item.unitPriceCents * freeUnits, item.remainingCents);
    if (discountAmount <= 0) continue;
    totalDiscount += discountAmount;
    groupsMeta.push({ sku: item.sku, freeQty: freeUnits });
  }

  if (totalDiscount <= 0) return null;
  return { amountCents: totalDiscount, meta: { bogo: groupsMeta } };
}

function computeTiered(
  _discount: DiscountWithRelations,
  _items: MutableItem[],
  _eligibleIndexes: number[]
): DiscountComputation | null {
  return null;
}

type Allocation = { index: number; amountCents: number };

function allocateAmount(amount: number, eligibleIndexes: number[], items: MutableItem[]): Allocation[] {
  if (amount <= 0) return [];
  const subtotal = eligibleIndexes.reduce(
    (sum, index) => sum + items[index].remainingCents,
    0
  );
  if (subtotal <= 0) return [];

  const allocations: Allocation[] = [];
  let remaining = amount;

  eligibleIndexes.forEach((index, i) => {
    const item = items[index];
    const isLast = i === eligibleIndexes.length - 1;
    if (item.remainingCents <= 0) return;

    let share = Math.floor((amount * item.remainingCents) / subtotal);
    if (share <= 0 && item.remainingCents > 0 && !isLast) {
      share = 1;
    }
    if (share > item.remainingCents) {
      share = item.remainingCents;
    }

    if (isLast) {
      share = Math.min(item.remainingCents, remaining);
    }

    if (share > 0) {
      allocations.push({ index, amountCents: share });
      remaining -= share;
    }
  });

  if (remaining > 0 && allocations.length) {
    const last = allocations[allocations.length - 1];
    const lastItem = items[last.index];
    const extra = Math.min(lastItem.remainingCents - last.amountCents, remaining);
    if (extra > 0) {
      last.amountCents += extra;
      remaining -= extra;
    }
  }

  return allocations.filter((entry) => entry.amountCents > 0);
}

function resolveCoupon(
  discount: DiscountWithRelations,
  couponCodes: string[],
  context: DiscountEvaluationContext,
  options: DiscountEvaluationOptions
):
  | { blocked: true }
  | { blocked: false; codes: string[]; percentOff?: number }
  | null {
  if (discount.type !== "coupon") {
    return null;
  }

  if (!couponCodes.length) {
    return { blocked: true };
  }

  const now = context.now;
  const codesSet = new Set(couponCodes);
  const coupons: DiscountCouponRecord[] = discount.coupons;

  const matchingCoupons = coupons.filter((coupon) => {
    const normalizedCode = coupon.code.toUpperCase();
    if (!codesSet.has(normalizedCode)) return false;
    if (coupon.startsAt && now < coupon.startsAt) return false;
    if (coupon.endsAt && now > coupon.endsAt) return false;
    return true;
  });

  if (!matchingCoupons.length) {
    return { blocked: true };
  }

  const usage = options.couponUsage ?? [];
  const totalUsage = usage
    .filter((entry) => entry.discountId === discount.id)
    .reduce((sum, entry) => sum + entry.totalRedemptions, 0);
  const totalLimit = discount.usageLimitTotal ?? null;
  if (totalLimit != null && totalUsage >= totalLimit) {
    return { blocked: true };
  }

  const allowedCodesSet = new Set<string>();
  let percentOverride: number | undefined;

  for (const coupon of matchingCoupons) {
    const couponUsage = usage.find((entry) => entry.couponId === coupon.id && entry.discountId === discount.id);

    if (coupon.maxRedemptions != null && couponUsage?.totalRedemptions != null) {
      if (couponUsage.totalRedemptions >= coupon.maxRedemptions) {
        continue;
      }
    }

    if (
      discount.usageLimitPerUser != null &&
      context.customerId &&
      couponUsage?.userRedemptions != null &&
      couponUsage.userRedemptions >= discount.usageLimitPerUser
    ) {
      continue;
    }

    allowedCodesSet.add(coupon.code.toUpperCase());
  }

  const allowedCodes = Array.from(allowedCodesSet);

  if (!allowedCodes.length) {
    return { blocked: true };
  }

  if (discount.percentOff != null) {
    percentOverride = Number(discount.percentOff) / 100;
  }

  return { blocked: false, codes: allowedCodes, percentOff: percentOverride };
}
