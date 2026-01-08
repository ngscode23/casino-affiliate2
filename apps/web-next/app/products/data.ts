import "server-only";
import { unstable_cache } from "next/cache";
import { createClient as createSupabaseClient, type PostgrestError, type SupabaseClient } from "@supabase/supabase-js";
import { applyPersonalizedRanking, type UserProfile } from "@/lib/personalization/rank";
import { fetchProductListingPage, type ProductListFilters } from "@/lib/catalog/product-source";
import { mapDbProduct, type DbProductRow } from "@/lib/catalog/mapDbProduct";
import type { Product } from "./types";
import { formatCurrency } from "./currency";
import { createSupabaseFetchLogger } from "@/utils/supabase/fetch-logger";
import { getAdminClient } from "@/utils/supabase/admin";
import { normalizeBrandSlug, brandLabelFromSlug } from "./taxonomy";
import { normalizeProductFilters, type ProductFilters } from "./filter-schema";
import { logDebug } from "@/utils/debug-logger";

export type CategorySummary = { slug: string; label: string; count: number };
export type TaxonomyFacet = { value: string; label: string; count: number };
export type ModelFacetMap = Record<string, TaxonomyFacet[]>;

export const CATALOG_NAME = "Neon Shop Product Catalog";
export const PRODUCT_LIST_REVALIDATE_SECONDS = 180;
export const PRODUCT_COLLECTION_TAG = "products:list";
const CATEGORY_TAG_PREFIX = "category:";
const BRAND_TAG_PREFIX = "brand:";

const NEW_WINDOW_MS = 1000 * 60 * 60 * 24 * 14;
const TOP_LIMIT = 6;
const PRODUCT_FETCH_CHUNK = Math.max(50, Number(process.env.NEXT_PRODUCTS_FETCH_CHUNK ?? 250) || 250);
const PRODUCT_FETCH_HARD_CAP = Math.max(
  PRODUCT_FETCH_CHUNK,
  Number(process.env.NEXT_PRODUCTS_FETCH_HARD_CAP ?? 1500) || 1500,
);
export const PRODUCT_PAGE_SIZE_DEFAULT = 24;
export const PRODUCT_PAGE_HARD_CAP = 200;

const CATALOG_FETCH = createSupabaseFetchLogger("catalog-public", console.info, {
  retries: 2,
  baseDelayMs: 250,
});

let catalogSupabase: SupabaseClient | null = null;
function getCatalogClient(): SupabaseClient {
  if (!catalogSupabase) {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE ||
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_SECRET;

    if (!url || !key) {
      throw new Error("Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for catalog client");
    }
    catalogSupabase = createSupabaseClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        fetch: CATALOG_FETCH,
      },
    });
  }
  return catalogSupabase;
}

export type { ProductFilters } from "./filter-schema";

export type LoadProductsOptions = {
  limit?: number;
  cursor?: number;
  personalize?: {
    profile?: UserProfile | null;
    country?: string;
    device?: string;
    experimentVariant?: string | null;
  };
};

export function categoryTag(slug: string) {
  return `${CATEGORY_TAG_PREFIX}${slug}`;
}

