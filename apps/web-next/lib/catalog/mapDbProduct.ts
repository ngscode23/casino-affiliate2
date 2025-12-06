import { normalizeImageUrl } from "@/app/products/[slug]/data";
import { resolveCurrency, resolvePriceDetails } from "@/app/products/price-utils";
import type { Product, RecMeta, CurrencyCode } from "@/types/domain";
import type { Database } from "@/types/supabase";

type ProductViewRow = Database["public"]["Views"]["product_with_discount_with_dataset"]["Row"];
type EcomProductRow = Database["public"]["Tables"]["ecom_products"]["Row"];

export type DbProductRow = ProductViewRow | EcomProductRow | (ProductViewRow & EcomProductRow);

type VariantMeta = {
  catalogProductId?: string | null;
  brandSlug?: string | null;
  brandName?: string | null;
  modelSlug?: string | null;
  modelTitle?: string | null;
};

type MapDbProductOptions = {
  order?: number;
  dataset?: Product["dataset"];
  recMeta?: RecMeta;
  meta?: VariantMeta;
  availability?: Product["availability"];
  createdAtFallback?: string | null;
  isNew?: boolean;
  isTop?: boolean;
};

function asString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function asNumber(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function resolveDataset(input: string | null | undefined): Product["dataset"] {
  const normalized = (input ?? "").toLowerCase();
  return normalized === "legacy" || normalized === "products" ? "legacy" : "shop";
}

export function mapDbProduct(row: DbProductRow, options: MapDbProductOptions = {}): Product {
  const id = asString((row as Record<string, unknown>)?.id) ?? "";
  const slug = asString((row as Record<string, unknown>)?.slug) ?? id;
  const sku = asString((row as Record<string, unknown>)?.sku);
  const title =
    asString((row as Record<string, unknown>)?.name) ??
    asString((row as Record<string, unknown>)?.title) ??
    (slug || "Product");

  const priceDetails = resolvePriceDetails(row as Record<string, unknown>);
  const currency: CurrencyCode = (resolveCurrency(row as Record<string, unknown>) ?? "EUR").toUpperCase();

  const thumbnailPath =
    asString((row as Record<string, unknown>)?.thumbnail_path) ??
    asString((row as Record<string, unknown>)?.thumbnail) ??
    asString((row as Record<string, unknown>)?.image_path) ??
    null;
  const mainImage =
    normalizeImageUrl(
      asString((row as Record<string, unknown>)?.main_image_url) ??
        asString((row as Record<string, unknown>)?.image_url) ??
        thumbnailPath,
    ) ?? null;

  const categorySlug = asString((row as Record<string, unknown>)?.category_slug);
  const createdAt =
    asString((row as Record<string, unknown>)?.created_at) ??
    asString((row as Record<string, unknown>)?.createdAt) ??
    options.createdAtFallback ??
    null;

  const dataset = resolveDataset(options.dataset ?? asString((row as Record<string, unknown>)?.dataset));
  const rating = asNumber((row as Record<string, unknown>)?.rating);

  return {
    id,
    slug,
    sku,
    title,
    description: asString((row as Record<string, unknown>)?.description),
    category: categorySlug,
    brand: options.meta?.brandSlug ?? null,
    brandSlug: options.meta?.brandSlug ?? null,
    brandName: options.meta?.brandName ?? null,
    model: options.meta?.modelSlug ?? null,
    modelSlug: options.meta?.modelSlug ?? null,
    modelTitle: options.meta?.modelTitle ?? null,
    catalogProductId: options.meta?.catalogProductId ?? null,
    price: priceDetails.price,
    priceCents: priceDetails.priceCents,
    originalPrice: priceDetails.originalPrice,
    originalPriceCents: priceDetails.originalPriceCents,
    discountPercent: priceDetails.discountPercent,
    discountAmountCents: priceDetails.discountAmountCents,
    currency,
    mainImage,
    thumbnailPath,
    rating,
    clicks: asNumber((row as Record<string, unknown>)?.clicks) ?? 0,
    impressions: asNumber((row as Record<string, unknown>)?.impressions) ?? 0,
    dataset,
    order: options.order ?? 0,
    createdAt,
    isNew: options.isNew,
    isTop: options.isTop,
    availability: options.availability ?? "InStock",
    categorySlug,
    recMeta: options.recMeta,
  };
}
