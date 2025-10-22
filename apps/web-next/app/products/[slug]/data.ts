import { unstable_cache } from "next/cache";
import { getAdminClient } from "@/utils/supabase/admin";
import type { ProductGridItem } from "@/components/ProductGrid";
import { getFallbackImageByKey } from "../fallback-images";

const PRODUCT_IMAGE_BUCKET = process.env.SUPABASE_PRODUCT_BUCKET?.trim() || "product-images";
const SUPABASE_ORIGIN = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");

export const PRODUCT_PAGE_REVALIDATE_SECONDS = 90;
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
  currency: string;
  formattedPrice: string;
  gallery: string[];
  mainImage: string;
  fallbackImage: string;
  dataset: "shop" | "legacy";
  status: string;
  sku?: string | null;
  category: { slug: string | null; name: string | null };
  tags: string[];
  specs: ProductSpecsData;
  variants: ProductVariantGroup[];
  shippingEstimate: string | null;
  availabilityLabel: string;
  reviewSummary: ProductReviewSummary;
  recentReviews: ProductReviewPreview[];
  productUid: string | null;
  brand: string | null;
  clicks: number;
  impressions: number;
};

function toStoragePublicUrl(path: string | null | undefined): string | null {
  if (!path || !SUPABASE_ORIGIN) return null;
  const normalized = path.replace(/^\/+/, "");
  const encodedPath = normalized
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
  return `${SUPABASE_ORIGIN}/storage/v1/object/public/${encodeURIComponent(PRODUCT_IMAGE_BUCKET)}/${encodedPath}`;
}

export function normalizeImageUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  if (/^https?:/i.test(input)) return input;
  return toStoragePublicUrl(input);
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

function mergeGallery(mainImage: string | null, extras: string[], fallback: string): string[] {
  const list = [mainImage, ...extras, fallback].filter(Boolean) as string[];
  return dedupe(list);
}

const FALLBACK_LOCALE = "ru-RU";

