import { unstable_cache } from "next/cache";
import { getAdminClient } from "@/utils/supabase/admin";
import { getFallbackImageByKey } from "./fallback-images";
import { normalizeImageUrl } from "./[slug]/data";
import type { Product } from "./types";
import { formatCurrency } from "./currency";
import { resolveCurrency, resolvePriceDetails } from "./price-utils";

export type CategorySummary = { slug: string; label: string; count: number };

export const CATALOG_NAME = "Neon Shop Product Catalog";
export const PRODUCT_LIST_REVALIDATE_SECONDS = 1;
const PRODUCT_COLLECTION_TAG = "products:list";
const CATEGORY_TAG_PREFIX = "category:";

const NEW_WINDOW_MS = 1000 * 60 * 60 * 24 * 14;
const TOP_LIMIT = 6;
const DEFAULT_LIST_LIMIT = 240;
const DEFAULT_CURRENCY = "EUR";

export type ProductFilters = {
  query?: string;
  category?: string;
  dataset?: "all" | "shop" | "legacy";
  priceMin?: number | null;
  priceMax?: number | null;
  minRating?: number | null;
  sort?: "recent" | "popular" | "price-asc" | "price-desc" | "impressions";
};

function categoryTag(slug: string) {
  return `${CATEGORY_TAG_PREFIX}${slug}`;
}

function humanizeSlug(value: string): string {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildStructuredData(products: Product[]) {
  const rawOrigin = process.env.NEXT_SITE_URL ?? "";
  const base = rawOrigin.replace(/\/$/, "");
  const hasBase = base.length > 0;
  const listUrl = hasBase ? `${base}/products` : "/products";

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: CATALOG_NAME,
    url: listUrl,
    itemListElement: products.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: hasBase ? `${base}/products/${product.slug}` : `/products/${product.slug}`,
      name: product.title,
      image: product.mainImage ?? undefined,
      offers: {
        "@type": "Offer",
        priceCurrency: product.currency || "EUR",
        price: Number.isFinite(product.price) ? product.price.toFixed(2) : "0.00",
        availability: `https://schema.org/${product.availability}`,
      },
    })),
  } satisfies Record<string, unknown>;
}

type NormalizedCachePayload = {
  query: string;
  category: string;
  dataset: "all" | "shop" | "legacy";
  priceMin: number | null;
  priceMax: number | null;
  minRating: number | null;
  sort: "recent" | "popular" | "price-asc" | "price-desc" | "impressions";
};

function normalizeFilters(filters: ProductFilters = {}): ProductFilters {
  const normalized: ProductFilters = {};

  const trimmedQuery = filters.query?.trim();
  if (trimmedQuery) normalized.query = trimmedQuery;

  const category = filters.category?.trim();
  if (category && category !== "all") normalized.category = category;

  normalized.dataset = filters.dataset === "legacy" ? "legacy" : filters.dataset === "shop" ? "shop" : "all";

  if (typeof filters.priceMin === "number" && Number.isFinite(filters.priceMin) && filters.priceMin >= 0) {
    normalized.priceMin = Math.max(0, Math.round(filters.priceMin * 100) / 100);
  }

  if (typeof filters.priceMax === "number" && Number.isFinite(filters.priceMax) && filters.priceMax >= 0) {
    normalized.priceMax = Math.max(0, Math.round(filters.priceMax * 100) / 100);
  }

  if (
    normalized.priceMin != null &&
    normalized.priceMax != null &&
    normalized.priceMax < normalized.priceMin
  ) {
    normalized.priceMax = normalized.priceMin;
  }

  if (typeof filters.minRating === "number" && Number.isFinite(filters.minRating)) {
    const rating = filters.minRating;
    if (rating >= 4.5) normalized.minRating = 4.5;
    else if (rating >= 4) normalized.minRating = 4;
    else if (rating >= 3) normalized.minRating = 3;
  }

  normalized.sort = filters.sort ?? "recent";

  return normalized;
}

function buildCachePayload(filters: ProductFilters): NormalizedCachePayload {
  return {
    query: filters.query ?? "",
    category: filters.category ?? "",
    dataset: filters.dataset ?? "all",
    priceMin: typeof filters.priceMin === "number" ? filters.priceMin : null,
    priceMax: typeof filters.priceMax === "number" ? filters.priceMax : null,
    minRating: typeof filters.minRating === "number" ? filters.minRating : null,
    sort: filters.sort ?? "recent",
  };
}

