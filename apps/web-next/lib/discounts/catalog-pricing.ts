import { prisma } from "@/lib/prisma";
import { getAdminClient } from "@/utils/supabase/admin";
import { evaluateDiscounts } from "./evaluator";
import { loadDiscounts, loadProductsByIds } from "./repository";
import type {
  CartItemInput,
  DiscountFilterSet,
  DiscountWithRelations,
  LoadedProduct,
} from "./types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CatalogDiscountSnapshot = {
  priceCents: number;
  originalPriceCents: number;
  discountAmountCents: number;
  discountPercent: number;
};

type SnapshotMap = Map<string, CatalogDiscountSnapshot>;

const DEFAULT_DISCOUNT_VIEW_LIST =
  "product_with_discount_public,product_with_discount,product";

function uniq<T>(values: (T | null | undefined)[]): T[] {
  return Array.from(
    new Set(
      values.filter((value): value is T => value !== null && value !== undefined),
    ),
  );
}

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function coerceNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function pickNumber(
  row: Record<string, unknown> | null | undefined,
  keys: string[],
): number | null {
  if (!row) return null;
  for (const key of keys) {
    if (!(key in row)) continue;
    const value = (row as Record<string, unknown>)[key];
    const numeric = coerceNumber(value);
    if (numeric != null) {
      return numeric;
    }
  }
  return null;
}

function extractMoneyCents(
  row: Record<string, unknown> | null | undefined,
  centKeys: string[],
  unitKeys: string[],
): number | null {
  const cents = pickNumber(row, centKeys);
  if (cents != null) {
    return Math.round(cents);
  }
  const unit = pickNumber(row, unitKeys);
  if (unit != null) {
    return Math.round(unit * 100);
  }
  return null;
}

function normalizePercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const scaled = value > 1 ? value : value * 100;
  return Number(scaled.toFixed(2));
}

function resolveDiscountViewCandidates(): string[] {
  const raw =
    process.env.SUPABASE_PRODUCT_DISCOUNT_VIEWS ||
    process.env.NEXT_PUBLIC_SUPABASE_PRODUCT_DISCOUNT_VIEWS ||
    DEFAULT_DISCOUNT_VIEW_LIST;
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry, index, array) => entry.length > 0 && array.indexOf(entry) === index);
}

function isIgnorableSupabaseViewError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const anyError = error as Record<string, unknown>;
  const code = typeof anyError.code === "string" ? anyError.code : undefined;
  const message =
    typeof anyError.message === "string"
      ? anyError.message.toLowerCase()
      : typeof anyError.error === "string"
        ? anyError.error.toLowerCase()
        : "";
  const details =
    typeof anyError.details === "string"
      ? anyError.details.toLowerCase()
      : typeof anyError.hint === "string"
        ? anyError.hint.toLowerCase()
        : "";

  if (code === "42P01" || code === "42501") return true;
  if (message.includes("permission") && message.includes("denied")) return true;
  if (message.includes("does not exist")) return true;
  if (details.includes("relation") && details.includes("does not exist")) return true;
  if (Object.keys(anyError).length === 0) return true;
  return false;
}

