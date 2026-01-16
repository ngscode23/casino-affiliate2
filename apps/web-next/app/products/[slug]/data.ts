import { unstable_cache } from "next/cache";
import { getAdminClient } from "@/utils/supabase/admin";
import type { ProductGridItem } from "@/components/ProductGrid";
import type { ProductTechSpecs } from "@/lib/catalog/product-tech-specs";
import { normalizeProductTechSpecs } from "@/lib/catalog/product-tech-specs";
import { formatCurrency } from "../currency";
import { resolveCurrency, resolvePriceDetails } from "../price-utils";

const PRODUCT_IMAGE_BUCKET = process.env.SUPABASE_PRODUCT_BUCKET?.trim() || "product-images";
const SUPABASE_ORIGIN = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
let derivedSupabaseOrigin: string | null = SUPABASE_ORIGIN || null;
const BLOCKED_REMOTE_IMAGE_HOSTS = new Set(["cdn.example.com"]);
const PUBLIC_DATASET: ProductData["dataset"] = "shop";
const ALLOWED_PUBLIC_STATUSES = new Set(["published"]);
const BLOCKED_SLUG_PATTERN = /^(?:admin|test|draft)/i;

export const PRODUCT_PAGE_REVALIDATE_SECONDS = 1;
const PRODUCT_COLLECTION_TAG = "products:list";
const PRODUCT_TAG_PREFIX = "product:";
const CATEGORY_TAG_PREFIX = "category:";

function productTag(slug: string) {
  return `${PRODUCT_TAG_PREFIX}${slug}`;
}

function categoryTag(slug: string) {
  return `${CATEGORY_TAG_PREFIX}${slug}`;
}

export type ProductVariantOption = {
  value: string;
  label: string;
  disabled?: boolean;
  image?: string | null;
  priceDelta?: number | null;
};

export type ProductVariantGroup = {
  id: string;
  label: string;
  options: ProductVariantOption[];
};

export type ProductSkuOption = {
  id: string;
  label: string;
  price: number;
  priceCents: number;
  currency: string;
  availabilityCode: AvailabilityCode;
  availabilityLabel: string;
  stockQuantity: number | null;
  isAvailable: boolean | null;
  inventoryStatus: string | null;
  leadTimeDays: number | null;
};

export type ProductSpecsCard = {
  title: string;
  items: string[];
};

export type ProductSpecsData = {
  highlights: string[];
  attributes: Array<{ key: string; value: string }>;
  cards: ProductSpecsCard[];
  inTheBox: string[];
  warranty: string[];
};

export type ProductReviewSummary = {
  average: number;
  count: number;
};

export type ProductReviewPreview = {
  rating: number;
  title: string | null;
  body: string;
  createdAt: string;
  authorLabel: string;
};

export type ProductData = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  description: string | null;
  price: number;
  priceCents?: number | null;
  originalPrice?: number | null;
  originalPriceCents?: number | null;
  discountPercent?: number | null;
  discountAmountCents?: number | null;
  currency: string;
  formattedPrice: string;
  gallery: string[];
  mainImage: string;
  fallbackImage: string | null;
  dataset: "shop" | "legacy";
  status: string;
  sku?: string | null;
  skuOptions: ProductSkuOption[];
  defaultSkuId: string | null;
  catalogProductId: string | null;
  category: { slug: string | null; name: string | null };
  tags: string[];
  specs: ProductSpecsData;
  techSpecs: ProductTechSpecs | null;
  variants: ProductVariantGroup[];
  shippingEstimate: string | null;
  availabilityLabel: string;
  availabilityCode?: "InStock" | "OutOfStock" | "PreOrder";
  stockQuantity?: number | null;
  isAvailable?: boolean | null;
  inventoryStatus?: string | null;
  reviewSummary: ProductReviewSummary;
  recentReviews: ProductReviewPreview[];
  productUid: string | null;
  brand: string | null;
  clicks: number;
  impressions: number;
};

function toStoragePublicUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const origin = derivedSupabaseOrigin || SUPABASE_ORIGIN;
  if (!origin) return null;

  const normalized = path.replace(/^\/+/, "");
  const encodedPath = normalized
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
  return `${origin}/storage/v1/object/public/${encodeURIComponent(PRODUCT_IMAGE_BUCKET)}/${encodedPath}`;
}

export function normalizeImageUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  if (/^https?:/i.test(input)) {
    try {
      const parsed = new URL(input);
      if (!derivedSupabaseOrigin && parsed.hostname.endsWith(".supabase.co")) {
        derivedSupabaseOrigin = `${parsed.protocol}//${parsed.host}`;
      }
      if (BLOCKED_REMOTE_IMAGE_HOSTS.has(parsed.hostname) || parsed.hostname.endsWith(".example.com")) {
        return null;
      }
    } catch {
      return null;
    }
    return input;
  }
  return toStoragePublicUrl(input);
}

function resolveThumbnail(row: Record<string, unknown> | null | undefined): string | null {
  if (!row) return null;
  const source = row as Record<string, unknown>;
  const candidates: Array<unknown> = [
    source?.thumbnail,
    source?.thumbnail_url,
    source?.thumbnailUrl,
    source?.thumbnail_path,
    source?.thumbnailPath,
    source?.main_image_url,
    source?.mainImageUrl,
  ];
  for (const value of candidates) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    const normalized = normalizeImageUrl(trimmed);
    if (normalized) return normalized;
  }
  return null;
}

function castString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(castString).filter(Boolean).join(", ");
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }
  return "";
}

function toStringArray(input: unknown): string[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map((entry) => castString(entry).trim()).filter(Boolean);
  }
  if (typeof input === "string") {
    return input
      .split(/[;,\n]+/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
}

function pickFirstNormalizedImage(...inputs: unknown[]): string | null {
  for (const input of inputs) {
    const candidates = toStringArray(input);
    for (const candidate of candidates) {
      const normalized = normalizeImageUrl(candidate);
      if (normalized) return normalized;
    }
  }
  return null;
}

function dedupe<T>(values: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const value of values) {
    const key = typeof value === "string" ? value : JSON.stringify(value);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

function mergeGallery(mainImage: string | null, extras: string[], fallback: string | null): string[] {
  const base = dedupe([mainImage, ...extras].filter(Boolean) as string[]);
  if (base.length) {
    return base;
  }
  return fallback ? [fallback] : [];
}

function normalizeAverageRating(input: number | null | undefined, fallback = 0): number {
  const raw = Number(input ?? fallback ?? 0);
  if (!Number.isFinite(raw)) return Number(fallback) || 0;
  let value = raw;
  if (value > 5 && value <= 100) {
    value = value / 20;
  }
  if (value < 0) value = 0;
  if (value > 5) value = 5;
  return Number(value.toFixed(2));
}

type AvailabilityCode = "InStock" | "OutOfStock" | "PreOrder";

function normalizeStatus(value: string | null | undefined): string {
  return (value ?? "").toString().toLowerCase();
}

function isPublishableSlug(slug: string | null | undefined): boolean {
  if (typeof slug !== "string") return false;
  const trimmed = slug.trim();
  if (!trimmed) return false;
  return !BLOCKED_SLUG_PATTERN.test(trimmed);
}

function isPublishableStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return ALLOWED_PUBLIC_STATUSES.has(status.toLowerCase());
}

function isPublishableDataset(dataset: "shop" | "legacy"): boolean {
  return dataset === PUBLIC_DATASET;
}

function canPublishProduct(args: { slug: string | null | undefined; title: string | null | undefined; dataset: "shop" | "legacy"; status: string | null | undefined }): boolean {
  const { slug, title, dataset, status } = args;
  return Boolean(title && isPublishableSlug(slug) && isPublishableDataset(dataset) && isPublishableStatus(status));
}

function mapInventoryToAvailability(
  inventoryStatus: string | null | undefined,
  status: string | null | undefined,
): AvailabilityCode {
  const inventory = normalizeStatus(inventoryStatus);
  const base = inventory || normalizeStatus(status);

  if (!base) return "InStock";
  if (["preorder", "pre_order", "pre-order", "coming_soon"].includes(base)) return "PreOrder";
  if (["out_of_stock", "unavailable", "sold_out", "inactive", "archived", "disabled", "discontinued"].includes(base)) {
    return "OutOfStock";
  }
  return "InStock";
}

function mapStatusToAvailability(status: string | null | undefined): AvailabilityCode {
  return mapInventoryToAvailability(null, status);
}

function formatLeadTimeDays(days: number | null | undefined): string | null {
  if (typeof days !== "number" || !Number.isFinite(days) || days <= 0) return null;
  const rounded = Math.max(1, Math.round(days));
  const mod10 = rounded % 10;
  const mod100 = rounded % 100;
  let suffix = "дней";
  if (mod10 === 1 && mod100 !== 11) {
    suffix = "день";
  } else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    suffix = "дня";
  }
  return `${rounded} ${suffix}`;
}

