import "server-only";

import { Prisma, PrismaClient } from "@generated/prisma/client";
import type { CartPricingRequestInput, PricingPreviewInput } from "./validators";
import {
  loadCouponUsageSnapshot,
  loadDiscountUsageSnapshot,
  loadDiscounts,
  loadProductsByIds,
  loadProductsBySkus,
} from "./repository";
import { evaluateDiscounts } from "./evaluator";
import type {
  AppliedDiscount,
  CartItemInput,
  CouponUsageSnapshot,
  DiscountEvaluationContext,
  DiscountEvaluationResult,
  DiscountUsageSnapshot,
  DiscountFilterSet,
  DiscountWithRelations,
  LoadedProduct,
} from "./types";
import { normalizeCouponCodes } from "./utils";

type ProductMeta = {
  id: string;
  sku: string;
  brandId?: string | null;
  vendorId?: string | null;
  categoryId?: string | null;
  currency: string;
  priceCents: number;
};

type DiscountPrisma = PrismaClient | Prisma.TransactionClient;

type DiscountCouponRecord = DiscountWithRelations["coupons"][number];

export class CartPricingError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = "CartPricingError";
  }
}

interface PreviewResult {
  discounts: DiscountWithRelations[];
  evaluation: DiscountEvaluationResult;
  items: CartItemInput[];
}

interface RedemptionRecord {
  discountId: string;
  couponId: string | null;
  couponCode?: string | null;
  amountCents: number;
  items: AppliedDiscount["items"];
}

export interface CartPricingResult extends PreviewResult {
  committed: boolean;
  redemptions: RedemptionRecord[];
}

export async function previewPricing(
  prisma: DiscountPrisma,
  input: PricingPreviewInput
): Promise<PreviewResult> {
  const now = input.now ?? new Date();
  const normalizedCoupons = normalizeCouponCodes(input.couponCodes);

  const { items: resolvedItems, filterSet } = await resolveItems(prisma, input);

  const discounts = await loadDiscounts(
    prisma,
    {
      channel: input.channel ?? "web",
      now,
      couponCodes: normalizedCoupons,
    },
    filterSet
  );

  const discountIds = discounts.map((discount) => discount.id);
  const couponDiscounts = discounts.filter((discount) => discount.type === "coupon");
  const couponIds = couponDiscounts.flatMap((discount) => {
    const coupons = discount.coupons as DiscountCouponRecord[];
    return coupons.map((coupon) => coupon.id);
  });

  const [couponUsage, discountUsage] = await Promise.all([
    loadCouponUsageSnapshot(prisma, couponIds, input.customerId),
    loadDiscountUsageSnapshot(prisma, discountIds, input.customerId),
  ]);

  const evaluationContext: DiscountEvaluationContext = {
    now,
    channel: input.channel ?? "web",
    currency: input.currency,
    customerId: input.customerId,
    customerGroups: input.customerGroups ?? [],
    couponCodes: normalizedCoupons,
    items: resolvedItems,
  };

  const evaluation = evaluateDiscounts(discounts, evaluationContext, {
    couponUsage,
    discountUsage,
  });

  return {
    discounts,
    evaluation,
    items: resolvedItems,
  };
}

export async function priceCart(
  prisma: PrismaClient,
  input: CartPricingRequestInput
): Promise<CartPricingResult> {
  if (!input.commit) {
    const preview = await previewPricing(prisma, input);
    return { ...preview, committed: false, redemptions: [] };
  }

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const preview = await previewPricing(tx, input);
    const redemptions = await persistRedemptions(tx, preview, input);
    return { ...preview, committed: true, redemptions };
  });
}