function appendSnapshotFromRow(
  row: Record<string, unknown> | null | undefined,
  target: SnapshotMap,
): boolean {
  if (!row) return false;
  const idRaw = row.id;
  const id = typeof idRaw === "string" && idRaw.trim().length > 0 ? idRaw.trim() : null;
  if (!id) return false;

  const priceCents = extractMoneyCents(
    row,
    [
      "effective_price_cents",
      "effectivePriceCents",
      "price_cents",
      "priceCents",
      "price_with_discount_cents",
      "priceWithDiscountCents",
      "discounted_price_cents",
      "discountedPriceCents",
    ],
    [
      "price_with_discount",
      "priceWithDiscount",
      "price",
      "price_final",
      "priceFinal",
      "discounted_price",
      "discountedPrice",
      "final_price",
      "finalPrice",
      "effective_price",
      "effectivePrice",
    ],
  );
  const originalPriceCents = extractMoneyCents(
    row,
    [
      "original_price_cents",
      "originalPriceCents",
      "base_price_cents",
      "basePriceCents",
      "list_price_cents",
      "listPriceCents",
      "price_before_discount_cents",
      "priceBeforeDiscountCents",
      "basePriceCents",
    ],
    [
      "original_price",
      "originalPrice",
      "base_price",
      "basePrice",
      "list_price",
      "listPrice",
      "price_before_discount",
      "priceBeforeDiscount",
      "basePrice",
    ],
  );

  if (
    priceCents == null ||
    originalPriceCents == null ||
    !Number.isFinite(priceCents) ||
    !Number.isFinite(originalPriceCents) ||
    originalPriceCents <= priceCents
  ) {
    return false;
  }

  const rawDiscountAmount = extractMoneyCents(
    row,
    [
      "discount_amount_cents",
      "discountAmountCents",
      "discount_cents",
      "discountCents",
    ],
    ["discount_amount", "discountAmount"],
  );
  const discountAmountCents = Math.max(
    0,
    rawDiscountAmount != null ? rawDiscountAmount : originalPriceCents - priceCents,
  );

  if (!(discountAmountCents > 0)) {
    return false;
  }

  const rawPercent = pickNumber(row, ["discount_percent", "discountPercent"]);
  const discountPercent =
    rawPercent != null && Number.isFinite(rawPercent)
      ? normalizePercent(rawPercent)
      : Number(((discountAmountCents / originalPriceCents) * 100).toFixed(2));

  target.set(id, {
    priceCents: Math.max(0, priceCents),
    originalPriceCents: Math.max(originalPriceCents, priceCents),
    discountAmountCents,
    discountPercent,
  });

  return true;
}

function buildMatchingFilters(products: LoadedProduct[]): Partial<DiscountFilterSet> {
  return {
    productIds: uniq(products.map((product) => product.id)),
    brandIds: uniq(products.map((product) => product.brandId ?? undefined)),
    vendorIds: uniq(products.map((product) => product.vendorId ?? undefined)),
    categoryIds: uniq(products.map((product) => product.categoryId ?? undefined)),
  };
}

async function fetchDiscounts(
  now: Date,
  channel: string,
  products: LoadedProduct[],
): Promise<DiscountWithRelations[]> {
  const matching = buildMatchingFilters(products);
  return loadDiscounts(
    prisma,
    {
      channel,
      now,
      couponCodes: [],
      includeInactive: false,
    },
    matching,
  );
}

function toCartItem(product: LoadedProduct): CartItemInput {
  return {
    productId: product.id,
    sku: product.sku,
    quantity: 1,
    unitPriceCents: product.priceCents,
    currency: product.currency,
    brandId: product.brandId ?? undefined,
    vendorId: product.vendorId ?? undefined,
    categoryId: product.categoryId ?? undefined,
  };
}

function evaluateProductDiscount(
  discounts: DiscountWithRelations[],
  product: LoadedProduct,
  now: Date,
  channel: string,
): CatalogDiscountSnapshot | null {
  const evaluation = evaluateDiscounts(discounts, {
    now,
    channel,
    currency: product.currency,
    items: [toCartItem(product)],
  });

  const breakdown = evaluation.breakdown[0];
  if (!breakdown) return null;

  const discountAmountCents = breakdown.discountCents;
  if (!discountAmountCents || discountAmountCents <= 0) return null;

  const originalPriceCents = breakdown.totalBeforeCents;
  const priceCents = Math.max(0, breakdown.totalAfterCents);
  const discountPercent =
    originalPriceCents > 0
      ? Number(((discountAmountCents / originalPriceCents) * 100).toFixed(2))
      : 0;

  return {
    priceCents,
    originalPriceCents,
    discountAmountCents,
    discountPercent,
  };
}