function buildSkuAvailabilityLabel(code: AvailabilityCode, leadTimeDays: number | null | undefined): string {
  const lead = formatLeadTimeDays(leadTimeDays);
  if (code === "OutOfStock") return "Нет в наличии";
  if (code === "PreOrder") return lead ? `Предзаказ • ${lead}` : "Предзаказ";
  return lead ? `В наличии • ${lead}` : "В наличии";
}

function normalizeSkuLabel(input: { title?: string | null; sku?: string | null; id?: string | null }): string {
  const title = castString(input.title ?? "").trim();
  if (title) return title;
  const sku = castString(input.sku ?? "").trim();
  if (sku) return sku;
  const id = castString(input.id ?? "").trim();
  return id ? `SKU ${id.slice(0, 8)}` : "SKU";
}

function ensureCurrency(currency: string | null | undefined, dataset: "shop" | "legacy"): string {
  const fallback = dataset === "legacy" ? "USD" : "EUR";
  const normalized = castString(currency).toUpperCase();
  return normalized || fallback;
}

function resolveAvailabilityLabel(status: string | null | undefined, fallbackEstimate: string | null): string {
  const normalized = (status ?? "").toLowerCase();
  if (normalized === "preorder" || normalized === "pre-order" || normalized === "pre_order" || normalized === "coming_soon") {
    return `Предзаказ • ${fallbackEstimate ?? "доставка уточняется"}`;
  }
  if (normalized === "out_of_stock" || normalized === "unavailable" || normalized === "sold_out" || normalized === "inactive") {
    return "Нет в наличии";
  }
  return `В наличии • ${fallbackEstimate ?? "2–4 дня"}`;
}

function parseRecentReviews(input: unknown): ProductReviewPreview[] {
  let source = input;
  if (typeof source === "string") {
    try {
      source = JSON.parse(source);
    } catch {
      source = [];
    }
  }
  if (!Array.isArray(source)) return [];
  return source
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const row = entry as Record<string, unknown>;
      const body = castString(row.body ?? row.content ?? "").trim();
      if (!body) return null;
      const ratingValue = typeof row.rating === "number" ? row.rating : Number(row.rating ?? row.score ?? 0);
      const createdAt = castString(row.created_at ?? row.createdAt ?? row.inserted_at ?? new Date().toISOString());
      const title = castString(row.title ?? row.headline ?? null) || null;
      const author = castString(row.author_label ?? row.author ?? row.reviewer ?? "");
      return {
        rating: normalizeAverageRating(ratingValue, 0),
        title,
        body,
        createdAt,
        authorLabel: author || "Customer",
      } satisfies ProductReviewPreview;
    })
    .filter((value): value is ProductReviewPreview => Boolean(value));
}

