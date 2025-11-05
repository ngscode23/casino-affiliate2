import "server-only";

import { Prisma, PrismaClient } from "@generated/prisma/client";
import { normalizeCouponCodes } from "./utils";
import type {
  CouponUsageSnapshot,
  DiscountFilterSet,
  DiscountUsageSnapshot,
  DiscountWithRelations,
  LoadedProduct,
  RepositoryFilters,
} from "./types";

type DiscountClient = Pick<
  PrismaClient,
  | "discount"
  | "discountAssignment"
  | "discountExclusion"
  | "coupon"
  | "couponRedemption"
  | "product"
  | "brand"
  | "vendor"
  | "category"
>;

export async function loadDiscounts(
  client: DiscountClient,
  filters: RepositoryFilters,
  matching?: Partial<DiscountFilterSet>
): Promise<DiscountWithRelations[]> {
  const {
    channel,
    now,
    couponCodes,
    includeInactive = false,
    discountIds,
    scopes,
  } = filters;

  const normalizedCodes = normalizeCouponCodes(couponCodes);
  const channelFilter = channel === "all" ? ["all"] : ["all", channel];

  const where: Prisma.DiscountWhereInput = {
    ...(includeInactive ? {} : { active: true }),
    ...(discountIds?.length ? { id: { in: discountIds } } : {}),
    channel: { in: channelFilter },
  };

  if (!includeInactive) {
    appendAndClause(where, {
      OR: [{ startAt: null }, { startAt: { lte: now } }],
    });
    appendAndClause(where, {
      OR: [{ endAt: null }, { endAt: { gte: now } }],
    });
  }

  const scopeConditions: Prisma.DiscountWhereInput[] = [];
  const mergedMatching = mergeFilterSet(matching, scopes);

  if (mergedMatching.productIds.length) {
    scopeConditions.push({
      assignments: {
        some: { scope: "PRODUCT", refId: { in: mergedMatching.productIds } },
      },
    });
  }
  if (mergedMatching.brandIds.length) {
    scopeConditions.push({
      assignments: {
        some: { scope: "BRAND", refId: { in: mergedMatching.brandIds } },
      },
    });
  }
  if (mergedMatching.vendorIds.length) {
    scopeConditions.push({
      assignments: {
        some: { scope: "VENDOR", refId: { in: mergedMatching.vendorIds } },
      },
    });
  }
  if (mergedMatching.categoryIds.length) {
    scopeConditions.push({
      assignments: {
        some: { scope: "CATEGORY", refId: { in: mergedMatching.categoryIds } },
      },
    });
  }
  if (mergedMatching.customerGroupIds.length) {
    scopeConditions.push({
      assignments: {
        some: { scope: "CUSTOMER_GROUP", refId: { in: mergedMatching.customerGroupIds } },
      },
    });
  }

  if (scopeConditions.length) {
    appendAndClause(where, {
      OR: [{ assignments: { none: {} } }, ...scopeConditions],
    });
  }

  const couponWhere: Prisma.CouponWhereInput = {};
  if (!includeInactive) {
    appendAndClause(couponWhere, {
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
    });
    appendAndClause(couponWhere, {
      OR: [{ endsAt: null }, { endsAt: { gte: now } }],
    });
  }
  if (normalizedCodes.length) {
    couponWhere.code = { in: normalizedCodes };
  }

  return client.discount.findMany({
    where,
    include: {
      assignments: true,
      exclusions: true,
      coupons: {
        where: couponWhere,
      },
    },
    orderBy: [
      { priority: "asc" },
      { startAt: "asc" },
      { createdAt: "asc" },
    ],
  });
}

export async function loadProductsBySkus(client: DiscountClient, skus: string[]): Promise<LoadedProduct[]> {
  if (skus.length === 0) return [];
  const unique = Array.from(new Set(skus));
  const rows = await client.product.findMany({
    where: { sku: { in: unique } },
    include: {
      brand: { select: { id: true } },
      vendor: { select: { id: true } },
      category: { select: { id: true } },
    },
  });
  const products: LoadedProduct[] = rows.map((row: any) => ({
    id: row.id,
    sku: row.sku,
    name: row.name,
    priceCents: row.priceCents,
    currency: row.currency,
    brandId: row.brandId,
    vendorId: row.vendorId,
    categoryId: row.categoryId,
  }));
  return products;
}