async function resolveItems(prisma: DiscountPrisma, input: PricingPreviewInput) {
  const productIds = Array.from(
    new Set(
      input.items
        .map((item) => item.productId)
        .filter((value): value is string => typeof value === "string")
    )
  );
  const skus = Array.from(
    new Set(
      input.items
        .map((item) => item.sku)
        .filter((value): value is string => typeof value === "string")
    )
  );

  const [productsById, productsBySku] = await Promise.all([
    loadProductsByIds(prisma, productIds),
    loadProductsBySkus(prisma, skus),
  ]);

  const productMap = new Map<string, ProductMeta>();
  const skuMap = new Map<string, ProductMeta>();

  const mapProduct = (product: LoadedProduct): ProductMeta => ({
    id: product.id,
    sku: product.sku,
    brandId: product.brandId ?? null,
    vendorId: product.vendorId ?? null,
    categoryId: product.categoryId ?? null,
    currency: product.currency,
    priceCents: product.priceCents,
  });

  productsById.forEach((row) => {
    const mapped = mapProduct(row);
    productMap.set(mapped.id, mapped);
    skuMap.set(mapped.sku, mapped);
  });
  productsBySku.forEach((row) => {
    const mapped = mapProduct(row);
    productMap.set(mapped.id, mapped);
    skuMap.set(mapped.sku, mapped);
  });

  const resolvedItems: CartItemInput[] = input.items.map((item) => {
    const product =
      (item.productId ? productMap.get(item.productId) : undefined) ??
      (item.sku ? skuMap.get(item.sku) : undefined);
    const productId = item.productId ?? product?.id;
    const sku = item.sku ?? product?.sku;

    if (!productId || !sku) {
      throw new Error(`Unable to resolve product for item with sku=${item.sku ?? ""}`);
    }

    const currency = item.currency ?? product?.currency ?? input.currency;
    if (currency !== input.currency) {
      throw new Error(`Currency mismatch for item ${sku}: expected ${input.currency}, received ${currency}`);
    }

    return {
      productId,
      sku,
      quantity: item.quantity ?? 1,
      unitPriceCents:
        item.unitPriceCents ??
        product?.priceCents ??
        (() => {
          throw new Error(`Missing unit price for item ${sku}`);
        })(),
      currency,
      brandId: item.brandId ?? product?.brandId ?? null,
      vendorId: item.vendorId ?? product?.vendorId ?? null,
      categoryId: item.categoryId ?? product?.categoryId ?? null,
    };
  });

  const filterSet: DiscountFilterSet = {
    productIds: unique(resolvedItems.map((item) => item.productId)),
    brandIds: unique(resolvedItems.map((item) => item.brandId).filter(isString)),
    vendorIds: unique(resolvedItems.map((item) => item.vendorId).filter(isString)),
    categoryIds: unique(resolvedItems.map((item) => item.categoryId).filter(isString)),
    customerGroupIds: unique(input.customerGroups ?? []),
  };

  return { items: resolvedItems, filterSet };
}

async function lockRows(
  tx: Prisma.TransactionClient,
  table: "Discount" | "Coupon",
  ids: string[]
) {
  if (!ids.length) return;
  const tableSql = table === "Discount"
    ? Prisma.sql`"discounts"."Discount"`
    : Prisma.sql`"discounts"."Coupon"`;
  await tx.$queryRaw(
    Prisma.sql`
      SELECT "id"
      FROM ${tableSql}
      WHERE "id" IN (${Prisma.join(ids)})
      FOR UPDATE
    `
  );
}