function normalizeTags(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.map((item) => castString(item).trim()).filter(Boolean);
  }
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      return normalizeTags(parsed);
    } catch {
      return toStringArray(input);
    }
  }
  if (typeof input === "object" && input !== null) {
    return Object.values(input as Record<string, unknown>)
      .map((value) => castString(value).trim())
      .filter(Boolean);
  }
  return [];
}

function parsePair(entry: unknown): { key: string; value: string } | null {
  if (!entry || typeof entry !== "object") return null;
  const record = entry as Record<string, unknown>;
  const key = castString(record.key ?? record.name ?? record.label).trim();
  const value = castString(record.value ?? record.val ?? record.data).trim();
  if (!key || !value) return null;
  return { key, value };
}

function parseSpecsPayload(source: unknown): { specs: ProductSpecsData; variants: ProductVariantGroup[]; brand: string | null; shippingEstimate: string | null } {
  const root = typeof source === "string" ? (() => { try { return JSON.parse(source); } catch { return {}; } })() : (source ?? {});
  const json = (root && typeof root === "object" ? (root as Record<string, unknown>) : {}) as Record<string, unknown>;

  const highlights = toStringArray(json.highlights ?? json.bullets ?? []);
  const attributes: Array<{ key: string; value: string }> = [];
  const rawAttributes = Array.isArray(json.attributes) ? json.attributes : Array.isArray(json.specs) ? json.specs : [];
  for (const entry of rawAttributes as unknown[]) {
    const pair = parsePair(entry);
    if (pair) attributes.push(pair);
  }

  const inTheBox = toStringArray(json.in_the_box ?? json.box ?? []);
  const warranty = toStringArray(json.warranty ?? json.guarantee ?? []);

  const cards: ProductSpecsCard[] = [];
  const rawCards = Array.isArray(json.cards) ? json.cards : [];
  for (const entry of rawCards as unknown[]) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const title = castString(record.title ?? record.name ?? "").trim();
    const items = toStringArray(record.items ?? record.values ?? []);
    if (title && items.length) {
      cards.push({ title, items });
    }
  }

  if (!cards.length) {
    if (inTheBox.length) cards.push({ title: "Что в коробке", items: inTheBox });
    if (warranty.length) cards.push({ title: "Гарантия и возврат", items: warranty });
  }

  const variants: ProductVariantGroup[] = [];
  const rawVariants = Array.isArray(json.variants) ? json.variants : [];
  for (const entry of rawVariants as unknown[]) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const id = castString(record.id ?? record.key ?? record.name).trim();
    const label = castString(record.label ?? record.name ?? id).trim() || id;
    const optionsSource = Array.isArray(record.options) ? record.options : [];
    const options: ProductVariantOption[] = [];
    for (const opt of optionsSource) {
      if (!opt || typeof opt !== "object") continue;
      const optRecord = opt as Record<string, unknown>;
      const value = castString(optRecord.value ?? optRecord.id ?? optRecord.slug).trim();
      if (!value) continue;
      const optionLabel = castString(optRecord.label ?? optRecord.name ?? value).trim() || value;
      const disabled = Boolean(optRecord.disabled ?? optRecord.inactive);
      const image = normalizeImageUrl(castString(optRecord.image ?? optRecord.image_url ?? "") || null);
      const priceDeltaRaw = typeof optRecord.price_delta === "number" ? optRecord.price_delta : Number(optRecord.price_delta ?? 0);
      options.push({
        value,
        label: optionLabel,
        disabled,
        image,
        priceDelta: Number.isFinite(priceDeltaRaw) ? priceDeltaRaw : null,
      });
    }
    if (!id || !options.length) continue;
    variants.push({ id, label, options });
  }

  const brand = castString(json.brand ?? json.maker ?? json.producer).trim() || null;
  const shippingEstimate = castString(json.shipping_estimate ?? json.delivery_estimate ?? json.eta).trim() || null;

  return {
    specs: {
      highlights,
      attributes,
      cards,
      inTheBox,
      warranty,
    },
    variants,
    brand,
    shippingEstimate,
  };
}