export async function loadProductsByIds(client: DiscountClient, productIds: string[]): Promise<LoadedProduct[]> {
  if (productIds.length === 0) return [];
  const unique = Array.from(new Set(productIds));
  const rows = await client.product.findMany({
    where: { id: { in: unique } },
    include: {
      brand: { select: { id: true } },
      vendor: { select: { id: true } },
      category: { select: { id: true } },
    },
  });
  const products: LoadedProduct[] = rows.map((row: any) => ({
    id: row.id,
    sku: row.sku,
    name: row.name,
    priceCents: row.priceCents,
    currency: row.currency,
    brandId: row.brandId,
    vendorId: row.vendorId,
    categoryId: row.categoryId,
  }));
  return products;
}

export async function loadCouponUsageSnapshot(
  client: DiscountClient,
  couponIds: string[],
  userId?: string | null
): Promise<CouponUsageSnapshot[]> {
  if (!couponIds.length) return [];

  const totals = await client.couponRedemption.groupBy({
    by: ["couponId", "discountId"],
    where: { couponId: { in: couponIds } },
    _count: { _all: true },
  });

  const userRedemptions = userId
    ? await client.couponRedemption.groupBy({
        by: ["couponId", "discountId"],
        where: {
          couponId: { in: couponIds },
          userId,
        },
        _count: { _all: true },
      })
    : [];

  const userUsageMap = new Map<string, number>();
  for (const entry of userRedemptions) {
    userUsageMap.set(`${entry.discountId}:${entry.couponId}`, entry._count._all);
  }

  const usageSnapshots: CouponUsageSnapshot[] = totals.flatMap((row) => {
    if (!row.couponId) return [];
    const key = `${row.discountId}:${row.couponId}`;
    return [
      {
        couponId: row.couponId,
        discountId: row.discountId,
        totalRedemptions: row._count._all,
        userRedemptions: userUsageMap.get(key) ?? 0,
      },
    ];
  });
  return usageSnapshots;
}

export async function loadDiscountUsageSnapshot(
  client: DiscountClient,
  discountIds: string[],
  userId?: string | null
): Promise<DiscountUsageSnapshot[]> {
  if (!discountIds.length) return [];

  const totals = await client.couponRedemption.groupBy({
    by: ["discountId"],
    where: { discountId: { in: discountIds } },
    _count: { _all: true },
  });

  const userTotals = userId
    ? await client.couponRedemption.groupBy({
        by: ["discountId"],
        where: {
          discountId: { in: discountIds },
          userId,
        },
        _count: { _all: true },
      })
    : [];

  const totalMap = new Map<string, number>();
  for (const entry of totals) {
    totalMap.set(entry.discountId, entry._count._all);
  }
  const userMap = new Map<string, number>();
  for (const entry of userTotals) {
    userMap.set(entry.discountId, entry._count._all);
  }

  const snapshots: DiscountUsageSnapshot[] = discountIds.map((discountId) => ({
    discountId,
    totalRedemptions: totalMap.get(discountId) ?? 0,
    userRedemptions: userMap.get(discountId) ?? 0,
  }));

  return snapshots;
}

function appendAndClause<Clause>(
  where: { AND?: Clause | Clause[] },
  clause: Clause
) {
  const current = where.AND;
  const nextArray = Array.isArray(current)
    ? [...current, clause]
    : current
      ? [current, clause]
      : [clause];
  where.AND = nextArray;
}

function mergeFilterSet(
  matching?: Partial<DiscountFilterSet>,
  scopes?: RepositoryFilters["scopes"]
): DiscountFilterSet {
  const base: DiscountFilterSet = {
    productIds: matching?.productIds ?? [],
    brandIds: matching?.brandIds ?? [],
    vendorIds: matching?.vendorIds ?? [],
    categoryIds: matching?.categoryIds ?? [],
    customerGroupIds: matching?.customerGroupIds ?? [],
  };
  if (!scopes?.length) return base;

  const next: DiscountFilterSet = {
    productIds: [...base.productIds],
    brandIds: [...base.brandIds],
    vendorIds: [...base.vendorIds],
    categoryIds: [...base.categoryIds],
    customerGroupIds: [...base.customerGroupIds],
  };

  scopes.forEach(({ scope, refIds }) => {
    if (!refIds?.length) return;
    switch (scope) {
      case "PRODUCT":
        next.productIds.push(...refIds);
        break;
      case "BRAND":
        next.brandIds.push(...refIds);
        break;
      case "VENDOR":
        next.vendorIds.push(...refIds);
        break;
      case "CATEGORY":
        next.categoryIds.push(...refIds);
        break;
      case "CUSTOMER_GROUP":
        next.customerGroupIds.push(...refIds);
        break;
      default:
        break;
    }
  });

  return {
    productIds: unique(next.productIds),
    brandIds: unique(next.brandIds),
    vendorIds: unique(next.vendorIds),
    categoryIds: unique(next.categoryIds),
    customerGroupIds: unique(next.customerGroupIds),
  };
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => typeof value === "string" && value.trim().length > 0)));
}