async function persistRedemptions(
  tx: Prisma.TransactionClient,
  preview: PreviewResult,
  input: CartPricingRequestInput
): Promise<RedemptionRecord[]> {
  const applied = preview.evaluation.applied;
  if (!applied.length) return [];

  const discountMap = new Map(preview.discounts.map((discount) => [discount.id, discount]));
  const discountIds = Array.from(new Set(applied.map((entry) => entry.id)));

  const couponRefs = applied.flatMap((entry) => {
    const discount = discountMap.get(entry.id);
    if (!discount) {
      throw new CartPricingError("discount_unavailable", `Discount ${entry.id} is no longer available`, 404);
    }
    return entry.couponsApplied.map((code) => {
      const normalized = code.toUpperCase();
      const coupon = discount.coupons.find(
        (candidate: DiscountCouponRecord) => candidate.code.toUpperCase() === normalized
      );
      if (!coupon) {
        throw new CartPricingError("coupon_unavailable", `Coupon ${code} is no longer valid for discount ${discount.name}`, 409);
      }
      return {
        id: coupon.id,
        code: normalized,
        discountId: discount.id,
        coupon,
      };
    });
  });

  const couponIds = Array.from(new Set(couponRefs.map((entry) => entry.id)));

  await lockRows(tx, "Discount", discountIds);
  if (couponIds.length) {
    await lockRows(tx, "Coupon", couponIds);
  }

  const [discountUsage, couponUsage] = await Promise.all([
    loadDiscountUsageSnapshot(tx, discountIds, input.customerId),
    couponIds.length
      ? loadCouponUsageSnapshot(tx, couponIds, input.customerId)
      : Promise.resolve<CouponUsageSnapshot[]>([]),
  ]);

  const discountUsageMap = new Map<string, DiscountUsageSnapshot>(
    discountUsage.map((entry) => [entry.discountId, entry])
  );
  const couponUsageMap = new Map<string, CouponUsageSnapshot>(
    couponUsage.map((entry) => [`${entry.discountId}:${entry.couponId}`, entry])
  );

  const redemptions: RedemptionRecord[] = [];
  const metadataBase = input.metadata ?? {};
  const customerId = input.customerId ?? null;

  for (const appliedEntry of applied) {
    const discount = discountMap.get(appliedEntry.id);
    if (!discount) {
      throw new CartPricingError("discount_unavailable", `Discount ${appliedEntry.id} is no longer available`, 404);
    }

    const discountUsageEntry = discountUsageMap.get(discount.id);
    if (
      discount.usageLimitTotal != null &&
      (discountUsageEntry?.totalRedemptions ?? 0) >= discount.usageLimitTotal
    ) {
      throw new CartPricingError("discount_usage_limit", `Discount ${discount.name} reached total usage limit`, 409);
    }
    if (
      discount.usageLimitPerUser != null &&
      customerId &&
      (discountUsageEntry?.userRedemptions ?? 0) >= discount.usageLimitPerUser
    ) {
      throw new CartPricingError("discount_usage_limit", `Discount ${discount.name} reached per-user usage limit`, 409);
    }

    let couponId: string | null = null;
    let couponCode: string | null = null;

    if (appliedEntry.couponsApplied.length) {
      const normalized = appliedEntry.couponsApplied[0].toUpperCase();
      const couponRef = couponRefs.find(
        (entry) => entry.discountId === discount.id && entry.code === normalized
      );
      const coupon = couponRef?.coupon;
      if (!coupon) {
        throw new CartPricingError("coupon_unavailable", `Coupon ${normalized} is no longer valid for discount ${discount.name}`, 409);
      }

      const couponUsageEntryKey = `${discount.id}:${coupon.id}`;
      let couponUsageEntry = couponUsageMap.get(couponUsageEntryKey);
      if (
        coupon.maxRedemptions != null &&
        (couponUsageEntry?.totalRedemptions ?? 0) >= coupon.maxRedemptions
      ) {
        throw new CartPricingError("coupon_limit_exhausted", `Coupon ${coupon.code} has exhausted redemptions`, 409);
      }
      if (
        discount.usageLimitPerUser != null &&
        customerId &&
        (couponUsageEntry?.userRedemptions ?? 0) >= discount.usageLimitPerUser
      ) {
        throw new CartPricingError("coupon_usage_limit", `Coupon ${coupon.code} reached per-user usage limit`, 409);
      }

      couponId = coupon.id;
      couponCode = normalized;

      if (couponUsageEntry) {
        couponUsageEntry.totalRedemptions += 1;
        if (customerId) couponUsageEntry.userRedemptions += 1;
      } else {
        couponUsageEntry = {
          couponId: coupon.id,
          discountId: discount.id,
          totalRedemptions: 1,
          userRedemptions: customerId ? 1 : 0,
        };
        couponUsage.push(couponUsageEntry);
        couponUsageMap.set(couponUsageEntryKey, couponUsageEntry);
      }
    }

    if (discountUsageEntry) {
      discountUsageEntry.totalRedemptions += 1;
      if (customerId) discountUsageEntry.userRedemptions += 1;
    } else {
      const newEntry: DiscountUsageSnapshot = {
        discountId: discount.id,
        totalRedemptions: 1,
        userRedemptions: customerId ? 1 : 0,
      };
      discountUsage.push(newEntry);
      discountUsageMap.set(discount.id, newEntry);
    }

    redemptions.push({
      discountId: discount.id,
      couponId,
      couponCode,
      amountCents: appliedEntry.amountCents,
      items: appliedEntry.items,
    });
  }

  if (redemptions.length) {
    await tx.couponRedemption.createMany({
      data: redemptions.map((record) => ({
        couponId: record.couponId,
        discountId: record.discountId,
        userId: customerId,
        orderId: input.orderId ?? null,
        amountCents: record.amountCents,
        currency: input.currency,
        metadata: {
          ...metadataBase,
          items: record.items,
          couponsApplied: record.couponCode ? [record.couponCode] : [],
        },
      })),
    });
  }

  const couponMap = new Map(couponRefs.map((entry) => [entry.id, entry]));
  for (const ref of couponMap.values()) {
    const { coupon } = ref;
    const updateResult = await tx.coupon.updateMany({
      where: {
        id: coupon.id,
        ...(coupon.maxRedemptions != null ? { redemptions: { lt: coupon.maxRedemptions } } : {}),
      },
      data: { redemptions: { increment: 1 } },
    });

    if (updateResult.count === 0) {
      throw new CartPricingError("coupon_limit_exhausted", `Coupon ${coupon.code} exceeded redemption limit`, 409);
    }
  }

  return redemptions;
}

function unique(values: (string | null | undefined)[]): string[] {
  return Array.from(
    new Set(values.filter((value): value is string => typeof value === "string" && value.trim().length > 0))
  );
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