function mapRpcProduct(payload: Record<string, unknown>): ProductData | null {
  const row = (payload.product ?? payload) as Record<string, unknown>;
  const slug = castString(row.slug ?? row.product_slug ?? payload.slug ?? "").trim();
  const id = castString(row.id ?? row.product_id ?? payload.id ?? "").trim();
  if (!slug || !id) return null;

  const datasetSource = row?.dataset ?? (row as Record<string, unknown>)?.source_dataset ?? payload.dataset ?? PUBLIC_DATASET;
  const datasetValue = castString(datasetSource).toLowerCase();
  const dataset = (datasetValue === "legacy" ? "legacy" : PUBLIC_DATASET) as "shop" | "legacy";
  const statusSource =
    row?.status ?? (row as Record<string, unknown>)?.product_status ?? payload.status ?? "published";
  const status = normalizeStatus(castString(statusSource) || "published") || "published";
  const inventoryStatus =
    castString(
      (row as Record<string, unknown>).inventory_status ?? (payload as Record<string, unknown>).inventory_status ?? null,
    ).trim() || null;
  const catalogProductRaw =
    row.catalog_product_id ??
    (payload.product as Record<string, unknown> | undefined)?.catalog_product_id ??
    payload.catalog_product_id ??
    null;
  const catalogProductId = castString(catalogProductRaw).trim() || id || null;

  const priceInfo = resolvePriceDetails(row);
  const price = priceInfo.price;
  const priceCents = Number.isFinite(priceInfo.priceCents)
    ? priceInfo.priceCents
    : Math.round(price * 100);
  const currencyCandidate =
    resolveCurrency(row) ??
    castString(row.currency ?? row.price_currency ?? payload.currency ?? null);
  const currency = ensureCurrency(currencyCandidate || null, dataset);

  const specsPayload = payload.specs_payload ?? row.specs_payload ?? row.specs ?? payload.specs ?? null;
  const parsed = parseSpecsPayload(specsPayload);
  const techSpecs = normalizeProductTechSpecs(specsPayload ?? null);

  const gallerySources: string[] = [];
  gallerySources.push(...toStringArray(payload.gallery_urls ?? row.gallery_urls ?? row.gallery));
  gallerySources.push(...toStringArray(row.images ?? payload.images ?? []));
  gallerySources.push(castString(row.thumbnail_url ?? row.thumbnailUrl ?? payload.thumbnail_url ?? ""));
  gallerySources.push(castString(row.main_image_url ?? row.image_url ?? payload.main_image_url ?? ""));
  gallerySources.push(castString(row.image_path ?? payload.image_path ?? ""));
  const normalizedGallery = dedupe(
    gallerySources
      .map((value) => normalizeImageUrl(value))
      .filter((value): value is string => Boolean(value)),
  );

  const primaryImage = resolveThumbnail(row);
  const fallbackImage = normalizeImageUrl(castString(payload.fallback_image ?? row.fallback_image ?? "")) || null;
  const mainImage = primaryImage ?? normalizedGallery[0] ?? fallbackImage;
  const gallery = mergeGallery(mainImage, normalizedGallery.slice(1), fallbackImage);

  const metrics = ((payload.metrics ?? row.metrics) ?? {}) as Record<string, unknown>;
  const reviewSummarySource = (payload.review_summary ?? row.review_summary ?? metrics.review_summary) as Record<string, unknown> | undefined;
  const reviewSummary: ProductReviewSummary = {
    average: normalizeAverageRating(
      typeof reviewSummarySource?.average === "number"
        ? reviewSummarySource.average
        : Number(reviewSummarySource?.avg_rating ?? reviewSummarySource?.average ?? row.rating ?? 0),
      0,
    ),
    count: Number(reviewSummarySource?.count ?? reviewSummarySource?.review_count ?? row.review_count ?? 0) || 0,
  };

  const recentReviews = parseRecentReviews(payload.recent_reviews ?? row.recent_reviews ?? []);

  const tags = normalizeTags(row.tags ?? payload.tags ?? []);

  const clicks = Number(metrics.clicks ?? metrics.total_clicks ?? row.total_clicks ?? payload.total_clicks ?? payload.clicks ?? 0) || 0;
  const impressions = Number(metrics.impressions ?? metrics.total_impressions ?? row.total_impressions ?? payload.total_impressions ?? payload.impressions ?? 0) || 0;

  const categorySlug = castString(row.category_slug ?? payload.category_slug ?? null) || null;
  const categoryName =
    castString(
      payload.category_title ??
        row.category_title ??
        payload.category_name ??
        row.category_name ??
        (payload.category as any)?.title ??
        (payload.category as any)?.name ??
        (row.category as any)?.title ??
        (row.category as any)?.name ??
        "",
    ) || null;

  const shippingEstimate = parsed.shippingEstimate || castString(payload.shipping_estimate ?? row.shipping_estimate ?? null) || null;
  const brand =
    parsed.brand ??
    (castString(payload.brand ?? row.brand ?? payload.brand_name ?? row.brand_name ?? row.brand_slug ?? null) || null);

  const derivedPriceCents =
    typeof priceCents === "number" && Number.isFinite(priceCents)
      ? Math.round(priceCents)
      : Math.round(price * 100);

  const availabilityCode = mapInventoryToAvailability(inventoryStatus, status);
  const availabilityLabel = resolveAvailabilityLabel(status, shippingEstimate);

  const titleRaw = castString(row.title ?? row.name ?? payload.title ?? payload.product_title ?? "").trim();
  const resolvedTitle = titleRaw;
  if (
    !canPublishProduct({
      slug,
      title: resolvedTitle,
      dataset,
      status,
    })
  ) {
    return null;
  }

  return {
    id,
    slug,
    title: resolvedTitle,
    shortDescription:
      castString(row.short_desc ?? row.short_description ?? payload.short_desc ?? row.description ?? payload.description ?? null) || null,
    description: castString(row.description ?? row.long_description ?? payload.description ?? null) || null,
    price,
    priceCents: derivedPriceCents,
    originalPrice: priceInfo.originalPrice,
    originalPriceCents: priceInfo.originalPriceCents,
    discountPercent: priceInfo.discountPercent,
    discountAmountCents: priceInfo.discountAmountCents,
    currency,
    formattedPrice: formatCurrency(price, currency),
    gallery,
    mainImage,
    fallbackImage,
    dataset,
    status,
    sku: castString(row.sku ?? payload.sku ?? null) || null,
    skuOptions: [],
    defaultSkuId: null,
    category: { slug: categorySlug, name: categoryName },
    tags,
    specs: parsed.specs,
    techSpecs,
    variants: parsed.variants,
    shippingEstimate,
    availabilityLabel,
    availabilityCode,
    stockQuantity: null,
    isAvailable: null,
    inventoryStatus,
    reviewSummary,
    recentReviews,
    productUid: castString(payload.product_uid ?? row.product_uid ?? payload.uid ?? null) || null,
    brand,
    catalogProductId,
    clicks,
    impressions,
  };
}