export function formatCurrency(value: number, currency = "EUR", locale = FALLBACK_LOCALE): string {
  try {
    return new Intl.NumberFormat(locale || FALLBACK_LOCALE, {
      style: "currency",
      currency: currency || "EUR",
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 2,
    }).format(value ?? 0);
  } catch {
    return `${value?.toFixed?.(2) ?? "0.00"} ${currency || "EUR"}`;
  }
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

function mapStatusToAvailability(status: string | null | undefined): "InStock" | "OutOfStock" | "PreOrder" {
  if (!status) return "InStock";
  const normalized = status.toLowerCase();
  if (["sold_out", "out_of_stock", "inactive", "archived", "disabled"].includes(normalized)) {
    return "OutOfStock";
  }
  if (["preorder", "pre_order", "pre-order", "coming_soon"].includes(normalized)) {
    return "PreOrder";
  }
  return "InStock";
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

  const dataset = (castString(row.dataset ?? row.source_dataset).toLowerCase() === "legacy" ? "legacy" : "shop") as "shop" | "legacy";
  const status = castString(row.status ?? row.product_status ?? payload.status ?? "active").trim() || "active";

  const priceCents = typeof row.price_cents === "number" ? row.price_cents : Number(row.price_cents ?? payload.price_cents ?? 0);
  const priceRaw = typeof row.price === "number" ? row.price : Number(row.price ?? payload.price ?? 0);
  const price = Number.isFinite(priceRaw) && priceRaw > 0 ? priceRaw : Number.isFinite(priceCents) ? priceCents / 100 : 0;
  const currency = ensureCurrency(castString(row.currency ?? row.price_currency ?? payload.currency ?? null) || null, dataset);

  const specsPayload = payload.specs_payload ?? row.specs_payload ?? row.specs ?? payload.specs ?? null;
  const parsed = parseSpecsPayload(specsPayload);

  const gallerySources: string[] = [];
  gallerySources.push(...toStringArray(payload.gallery_urls ?? row.gallery_urls ?? row.gallery));
  gallerySources.push(castString(row.main_image_url ?? row.image_url ?? payload.main_image_url ?? ""));
  gallerySources.push(castString(row.image_path ?? payload.image_path ?? ""));
  const normalizedGallery = dedupe(
    gallerySources
      .map((value) => normalizeImageUrl(value))
      .filter((value): value is string => Boolean(value)),
  );

  const fallbackImage = normalizeImageUrl(castString(payload.fallback_image ?? row.fallback_image ?? "")) || getFallbackImageByKey(id);
  const mainImage = normalizedGallery[0] ?? fallbackImage;
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
  const categoryName = castString(payload.category_name ?? row.category_name ?? (payload.category as any)?.name ?? (row.category as any)?.name ?? "") || null;

  const shippingEstimate = parsed.shippingEstimate || castString(payload.shipping_estimate ?? row.shipping_estimate ?? null) || null;
  const brand = parsed.brand ?? (castString(payload.brand ?? row.brand ?? null) || null);

  return {
    id,
    slug,
    title: castString(row.title ?? row.name ?? payload.title ?? "Untitled product") || "Untitled product",
    shortDescription: castString(row.short_desc ?? row.short_description ?? payload.short_desc ?? null) || null,
    description: castString(row.description ?? row.long_description ?? payload.description ?? null) || null,
    price,
    currency,
    formattedPrice: formatCurrency(price, currency),
    gallery,
    mainImage,
    fallbackImage,
    dataset,
    status,
    sku: castString(row.sku ?? payload.sku ?? null) || null,
    category: { slug: categorySlug, name: categoryName },
    tags,
    specs: parsed.specs,
    variants: parsed.variants,
    shippingEstimate,
    availabilityLabel: resolveAvailabilityLabel(status, shippingEstimate),
    reviewSummary,
    recentReviews,
    productUid: castString(payload.product_uid ?? row.product_uid ?? payload.uid ?? null) || null,
    brand,
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
        const { data, error } = await admin.rpc("get_product_page", { _slug: slug }).maybeSingle();
        if (error || !data) {
          return null;
        }
        return mapRpcProduct(data as Record<string, unknown>);
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
  return product;
}

function formatViewPrice(priceCents: number | null | undefined, currency: string | null | undefined): string {
  const price = Number(priceCents ?? 0) / 100;
  const cur = castString(currency).toUpperCase() || "EUR";
  return formatCurrency(price, cur);
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
      .from("products")
      .select("id, slug, title, description, price_cents, currency, main_image_url, status, rating")
      .eq("category_slug", slug)
      .neq("id", excludeId)
      .in("status", ["active", "published"])
      .order("rating", { ascending: false, nullsFirst: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map((row) => {
      const image = normalizeImageUrl(row.main_image_url) ?? getFallbackImageByKey(row.id ?? "");
      const meta = typeof row.rating === "number" && Number.isFinite(row.rating) ? `★ ${row.rating.toFixed(1)}` : null;
      return {
        id: String(row.id ?? ""),
        slug: String(row.slug ?? ""),
        title: String(row.title ?? ""),
        subtitle: row.description ? String(row.description) : undefined,
        price: formatViewPrice(row.price_cents, row.currency),
        meta,
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
      .from("products")
      .select("id, slug, title, description, price_cents, currency, main_image_url, status, rating")
      .in("slug", unique)
      .in("status", ["active", "published"]);
    if (error || !data) return [];
    const bySlug = new Map<string, ProductGridItem>();
    for (const row of data) {
      const slug = String(row.slug ?? "");
      if (!slug) continue;
      const image = normalizeImageUrl(row.main_image_url) ?? getFallbackImageByKey(row.id ?? "");
      const meta = typeof row.rating === "number" && Number.isFinite(row.rating) ? `★ ${row.rating.toFixed(1)}` : null;
      bySlug.set(slug, {
        id: String(row.id ?? ""),
        slug,
        title: String(row.title ?? ""),
        subtitle: row.description ? String(row.description) : undefined,
        price: formatViewPrice(row.price_cents, row.currency),
        meta,
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