export async function getCatalogDiscountSnapshot(
  productIds: string[],
  options?: { now?: Date; channel?: string; currentPrices?: Map<string, { price: number; currency: string }> },
): Promise<SnapshotMap> {
  const result: SnapshotMap = new Map();

  if (!Array.isArray(productIds) || productIds.length === 0) {
    return result;
  }
  const currentPriceLookup = options?.currentPrices ?? new Map<string, { price: number; currency: string }>();

  const prismaEligibleIds = Array.from(
    new Set(productIds.filter((id): id is string => typeof id === "string" && isUuid(id))),
  );
  const allUniqueIds = Array.from(
    new Set(productIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)),
  );

  const now = options?.now ?? new Date();
  const channel = options?.channel ?? "web";

  if (process.env.DATABASE_URL && prismaEligibleIds.length > 0) {
    try {
      const products = await loadProductsByIds(prisma, prismaEligibleIds);
      if (products.length) {
        const discounts = await fetchDiscounts(now, channel, products);
        if (discounts.length) {
          for (const product of products) {
            const snapshot = evaluateProductDiscount(discounts, product, now, channel);
            if (snapshot) {
              result.set(product.id, snapshot);
            }
          }
        }
      }
    } catch (error) {
      console.error("[catalog] failed to compute discount snapshots via Prisma", error);
    }
  }

  let pendingIds = allUniqueIds.filter((id) => !result.has(id));

  if (pendingIds.length) {
    const admin = getAdminClient();
    const relations = resolveDiscountViewCandidates();
    for (const relation of relations) {
      if (!pendingIds.length) break;
      try {
        const { data, error } = await admin
          .from(relation as any)
          .select("*")
          .in("id", pendingIds);

        if (error) {
          if (!isIgnorableSupabaseViewError(error)) {
            console.error("[catalog] failed to query discount view", { relation, error });
          }
          continue;
        }

        if (Array.isArray(data) && data.length) {
          for (const row of data) {
            appendSnapshotFromRow(row as Record<string, unknown>, result);
          }
        }
      } catch (error) {
        if (!isIgnorableSupabaseViewError(error)) {
          console.error("[catalog] failed to compute discount snapshots via Supabase view", {
            relation,
            error,
          });
        }
        continue;
      }
      pendingIds = allUniqueIds.filter((id) => !result.has(id));
    }
  }

  pendingIds = allUniqueIds.filter((id) => !result.has(id));
  if (!pendingIds.length || currentPriceLookup.size === 0) {
    return result;
  }

  try {
    const admin = getAdminClient();
    const { data, error } = await admin
      .from("products")
      .select("id, price_cents, price, currency")
      .in("id", pendingIds);

    if (error) {
      throw error;
    }

    if (Array.isArray(data)) {
      for (const row of data) {
        const id = typeof row?.id === "string" ? row.id : null;
        if (!id) continue;
        const current = currentPriceLookup.get(id);
        if (!current) continue;

        const basePriceCents =
          typeof row?.price_cents === "number" && Number.isFinite(row.price_cents) ? row.price_cents : null;
        const basePrice =
          basePriceCents != null
            ? basePriceCents / 100
            : Number.isFinite(Number(row?.price))
              ? Number(row?.price)
              : null;

        if (basePrice == null || !Number.isFinite(basePrice) || basePrice <= 0) continue;
        if (!Number.isFinite(current.price) || current.price <= 0) continue;

        const discountAmount = basePrice - current.price;
        if (!(discountAmount > 0.0001)) continue;

        const priceCents = Math.max(0, Math.round(current.price * 100));
        const originalPriceCents = Math.round(basePrice * 100);
        const discountAmountCents = Math.max(0, originalPriceCents - priceCents);
        if (discountAmountCents <= 0) continue;

        const discountPercent = Number(((discountAmount / basePrice) * 100).toFixed(2));
        result.set(id, {
          priceCents,
          originalPriceCents,
          discountAmountCents,
          discountPercent,
        });
      }
    }
  } catch (error) {
    console.error("[catalog] failed to compute discount snapshots via Supabase fallback", error);
  }

  return result;
}