const productCache = new Map<string, () => Promise<ProductData | null>>();

function getProductFetcher(slug: string) {
  let cached = productCache.get(slug);
  if (!cached) {
    cached = unstable_cache(
      async () => {
        const admin = getAdminClient();
        const { data, error } = await admin
          .from("catalog_products_v")
          .select("*")
          .eq("slug", slug)
          .eq("status", "published")
          .maybeSingle();
        if (error || !data) {
          return null;
        }
        const product = mapRpcProduct(data as Record<string, unknown>);
        if (!product) return null;

        if (!product.mainImage || product.gallery.length === 0) {
          try {
            const lookupId = product.catalogProductId ?? product.id;
            if (lookupId) {
              const { data: skuRows, error: skuError } = await admin
                .from("ecom_products")
                .select("images, main_image_url, image_path, created_at")
                .eq("catalog_product_id", lookupId)
                .order("created_at", { ascending: false, nullsFirst: false })
                .limit(1);
              const skuRow =
                !skuError && Array.isArray(skuRows) && skuRows.length
                  ? (skuRows[0] as Record<string, unknown>)
                  : null;
              if (skuRow) {
                const fallback = pickFirstNormalizedImage(
                  skuRow.images,
                  skuRow.main_image_url,
                  skuRow.image_path,
                );
                if (fallback) {
                  const base = product.mainImage || fallback;
                  product.mainImage = base;
                  product.gallery = mergeGallery(base, product.gallery ?? [], product.fallbackImage);
                }
              }
            }
          } catch {
            // ignore fallback failures
          }
        }

        if (product.catalogProductId) {
          const { data: skuRows, error: skuError } = await admin
            .from("ecom_products")
            .select("id, sku, title, price, price_cents, currency, is_available, inventory_status, stock_quantity")
            .eq("catalog_product_id", product.catalogProductId);

          if (!skuError && Array.isArray(skuRows) && skuRows.length) {
            const skuIds = skuRows.map((row) => String((row as any).id)).filter(Boolean);
            let leadTimeMap = new Map<string, number>();
            if (skuIds.length) {
              const { data: leadRows, error: leadError } = await admin
                .from("supplier_skus")
                .select("sku_id, lead_time_days")
                .in("sku_id", skuIds);
              if (!leadError && Array.isArray(leadRows)) {
                leadTimeMap = new Map();
                for (const row of leadRows) {
                  if (!row?.sku_id) continue;
                  const skuId = String((row as any).sku_id);
                  const lead = Number((row as any).lead_time_days);
                  if (!Number.isFinite(lead)) continue;
                  const prev = leadTimeMap.get(skuId);
                  if (typeof prev !== "number" || lead < prev) {
                    leadTimeMap.set(skuId, lead);
                  }
                }
              }
            }

            const skuOptions: ProductSkuOption[] = skuRows
              .map((row) => {
                const id = String((row as any).id ?? "");
                if (!id) return null;
                const priceCentsRaw =
                  typeof (row as any).price_cents === "number"
                    ? (row as any).price_cents
                    : Number((row as any).price_cents ?? NaN);
                const priceRaw =
                  typeof (row as any).price === "number"
                    ? (row as any).price
                    : Number((row as any).price ?? NaN);
                const priceCents = Number.isFinite(priceCentsRaw)
                  ? Math.round(priceCentsRaw)
                  : Number.isFinite(priceRaw)
                    ? Math.round(priceRaw * 100)
                    : 0;
                const price = Number.isFinite(priceRaw) ? priceRaw : priceCents / 100;
                const currency = ensureCurrency(castString((row as any).currency ?? null), PUBLIC_DATASET);
                const isAvailable = typeof (row as any).is_available === "boolean" ? (row as any).is_available : null;
                const inventoryStatus =
                  castString((row as any).inventory_status ?? null).trim() || null;
                const stockQuantity =
                  typeof (row as any).stock_quantity === "number"
                    ? (row as any).stock_quantity
                    : Number.isFinite(Number((row as any).stock_quantity))
                      ? Number((row as any).stock_quantity)
                      : null;

                const availabilityCode = mapInventoryToAvailability(
                  inventoryStatus,
                  isAvailable === false ? "out_of_stock" : null,
                );
                const leadTimeDays =
                  leadTimeMap.has(id) && Number.isFinite(leadTimeMap.get(id) as number)
                    ? (leadTimeMap.get(id) as number)
                    : null;
                const availabilityLabel = buildSkuAvailabilityLabel(availabilityCode, leadTimeDays);

                return {
                  id,
                  label: normalizeSkuLabel({ title: (row as any).title, sku: (row as any).sku, id }),
                  price,
                  priceCents,
                  currency,
                  availabilityCode,
                  availabilityLabel,
                  stockQuantity,
                  isAvailable,
                  inventoryStatus,
                  leadTimeDays,
                } satisfies ProductSkuOption;
              })
              .filter((row): row is ProductSkuOption => Boolean(row?.id));

            skuOptions.sort((a, b) => a.price - b.price);
            product.skuOptions = skuOptions;
            const defaultSku =
              skuOptions.find((sku) => sku.availabilityCode === "InStock") ?? skuOptions[0] ?? null;
            product.defaultSkuId = defaultSku?.id ?? null;
          }
        }

        return product;
      },
      ["product-page", slug],
      {
        revalidate: PRODUCT_PAGE_REVALIDATE_SECONDS,
        tags: [PRODUCT_COLLECTION_TAG, productTag(slug)],
      },
    );
    productCache.set(slug, cached);
  }
  return cached;
}