async function loadProductsDataInternal(filters: ProductFilters = {}): Promise<{
  products: Product[];
  fetchError: unknown;
  structuredData: Record<string, unknown> | null;
  categories: CategorySummary[];
  catalogName: string;
  totalCount: number;
}> {
  const supabase = getAdminClient();
  const appliedSort = filters.sort ?? "recent";

  let query = supabase
    .from("product_with_discount_public")
    .select(
      "id, sku, name, slug, basePriceCents, effectivePriceCents, hasDiscount, currency, category_slug, rating, created_at, thumbnail, thumbnail_path",
      { count: "exact" },
    )
    .limit(DEFAULT_LIST_LIMIT);

  const trimmedQuery = filters.query?.trim();
  if (trimmedQuery) {
    const pattern = `%${trimmedQuery.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
    query = query.or(`name.ilike.${pattern},slug.ilike.${pattern}`);
  }

  if (filters.category && filters.category !== "all") {
    query = query.eq("category_slug", filters.category);
  }

  if (typeof filters.priceMin === "number" && Number.isFinite(filters.priceMin) && filters.priceMin >= 0) {
    query = query.gte("effectivePriceCents", Math.round(filters.priceMin * 100));
  }

  if (typeof filters.priceMax === "number" && Number.isFinite(filters.priceMax) && filters.priceMax >= 0) {
    query = query.lte("effectivePriceCents", Math.round(filters.priceMax * 100));
  }

  if (typeof filters.minRating === "number" && Number.isFinite(filters.minRating) && filters.minRating > 0) {
    query = query.gte("rating", filters.minRating);
  }

  switch (appliedSort) {
    case "popular":
      query = query
        .order("rating", { ascending: false, nullsFirst: true })
        .order("created_at", { ascending: false, nullsFirst: false });
      break;
    case "price-asc":
      query = query.order("effectivePriceCents", { ascending: true, nullsFirst: false });
      break;
    case "price-desc":
      query = query.order("effectivePriceCents", { ascending: false, nullsFirst: false });
      break;
    case "impressions":
      query = query.order("created_at", { ascending: false, nullsFirst: false });
      break;
    case "recent":
    default:
      query = query.order("created_at", { ascending: false, nullsFirst: false });
      break;
  }

  const { data, error, count } = await query;

  if (error || !Array.isArray(data)) {
    return {
      products: [],
      fetchError: error,
      structuredData: null,
      categories: [],
      catalogName: CATALOG_NAME,
      totalCount: 0,
    };
  }

  const now = Date.now();

  const products: Product[] = data.map((row: any, index) => {
    const id = row?.id != null ? String(row.id) : "";
    const slug = row?.slug != null ? String(row.slug) : "";
    const titleSource = row?.title ?? row?.name ?? "";
    const title = titleSource != null ? String(titleSource) : "";
    const createdAtRaw = row?.created_at ?? row?.createdAt ?? null;
    const createdAt = typeof createdAtRaw === "string" ? createdAtRaw : null;
    const createdTime = createdAt ? Date.parse(createdAt) : NaN;
    const isNew = Number.isFinite(createdTime) ? createdTime >= now - NEW_WINDOW_MS : index < TOP_LIMIT;

    const priceDetails = resolvePriceDetails(row as Record<string, unknown>);
    const currencyResolved = resolveCurrency(row as Record<string, unknown>);
    const normalizedPrice = priceDetails.price;
    const normalizedPriceCents = Number.isFinite(priceDetails.priceCents)
      ? priceDetails.priceCents
      : Math.round(normalizedPrice * 100);
    const currencyRaw = (currencyResolved ?? DEFAULT_CURRENCY).toUpperCase();
    const thumbnailPath = (() => {   
         if (typeof row?.thumbnail === "string" && row.thumbnail.trim()) return row.thumbnail.trim();  
             if (typeof row?.thumbnail_path === "string" && row.thumbnail_path.trim())
               return row.thumbnail_path.trim();
            return null;   
           })
            ();
    const fallbackKey = slug || id || String(index);
    const mainImage = thumbnailPath? normalizeImageUrl(thumbnailPath) ?? getFallbackImageByKey(fallbackKey) : getFallbackImageByKey(fallbackKey);
    const rating =
      typeof row?.rating === "number" && Number.isFinite(row.rating) ? Number(row.rating) : null;
    const categorySlug = (() => {
      const value =
        (typeof row?.category_slug === "string" && row.category_slug.trim()
          ? row.category_slug
          : typeof (row as Record<string, unknown>)?.categorySlug === "string"
            ? (row as Record<string, unknown>).categorySlug
            : null) ?? null;
      if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed ? trimmed : null;
      }
      return null;
    })();

    return {
      id,
      slug,
      title,
      description: typeof row?.description === "string" ? row.description : null,
      price: normalizedPrice,
      priceCents: normalizedPriceCents,
      originalPrice: priceDetails.originalPrice,
      originalPriceCents: priceDetails.originalPriceCents,
      discountPercent: priceDetails.discountPercent,
      discountAmountCents: priceDetails.discountAmountCents,
      currency: currencyRaw,
      mainImage,
      thumbnailPath,
      rating,
      clicks: 0,
      impressions: 0,
      dataset: "shop",
      order: index,
      createdAt,
      isNew,
      isTop: false,
      availability: "InStock",
      categorySlug,
    } satisfies Product;
  });

  // Mark top products by recency for now.
  for (let i = 0; i < Math.min(TOP_LIMIT, products.length); i += 1) {
    products[i].isTop = true;
  }

  const filteredProducts = filters.dataset && filters.dataset !== "all"
    ? products.filter((product) => product.dataset === filters.dataset)
    : products;

  const categories = (() => {
    const counts = new Map<string, { label: string; count: number }>();
    for (const product of filteredProducts) {
      const slug = product.categorySlug;
      if (!slug) continue;
      const label = humanizeSlug(slug);
      const existing = counts.get(slug);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(slug, { label, count: 1 });
      }
    }
    return Array.from(counts.entries())
      .map(([slug, value]) => ({ slug, label: value.label, count: value.count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  })();

  const structuredData = buildStructuredData(filteredProducts);

  if (process.env.NODE_ENV !== "production") {
    try {
      for (const p of products) {
        console.debug("catalog:image", {
          id: p.id,
          sku: p.slug,
          slug: p.slug,
          image: p.mainImage,
          source: "product_with_discount_public",
        });
      }
    } catch {
      // no-op debug hook
    }
  }

  return {
    products: filteredProducts,
    fetchError: null,
    structuredData,
    categories,
    catalogName: CATALOG_NAME,
    totalCount:
      filters.dataset && filters.dataset !== "all"
        ? filteredProducts.length
        : typeof count === "number"
          ? count
          : filteredProducts.length,
  };
}

export async function loadProductsData(filters: ProductFilters = {}) {
  const normalized = normalizeFilters(filters);
  const payload = buildCachePayload(normalized);
  const key = JSON.stringify(payload);
  const result = await loadProductsDataCached(key);
  return result;
}

const loadProductsDataCached = unstable_cache(
  async (key: string) => {
    const parsed = JSON.parse(key) as NormalizedCachePayload;
    const normalized: ProductFilters = {
      dataset: parsed.dataset,
      sort: parsed.sort,
    };
    if (parsed.query) normalized.query = parsed.query;
    if (parsed.category) normalized.category = parsed.category;
    if (parsed.priceMin != null) normalized.priceMin = parsed.priceMin;
    if (parsed.priceMax != null) normalized.priceMax = parsed.priceMax;
    if (parsed.minRating != null) normalized.minRating = parsed.minRating;
    return loadProductsDataInternal(normalized);
  },
  ["products:list:data"],
  {
    revalidate: PRODUCT_LIST_REVALIDATE_SECONDS,
    tags: [PRODUCT_COLLECTION_TAG],
  },
);

export function formatPrice(priceCents: number | null | undefined, currency: string | null | undefined): string {
  const price = Number(priceCents ?? 0) / 100;
  const cur = (currency ?? "EUR").toUpperCase();
  return formatCurrency(price, cur);
}