export function brandTag(slug: string) {
  return `${BRAND_TAG_PREFIX}${slug}`;
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


function filterProductsByTaxonomy(
  products: Product[],
  filters: ProductFilters,
  brandCatalogIds?: Set<string>,
): Product[] {
  const brandSelection = filters.brand ?? "all";
  const normalizedModelSelection =
    filters.model && filters.model !== "all" ? normalizeTaxonomyValue(filters.model) : null;

  return products.filter((product) => {
    // dataset filter
    if (filters.dataset && filters.dataset !== "all" && product.dataset !== filters.dataset) {
      return false;
    }

    if (brandSelection && brandSelection !== "all") {
      const normalizedSelection = normalizeBrandSlug(brandSelection);
      let matchesByMeta = false;
      if (normalizedSelection) {
        const candidates = [product.brand, product.brandSlug, product.brandName]
          .map((value) => (typeof value === "string" ? normalizeBrandSlug(value) : null))
          .filter(Boolean) as string[];
        matchesByMeta = normalizedSelection === "unbranded" ? candidates.length === 0 : candidates.includes(normalizedSelection);
        if (!matchesByMeta && brandCatalogIds && brandCatalogIds.size > 0 && typeof product.catalogProductId === "string") {
          matchesByMeta = brandCatalogIds.has(product.catalogProductId);
        }
      }
      if (!matchesByMeta) {
        return false;
      }
    }

    if (normalizedModelSelection) {
      const candidates = [
        product.modelSlug,
        product.model,
        product.modelTitle,
        product.catalogProductId, // allow direct catalog product id match
      ]
        .map((value) => normalizeTaxonomyValue(typeof value === "string" ? value : null))
        .filter(Boolean) as string[];

      if (!candidates.includes(normalizedModelSelection)) {
        return false;
      }
    }

    return true;
  });
}


function summarizeCategories(products: Product[]): CategorySummary[] {
  const counts = new Map<string, { label: string; count: number }>();
  for (const product of products) {
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
}

function normalizeTaxonomyValue(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  return trimmed.replace(/\s+/g, "-");
}

function taxonomyLabelFromValue(value: string | null | undefined): string {
  if (!value) return "Unknown";
  return humanizeSlug(value.replace(/\//g, " "));
}

function buildBrandFacets(products: Product[]): TaxonomyFacet[] {
  const counts = new Map<string, { count: number; label: string }>();

  for (const product of products) {
    const brandKey = normalizeBrandSlug(product.brandSlug ?? product.brand ?? product.brandName) ?? "unbranded";
    const label =
      brandKey === "unbranded"
        ? "Unbranded"
        : brandLabelFromSlug(brandKey, product.brandName ?? product.brand ?? undefined);
    const existing = counts.get(brandKey);
    counts.set(brandKey, {
      count: (existing?.count ?? 0) + 1,
      label: existing?.label ?? label,
    });
  }

  return Array.from(counts.entries())
    .map(([value, entry]) => ({ value, label: entry.label || taxonomyLabelFromValue(value), count: entry.count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function buildModelFacets(products: Product[]): ModelFacetMap {
  const bucket = new Map<string, Map<string, { count: number; label: string }>>();

  for (const product of products) {
    const brandKey = normalizeBrandSlug(product.brandSlug ?? product.brand ?? product.brandName) ?? "unbranded";
    const modelKey = normalizeTaxonomyValue(
      product.modelSlug ?? product.model ?? product.modelTitle?.toLowerCase().replace(/\s+/g, "-"),
    );
    if (!modelKey) continue;
    const modelLabel = product.modelTitle?.trim() || taxonomyLabelFromValue(modelKey);

    const brandBucket = bucket.get(brandKey) ?? new Map<string, { count: number; label: string }>();
    const existing = brandBucket.get(modelKey);
    brandBucket.set(modelKey, {
      count: (existing?.count ?? 0) + 1,
      label: existing?.label ?? modelLabel,
    });
    bucket.set(brandKey, brandBucket);
  }

  const result: ModelFacetMap = {};
  for (const [brandKey, models] of bucket.entries()) {
    result[brandKey] = Array.from(models.entries())
      .map(([value, entry]) => ({
        value,
        label: entry.label || taxonomyLabelFromValue(value),
        count: entry.count,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }
  return result;
}

type NormalizedCachePayload = {
  query: string;
  category: string;
  brand: string;
  model: string;
  dataset: "all" | "shop";
  priceMin: number | null;
  priceMax: number | null;
  minRating: number | null;
  sort: "recent" | "popular" | "price-asc" | "price-desc" | "impressions";
  limit: number;
  cursor: number;
};

async function fetchBrandCatalogProductIds(brandSlug: string): Promise<Set<string>> {
  const supabase = getCatalogClient();
  const normalized = normalizeBrandSlug(brandSlug);
  if (!normalized || normalized === "all") return new Set();

  const result = new Set<string>();
  // catalog_products_v is a public view that already contains brand_slug
  const { data, error } = await supabase.from("catalog_products_v").select("id").eq("brand_slug", normalized);

  if (error && process.env.NODE_ENV !== "production") {
    console.error("[catalog-meta] brand slug lookup error", {
      brand: normalized,
      message: error.message,
      details: (error as PostgrestError | null)?.details,
      hint: (error as PostgrestError | null)?.hint,
    });
  }

  if (Array.isArray(data)) {
    for (const row of data) {
      const id = typeof row?.id === "string" ? row.id : null;
      if (id) result.add(id);
    }
  }

  return result;
}

function buildCachePayload(filters: ProductFilters, options?: LoadProductsOptions): NormalizedCachePayload {
  const limit = Math.min(
    Math.max(1, Math.floor(options?.limit ?? PRODUCT_PAGE_SIZE_DEFAULT)),
    PRODUCT_PAGE_HARD_CAP,
  );
  const cursor = Math.max(0, Math.floor(options?.cursor ?? 0));

  return {
    query: filters.query ?? "",
    category: filters.category ?? "",
    brand: filters.brand ?? "all",
    model: filters.model ?? "all",
    dataset: filters.dataset ?? "all",
    priceMin: typeof filters.priceMin === "number" ? filters.priceMin : null,
    priceMax: typeof filters.priceMax === "number" ? filters.priceMax : null,
    minRating: typeof filters.minRating === "number" ? filters.minRating : null,
    sort: filters.sort ?? "recent",
    limit,
    cursor,
  };
}

const PRODUCT_SELECT_COLUMNS = [
  "id",
  "slug",
  "title",
  "description",
  "price",
  "currency",
  "status",
  "thumbnail_url",
  "specs",
  "created_at",
  "updated_at",
  "brand_id",
  "brand_slug",
  "brand_name",
  "category_id",
  "category_slug",
  "category_title",
  "category_is_primary",
].join(", ");

const PRODUCTS_DATA_CACHE_KEY = "products:list:data:v5";

function toProductListFilters(filters: ProductFilters): ProductListFilters {
  const normalized: ProductListFilters = {
    sort: filters.sort ?? "recent",
  };

  const search = filters.query?.trim();
  if (search) normalized.search = search;

  if (filters.category && filters.category !== "all") {
    normalized.category = filters.category.trim().toLowerCase();
  }

  if (typeof filters.priceMin === "number" && Number.isFinite(filters.priceMin) && filters.priceMin >= 0) {
    normalized.priceMinCents = Math.round(filters.priceMin * 100);
  } else {
    normalized.priceMinCents = null;
  }

  if (typeof filters.priceMax === "number" && Number.isFinite(filters.priceMax) && filters.priceMax >= 0) {
    normalized.priceMaxCents = Math.round(filters.priceMax * 100);
  } else {
    normalized.priceMaxCents = null;
  }

  if (typeof filters.minRating === "number" && Number.isFinite(filters.minRating) && filters.minRating > 0) {
    normalized.minRating = filters.minRating;
  } else {
    normalized.minRating = null;
  }

  if (filters.dataset && filters.dataset !== "all") {
    normalized.dataset = filters.dataset;
  } else {
    normalized.dataset = "all";
  }

  return normalized;
}

function mapRowsToProducts(productRows: Array<Record<string, unknown>>, baseOrderOffset = 0): Product[] {
  const now = Date.now();

  return productRows.map((row: any, index) => {
    const createdAtFallback =
      typeof row?.created_at === "string"
        ? row.created_at
        : typeof row?.createdAt === "string"
          ? row.createdAt
          : null;
    const createdTime = createdAtFallback ? Date.parse(createdAtFallback) : NaN;
    const isNew = Number.isFinite(createdTime) ? createdTime >= now - NEW_WINDOW_MS : index < TOP_LIMIT;

    const product = mapDbProduct(row as DbProductRow, {
      order: baseOrderOffset + index,
      createdAtFallback,
      isNew,
    });

    return {
      ...product,
      createdAt: product.createdAt ?? createdAtFallback,
      category: product.category ?? product.categorySlug ?? null,
      categorySlug: product.categorySlug ?? product.category ?? null,
      isTop: product.isTop ?? false,
      availability: product.availability ?? "InStock",
    } satisfies Product;
  });
}
export async function fetchProductsPage(filters: ProductFilters = {}, options?: LoadProductsOptions) {
  const normalized = normalizeProductFilters(filters);
  const limit = Math.min(
    Math.max(1, Math.floor(options?.limit ?? PRODUCT_PAGE_SIZE_DEFAULT)),
    PRODUCT_PAGE_HARD_CAP,
  );
  const cursor = Math.max(0, Math.floor(options?.cursor ?? 0));

  if (process.env.NODE_ENV !== "production") {
    try {
      console.log("[catalog-debug] fetchProductsPage filters", { filters: normalized, options: { limit, cursor } });
      logDebug("fetchProductsPage", { filters: normalized, options: { limit, cursor } });
    } catch {
      /* noop */
    }
  }

  const result = await loadProductsData(normalized, { ...options, limit, cursor });

  const items = result.products;
  const nextCursor = cursor + items.length < result.totalCount ? cursor + items.length : null;

  return {
    items,
    nextCursor,
    total: result.totalCount,
    categories: result.categories,
    brandFacets: result.brandFacets,
    modelFacets: result.modelFacets,
    structuredData: result.structuredData,
    fetchError: result.fetchError ? (result.fetchError as any)?.message ?? String(result.fetchError) : null,
    debug: result.debug ?? null,
  };
}

async function fetchProductRows(
  supabase: SupabaseClient,
  filters: ProductListFilters,
  pagination: { limit: number; offset: number; withCount?: boolean },
  allowedIds?: string[] | null,
): Promise<{ rows: Array<Record<string, unknown>>; totalCount: number; error: PostgrestError | null }> {
  const limit = Math.max(0, Math.min(PRODUCT_FETCH_HARD_CAP, Math.floor(pagination.limit)));
  const offset = Math.max(0, Math.floor(pagination.offset));

  const tryFetch = async (client: SupabaseClient) =>
    fetchProductListingPage({
      supabase: client,
      select: PRODUCT_SELECT_COLUMNS,
      filters,
      limit,
      offset,
      withCount: Boolean(pagination.withCount),
      allowedIds: allowedIds ?? null,
    });

  let page = await tryFetch(supabase);

  const needsAdminFallback =
    page.error &&
    (page.error.code === "PGRST302" ||
      page.error.code === "401" ||
      page.error.code === "403" ||
      /permission|policy|unauthor/i.test(page.error.message));

  if (needsAdminFallback) {
    try {
      const admin = getAdminClient();
      page = await tryFetch(admin);
    } catch (fallbackError) {
      // ignore and return original error below
    }
  }

  if (page.error) {
    return { rows: [], totalCount: 0, error: page.error };
  }

  const totalCount = page.count ?? page.rows.length;
  return { rows: page.rows, totalCount, error: null };
}

async function loadProductsDataInternal(
  filters: ProductFilters = {},
  options?: LoadProductsOptions,
): Promise<{
  products: Product[];
  fetchError: unknown;
  structuredData: Record<string, unknown> | null;
  categories: CategorySummary[];
  brandFacets: TaxonomyFacet[];
  modelFacets: ModelFacetMap;
  catalogName: string;
  totalCount: number;
  debug?: Record<string, unknown>;
}> {
  const supabase = getCatalogClient();
  const effectiveLimit = Math.min(
    PRODUCT_FETCH_HARD_CAP,
    Math.max(PRODUCT_PAGE_SIZE_DEFAULT, Math.floor(options?.limit ?? PRODUCT_PAGE_SIZE_DEFAULT * 2)),
  );
  const effectiveCursor = Math.max(0, Math.floor(options?.cursor ?? 0));

  // Pre-resolve brand/model variant ids for server-side filtering to avoid empty results when meta is missing.
  let brandCatalogIds: Set<string> | undefined;

  if (filters.brand && filters.brand !== "all") {
    brandCatalogIds = await fetchBrandCatalogProductIds(filters.brand);
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("[catalog-debug] variant-id-prep", {
      brand: filters.brand,
      brandCatalogCount: brandCatalogIds?.size ?? 0,
      model: filters.model,
      modelVariantCount: 0,
      allowedVariantCount: 0,
    });
    logDebug("variant-id-prep", {
      brand: filters.brand,
      brandCatalogCount: brandCatalogIds?.size ?? 0,
      model: filters.model,
      modelVariantCount: 0,
      allowedVariantCount: 0,
    });
  }

  const needsDeepScan = false;
  const targetCount = Math.min(
    PRODUCT_FETCH_HARD_CAP,
    effectiveCursor + effectiveLimit + (needsDeepScan ? PRODUCT_FETCH_CHUNK : 0),
  );
  let fetchedRows: Array<Record<string, unknown>> = [];
  let totalCount = 0;
  let fetchError: PostgrestError | null = null;
  let offset = 0;

  while (fetchedRows.length < targetCount) {
    const pageLimit = Math.min(PRODUCT_FETCH_CHUNK, targetCount - fetchedRows.length);
    const page = await fetchProductRows(
      supabase,
      toProductListFilters(filters),
      {
        limit: pageLimit,
        offset,
        withCount: offset === 0,
      },
      null,
    );

    if (page.error) {
      fetchError = page.error;
      break;
    }

    if (offset === 0 && page.totalCount) {
      totalCount = page.totalCount;
    }

    if (!Array.isArray(page.rows) || page.rows.length === 0) {
      break;
    }

    fetchedRows = fetchedRows.concat(page.rows);
    offset += page.rows.length;

    if (page.rows.length < pageLimit) {
      break;
    }
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("[catalog-debug] supabase-fetch", {
      requested: targetCount,
      fetched: fetchedRows.length,
      totalCount,
      cursor: effectiveCursor,
      limit: effectiveLimit,
      allowedVariantCount: 0,
    });
    logDebug("supabase-fetch", {
      requested: targetCount,
      fetched: fetchedRows.length,
      totalCount,
      cursor: effectiveCursor,
      limit: effectiveLimit,
      allowedVariantCount: 0,
    });
  }

  if (fetchError || !fetchedRows.length) {
    return {
      products: [],
      fetchError,
      structuredData: null,
      categories: [],
      brandFacets: [],
      modelFacets: {},
      catalogName: CATALOG_NAME,
      totalCount: 0,
    };
  }

  const products = mapRowsToProducts(fetchedRows, 0);

  // Build facets on a base that ignores brand/model filters (but keeps category/query/price/rating/dataset),
  // so options stay visible within the current category.
  const facetBase = filterProductsByTaxonomy(products, { ...filters, brand: undefined, model: undefined });

  const brandFacets = buildBrandFacets(facetBase);
  const modelFacets = buildModelFacets(facetBase);
  const categories = summarizeCategories(facetBase);

  const availableCategorySlugs = new Set(
    products
      .map((product) => (product.categorySlug ?? product.category ?? "").trim().toLowerCase())
      .filter(Boolean),
  );

  const effectiveFilters: ProductFilters = { ...filters };
  if (effectiveFilters.category) {
    const normalizedCategory = effectiveFilters.category.trim().toLowerCase();
    if (!availableCategorySlugs.has(normalizedCategory)) {
      // если пользователь выбрал несуществующую/пустую категорию, сбрасываем на "all",
      // чтобы фильтры не возвращали пустой список.
      effectiveFilters.category = undefined;
    }
  }

  // brandCatalogIds already resolved above (if brand filter is set)

  const filteredProducts = filterProductsByTaxonomy(products, effectiveFilters, brandCatalogIds);

  if (process.env.NODE_ENV !== "production") {
    console.log("[catalog-debug] post-filter", {
      brand: effectiveFilters.brand,
      model: effectiveFilters.model,
      filtered: filteredProducts.length,
      totalRows: products.length,
      allowedVariantCount: 0,
    });
    logDebug("post-filter", {
      brand: effectiveFilters.brand,
      model: effectiveFilters.model,
      filtered: filteredProducts.length,
      totalRows: products.length,
      allowedVariantCount: 0,
    });
  }

  const personalizedList = options?.personalize
    ? applyPersonalizedRanking(filteredProducts, {
        profile: options.personalize.profile,
        country: options.personalize.country,
        device: options.personalize.device,
        experimentVariant: options.personalize.experimentVariant,
      })
    : filteredProducts;

  for (let i = 0; i < Math.min(TOP_LIMIT, personalizedList.length); i += 1) {
    personalizedList[i].isTop = true;
  }

  const paginatedProducts = personalizedList
    .slice(effectiveCursor, effectiveCursor + effectiveLimit)
    .map((product, index) => ({ ...product, order: effectiveCursor + index }));

  const structuredData = buildStructuredData(paginatedProducts);

  if (process.env.NODE_ENV !== "production") {
    try {
      for (const p of paginatedProducts) {
        console.debug("catalog:image", {
          id: p.id,
          sku: p.slug,
          slug: p.slug,
          image: p.mainImage,
          source: "catalog_products_v",
        });
      }
    } catch {
      // no-op debug hook
    }
  }

  const totalForFilters =
    (effectiveFilters.dataset && effectiveFilters.dataset !== "all") ||
    (effectiveFilters.brand && effectiveFilters.brand !== "all") ||
    (effectiveFilters.model && effectiveFilters.model !== "all")
      ? filteredProducts.length
      : totalCount || filteredProducts.length;

  return {
    products: paginatedProducts,
    fetchError: null,
    structuredData,
    categories,
    brandFacets,
    modelFacets,
    catalogName: CATALOG_NAME,
    totalCount: totalForFilters,
    debug: {
      brand: effectiveFilters.brand ?? "all",
      model: effectiveFilters.model ?? "all",
      brandVariantCount: 0,
      modelVariantCount: 0,
      allowedVariantCount: 0,
      fetchedRows: fetchedRows.length,
      filteredRows: filteredProducts.length,
      brandFacetsCount: brandFacets.length,
      modelFacetsBrands: Object.keys(modelFacets).length,
    },
  };
}

export async function loadProductsData(filters: ProductFilters = {}, options?: LoadProductsOptions) {
  const normalized = normalizeProductFilters(filters);
  const limit = Math.min(
    Math.max(1, Math.floor(options?.limit ?? PRODUCT_PAGE_SIZE_DEFAULT)),
    PRODUCT_PAGE_HARD_CAP,
  );
  const cursor = Math.max(0, Math.floor(options?.cursor ?? 0));
  const paginatedOptions: LoadProductsOptions = { ...options, limit, cursor };

  const tags: string[] = [PRODUCT_COLLECTION_TAG];
  if (normalized.category) tags.push(categoryTag(normalized.category));
  if (normalized.brand) tags.push(brandTag(normalized.brand));

  const payload = buildCachePayload(normalized, paginatedOptions);
  const key = JSON.stringify(payload);
  const baseResult = await loadProductsDataCached(key, tags);

  if (!paginatedOptions.personalize) {
    return baseResult;
  }

  // Apply user-specific ranking on top of the cached, static payload to keep SSG + revalidate.
  const clonedProducts = baseResult.products.map((product) => ({ ...product }));
  const reranked = applyPersonalizedRanking(clonedProducts, {
    profile: paginatedOptions.personalize.profile,
    country: paginatedOptions.personalize.country,
    device: paginatedOptions.personalize.device,
    experimentVariant: paginatedOptions.personalize.experimentVariant,
  });

  const personalized = reranked.map((product, index) => ({
    ...product,
    order: cursor + index,
    isTop: index < TOP_LIMIT || Boolean(product.isTop),
  }));

  return {
    ...baseResult,
    products: personalized,
    structuredData: buildStructuredData(personalized),
  };
}

async function loadProductsDataCached(key: string, tags: string[]) {
  const uniqueTags = Array.from(new Set([PRODUCT_COLLECTION_TAG, ...tags]));
  const cached = unstable_cache(
    async (cacheKey: string) => {
      const parsed = JSON.parse(cacheKey) as NormalizedCachePayload;
      const normalized: ProductFilters = {
        dataset: parsed.dataset,
        sort: parsed.sort,
      };
      if (parsed.query) normalized.query = parsed.query;
      if (parsed.category) normalized.category = parsed.category;
      if (parsed.brand && parsed.brand !== "all") normalized.brand = parsed.brand;
      if (parsed.model && parsed.model !== "all") normalized.model = parsed.model;
      if (parsed.priceMin != null) normalized.priceMin = parsed.priceMin;
      if (parsed.priceMax != null) normalized.priceMax = parsed.priceMax;
      if (parsed.minRating != null) normalized.minRating = parsed.minRating;

      return loadProductsDataInternal(normalized, {
        limit: parsed.limit,
        cursor: parsed.cursor,
      });
    },
    [PRODUCTS_DATA_CACHE_KEY, ...uniqueTags],
    {
      revalidate: PRODUCT_LIST_REVALIDATE_SECONDS,
      tags: uniqueTags,
    },
  );

  return cached(key);
}

export function formatPrice(priceCents: number | null | undefined, currency: string | null | undefined): string {
  const price = Number(priceCents ?? 0) / 100;
  const cur = (currency ?? "EUR").toUpperCase();
  return formatCurrency(price, cur);
}