export async function fetchProduct(slug: string): Promise<ProductData | null> {
  if (!slug) return null;
  const product = await getProductFetcher(slug)();
  if (!product) return null;

  if (product.priceCents == null) {
    product.priceCents = Math.round(product.price * 100);
  }

  if (process.env.NODE_ENV !== "production") {
    try {
      console.debug("product:image", {
        id: product.id,
        slug: product.slug,
        image: product.mainImage,
        source: "catalog_products_v",
      });
    } catch (debugError) {
      console.warn("[catalog] debug logging failed", debugError);
    }
  }

  return product;
}

function formatViewPrice(price: number | string | null | undefined, currency: string | null | undefined): string {
  const numeric = Number(price ?? 0);
  const priceValue = Number.isFinite(numeric) ? numeric : 0;
  const cur = castString(currency).toUpperCase() || "EUR";
  return formatCurrency(priceValue, cur);
}

export async function fetchSimilarProducts(
  categorySlug: string | null,
  excludeId: string,
  limit = 8,
): Promise<ProductGridItem[]> {
  const slug = categorySlug?.trim();
  if (!slug) return [];
  const admin = getAdminClient();
  try {
    const { data, error } = await admin
      .from("catalog_products_v")
      .select("id, slug, title, description, price, currency, thumbnail_url, status, category_slug")
      .eq("category_slug", slug)
      .neq("id", excludeId)
      .eq("status", "published")
      .order("created_at", { ascending: false, nullsFirst: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map((row) => {
      const image = resolveThumbnail(row) ?? normalizeImageUrl(row.thumbnail_url) ?? null;
      return {
        id: String(row.id ?? ""),
        slug: String(row.slug ?? ""),
        title: String(row.title ?? ""),
        subtitle: row.description ? String(row.description) : undefined,
        price: formatViewPrice(row.price, row.currency),
        meta: null,
        image,
      } satisfies ProductGridItem;
    });
  } catch {
    return [];
  }
}

export async function fetchProductsBySlugs(slugs: string[], limit = 12): Promise<ProductGridItem[]> {
  const unique = Array.from(new Set((slugs || []).filter(Boolean))).slice(0, limit);
  if (!unique.length) return [];
  const admin = getAdminClient();
  try {
    const { data, error } = await admin
      .from("catalog_products_v")
      .select("id, slug, title, description, price, currency, thumbnail_url, status")
      .in("slug", unique)
      .eq("status", "published");
    if (error || !data) return [];
    const bySlug = new Map<string, ProductGridItem>();
    for (const row of data) {
      const slug = String(row.slug ?? "");
      if (!slug) continue;
      const image = resolveThumbnail(row) ?? normalizeImageUrl(row.thumbnail_url) ?? null;
      bySlug.set(slug, {
        id: String(row.id ?? ""),
        slug,
        title: String(row.title ?? ""),
        subtitle: row.description ? String(row.description) : undefined,
        price: formatViewPrice(row.price, row.currency),
        meta: null,
        image,
      });
    }
    const ordered: ProductGridItem[] = [];
    for (const slug of unique) {
      const item = bySlug.get(slug);
      if (item) ordered.push(item);
    }
    return ordered;
  } catch {
    return [];
  }
}
