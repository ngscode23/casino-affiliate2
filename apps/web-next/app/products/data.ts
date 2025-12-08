import "server-only";
import { unstable_cache } from "next/cache";
import { createClient as createSupabaseClient, type PostgrestError, type SupabaseClient } from "@supabase/supabase-js";
import { Pool } from "pg";
import { applyPersonalizedRanking, type UserProfile } from "@/lib/personalization/rank";
import { fetchProductListingPage, type ProductListFilters } from "@/lib/catalog/product-source";
import { mapDbProduct, type DbProductRow } from "@/lib/catalog/mapDbProduct";
import { sanitizeSearchParam } from "@shared/lib/sanitize";
import { normalizeImageUrl } from "./[slug]/data";
import type { Product } from "./types";
import { formatCurrency } from "./currency";
import { createSupabaseFetchLogger } from "@/utils/supabase/fetch-logger";
import { getAdminClient } from "@/utils/supabase/admin";

export type CategorySummary = { slug: string; label: string; count: number };

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
const SUPABASE_IN_FILTER_CHUNK = 40;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type CatalogProductMeta = {
  id: string;
  slug: string | null;
  title: string | null;
  brandId: string | null;
};

type CatalogBrandMeta = {
  id: string;
  slug: string | null;
  name: string | null;
};

type VariantMeta = {
  id: string | null;
  slug: string | null;
  sku: string | null;
  catalogProductId: string | null;
};

let catalogPool: Pool | null = null;

function shouldUseDbPool(): boolean {
  return typeof process.env.DATABASE_URL === "string" && process.env.DATABASE_URL.trim().length > 0;
}

function getCatalogPool(): Pool | null {
  if (!shouldUseDbPool()) return null;
  if (!catalogPool) {
    const connectionString = process.env.DATABASE_URL!.trim();
    const sslRequired = /sslmode=(require|verify-full|verify-ca)/i.test(connectionString);
    const sanitizedConnection = connectionString.replace(/([?&])sslmode=[^&]*/gi, "");
    catalogPool = new Pool({
      connectionString: sanitizedConnection,
      ssl: sslRequired ? { rejectUnauthorized: false } : undefined,
    });
  }
  return catalogPool;
}

const CATALOG_FETCH = createSupabaseFetchLogger("catalog-public", console.info, {
  retries: 2,
  baseDelayMs: 250,
});

let catalogSupabase: SupabaseClient | null = null;
function getCatalogClient(): SupabaseClient {
  if (!catalogSupabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_*KEY for catalog client");
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

export type ProductFilters = {
  query?: string;
  category?: string;
  dataset?: "all" | "shop";
  brand?: string;
  model?: string;
  priceMin?: number | null;
  priceMax?: number | null;
  minRating?: number | null;
  sort?: "recent" | "popular" | "price-asc" | "price-desc" | "impressions";
};

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

function splitSlugSegments(value: string | null | undefined): string[] {
  if (!value) return [];
  return String(value)
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function chunkValues<T>(values: T[], chunkSize: number): T[][] {
  if (!values.length) return [];
  const normalizedSize = Math.max(1, Math.floor(chunkSize));
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += normalizedSize) {
    chunks.push(values.slice(index, index + normalizedSize));
  }
  return chunks;
}

function looksLikeUuid(value: string | null | undefined): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return UUID_PATTERN.test(trimmed);
}

async function fetchCatalogMeta(
  catalogProductIds: string[],
): Promise<{
  productById: Map<string, CatalogProductMeta>;
  brandById: Map<string, CatalogBrandMeta>;
}> {
  const productById = new Map<string, CatalogProductMeta>();
  const brandById = new Map<string, CatalogBrandMeta>();

  if (!catalogProductIds.length) {
    return { productById, brandById };
  }

  const uniqueIds = Array.from(new Set(catalogProductIds));
  const dbPool = getCatalogPool();

  if (dbPool) {
    const { rows } = await dbPool.query<{
      id: string | null;
      slug: string | null;
      title: string | null;
      brand_id: string | null;
      brand_slug: string | null;
      brand_name: string | null;
    }>(
      `
      select
        p.id,
        p.slug,
        p.title,
        p.brand_id,
        b.slug as brand_slug,
        b.name as brand_name
      from catalog.products p
      left join catalog.brands b on b.id = p.brand_id
      where p.id = any($1::uuid[])
    `,
      [uniqueIds],
    );

    for (const row of rows) {
      const id = typeof row.id === "string" ? row.id : null;
      if (!id) continue;
      const brandId = typeof row.brand_id === "string" ? row.brand_id : null;
      productById.set(id, {
        id,
        slug: typeof row.slug === "string" ? row.slug : null,
        title: typeof row.title === "string" ? row.title : null,
        brandId,
      });
      if (brandId && !brandById.has(brandId)) {
        brandById.set(brandId, {
          id: brandId,
          slug: typeof row.brand_slug === "string" ? row.brand_slug : null,
          name: typeof row.brand_name === "string" ? row.brand_name : null,
        });
      }
    }

    if (process.env.NODE_ENV !== "production") {
      console.log("[catalog-meta] fetched via pg", {
        requestedProducts: uniqueIds.length,
        resolvedProducts: productById.size,
        resolvedBrands: brandById.size,
      });
    }

    return { productById, brandById };
  }

  let catalogSupabase: SupabaseClient | null = null;
  let adminCatalog: SupabaseClient | null = null;

  try {
    adminCatalog = getAdminClient();
  } catch {
    adminCatalog = null;
  }

  catalogSupabase = getCatalogClient();
  for (const chunk of chunkValues(uniqueIds, SUPABASE_IN_FILTER_CHUNK)) {
    const client = adminCatalog ?? catalogSupabase;
    // public view mirrors catalog.products with brand fields; REST (public schema) can read it
    const table = "catalog_products_with_brand";

    let productsResp = await client.from(table).select("id, slug, title, brand_id, brand_slug, brand_name").in("id", chunk);

    const needAdminRetry =
      !adminCatalog && (productsResp.error || (Array.isArray(productsResp.data) && productsResp.data.length === 0));

    // если анонимный клиент не имеет прав ИЛИ вернул пусто, пробуем переключиться на admin и повторить
    if (needAdminRetry) {
      try {
        adminCatalog = getAdminClient();
        productsResp = await adminCatalog.from(table).select("id, slug, title, brand_id, brand_slug, brand_name").in("id", chunk);
      } catch {
        // остаёмся на исходной ошибке
      }
    }

    const { data: products, error } = productsResp;
    if (error && process.env.NODE_ENV !== "production") {
      const pgError = error as PostgrestError | null;
      console.error("[catalog-meta] products error", {
        chunkSize: chunk.length,
        message: error.message,
        details: pgError?.details,
        hint: pgError?.hint,
      });
    }
    if (!Array.isArray(products) || products.length === 0) continue;

    // when using public view, brand fields already in rows; when adminCatalog, fetch brands table
    const brandIds = Array.from(
      new Set(
        products
          .map((row: any) => (typeof row?.brand_id === "string" ? row.brand_id : null))
          .filter(Boolean) as string[],
      ),
    );

    // populate brandById from products rows if data present
    for (const row of products) {
      const bId = typeof (row as any)?.brand_id === "string" ? (row as any).brand_id : null;
      if (!bId || brandById.has(bId)) continue;
      const bSlug = typeof (row as any)?.brand_slug === "string" ? (row as any).brand_slug : null;
      const bName = typeof (row as any)?.brand_name === "string" ? (row as any).brand_name : null;
      if (bSlug || bName || adminCatalog) {
        brandById.set(bId, { id: bId, slug: bSlug, name: bName });
      }
    }

    // if adminCatalog is available, ensure brands are loaded from catalog.brands for completeness
    if (brandIds.length) {
      // Try dedicated catalog schema first to avoid "public.catalog.brands" cache errors.
      let brandClient: SupabaseClient | null = null;
      try {
        brandClient = getAdminClient("catalog");
      } catch {
        brandClient = adminCatalog;
      }

      const candidates: Array<{ client: SupabaseClient | null; table: string }> = [
        { client: brandClient, table: "brands" }, // schema-bound client
        { client: adminCatalog, table: "catalog_brands" }, // fallback: public view/table
        { client: catalogSupabase, table: "catalog_brands" }, // anon client fallback
      ];

      for (const { client, table } of candidates) {
        if (!client) continue;
        const { data: brandRows, error: brandError } = await client
          .from(table)
          .select("id, slug, name")
          .in("id", brandIds);

        if (brandError && process.env.NODE_ENV !== "production") {
          const pgError = brandError as PostgrestError | null;
          console.error("[catalog-meta] brands error", {
            chunkSize: brandIds.length,
            message: brandError.message,
            details: pgError?.details,
            hint: pgError?.hint,
          });
        }

        if (Array.isArray(brandRows) && brandRows.length) {
          for (const row of brandRows) {
            const id = typeof row?.id === "string" ? row.id : null;
            if (!id || brandById.has(id)) continue;
            brandById.set(id, {
              id,
              slug: typeof row?.slug === "string" ? row.slug : null,
              name: typeof row?.name === "string" ? row.name : null,
            });
          }
          break; // stop after first successful source
        }
      }
    }

    for (const row of products) {
      const id = typeof row?.id === "string" ? row.id : null;
      if (!id) continue;
      const brandId = typeof row?.brand_id === "string" ? row.brand_id : null;
      productById.set(id, {
        id,
        slug: typeof row?.slug === "string" ? row.slug : null,
        title: typeof row?.title === "string" ? row.title : null,
        brandId,
      });
      if (brandId && brandById.has(brandId)) {
        // already filled above
        continue;
      }
    }
  }

  if (process.env.NODE_ENV !== "production") {
    try {
      console.log("[catalog-meta]", {
        requestedProducts: catalogProductIds.length,
        resolvedProducts: productById.size,
        resolvedBrands: brandById.size,
      });
    } catch {
      // ignore logging issues
    }
  }

  return { productById, brandById };
}

async function fetchVariantMeta(
  variantIds: string[],
  variantSlugs: string[],
  variantSkus: string[],
): Promise<Map<string, VariantMeta>> {
  const variantByKey = new Map<string, VariantMeta>();
  const enableProductsFallback = process.env.SUPABASE_ENABLE_PRODUCTS_FALLBACK === "true";
  const supabase = getCatalogClient();
  let adminClient: SupabaseClient | null = null;
  try {
    adminClient = getAdminClient();
  } catch {
    adminClient = null;
  }

  const fetchChunk = async (
    source: "ecom_products" | "products",
    column: "id" | "slug" | "sku",
    values: string[],
  ) => {
    let client = adminClient ?? supabase;
    let table = adminClient ? source : `public.${source}`;

    let resp = await client.from(table).select("id, slug, sku, catalog_product_id").in(column, values);

    const needAdminRetry = !adminClient && (resp.error || (Array.isArray(resp.data) && resp.data.length === 0));

    // если анонимный клиент не имеет прав ИЛИ вернул пусто (из-за RLS), пробуем создать admin on-demand и повторить
    if (needAdminRetry) {
      try {
        adminClient = getAdminClient();
        client = adminClient;
        table = source;
        resp = await client.from(table).select("id, slug, sku, catalog_product_id").in(column, values);
      } catch {
        // keep original resp
      }
    }

    const { data, error } = resp;
    if (error) {
      if (process.env.NODE_ENV !== "production") {
        const pgError = error as PostgrestError | null;
        console.error("[catalog-meta] variant lookup error", {
          source,
          column,
          chunkSize: values.length,
          message: error.message,
          details: pgError?.details,
          hint: pgError?.hint,
        });
      }

      const fallbackRows: Array<Record<string, unknown>> = [];
      for (const value of values) {
        const { data: single, error: singleError } = await supabase
          .from(source)
          .select("id, slug, sku, catalog_product_id")
          .eq(column, value)
          .maybeSingle();
        if (singleError) {
          if (process.env.NODE_ENV !== "production") {
            const pgError = singleError as PostgrestError | null;
            console.error("[catalog-meta] variant fallback error", {
              source,
              column,
              value,
              message: singleError.message,
              details: pgError?.details,
              hint: pgError?.hint,
            });
          }
          continue;
        }
        if (single) {
          fallbackRows.push(single as Record<string, unknown>);
        }
      }
      return fallbackRows;
    }
    if (!Array.isArray(data)) return [];
    return data as Array<Record<string, unknown>>;
  };

  const loadByColumn = async (column: "id" | "slug" | "sku", values: string[]) => {
    if (!values.length) return;
    const sanitizedValues =
      column === "id"
        ? values
            .map((value) => (typeof value === "string" ? value.trim() : value))
            .filter((value): value is string => looksLikeUuid(value))
        : values
            .map((value) => (typeof value === "string" ? value.trim() : value))
            .filter((value): value is string => typeof value === "string" && value.length > 0);
    if (!sanitizedValues.length) return;

    for (const chunk of chunkValues(sanitizedValues, SUPABASE_IN_FILTER_CHUNK)) {
      const rows = await fetchChunk("ecom_products", column, chunk);
      if (!rows.length) continue;
      for (const row of rows) {
        const id = typeof row?.id === "string" ? row.id : null;
        const slug = typeof row?.slug === "string" ? row.slug : null;
        const sku = typeof row?.sku === "string" ? row.sku : null;
        const catalogProductRaw = (row as Record<string, unknown>)?.catalog_product_id ?? null;
        const catalogProductId =
          typeof catalogProductRaw === "string" && catalogProductRaw.trim()
            ? catalogProductRaw.trim()
            : typeof catalogProductRaw === "number"
              ? String(catalogProductRaw)
              : null;
        const meta: VariantMeta = { id, slug, sku, catalogProductId };
        if (id) variantByKey.set(id, meta);
        if (slug) variantByKey.set(slug, meta);
        if (sku) variantByKey.set(sku, meta);
      }
    }
  };

  const loadByColumnFromProducts = async (column: "id" | "slug" | "sku", values: string[]) => {
    if (!values.length) return;
    const sanitizedValues =
      column === "id"
        ? values
            .map((value) => (typeof value === "string" ? value.trim() : value))
            .filter((value): value is string => looksLikeUuid(value))
        : values
            .map((value) => (typeof value === "string" ? value.trim() : value))
            .filter((value): value is string => typeof value === "string" && value.length > 0);
    if (!sanitizedValues.length) return;

    for (const chunk of chunkValues(sanitizedValues, SUPABASE_IN_FILTER_CHUNK)) {
      const rows = await fetchChunk("products", column, chunk);
      if (!rows.length) continue;
      for (const row of rows) {
        const id = typeof row?.id === "string" ? row.id : null;
        const slug = typeof row?.slug === "string" ? row.slug : null;
        const sku = typeof row?.sku === "string" ? row.sku : null;
        const catalogProductRaw = (row as Record<string, unknown>)?.catalog_product_id ?? null;
        const catalogProductId =
          typeof catalogProductRaw === "string" && catalogProductRaw.trim()
            ? catalogProductRaw.trim()
            : typeof catalogProductRaw === "number"
              ? String(catalogProductRaw)
              : null;
        const meta: VariantMeta = { id, slug, sku, catalogProductId };

        const upsertIfMissingCatalog = (key: string | null) => {
          if (!key) return;
          const existing = variantByKey.get(key);
          if (!existing || !existing.catalogProductId) {
            variantByKey.set(key, meta);
          }
        };

        upsertIfMissingCatalog(id);
        upsertIfMissingCatalog(slug);
        upsertIfMissingCatalog(sku);
      }
    }
  };

  await loadByColumn("id", variantIds);
  const unresolvedSlugs: string[] = variantSlugs.filter((slug) => !variantByKey.has(slug));
  if (unresolvedSlugs.length) {
    await loadByColumn("slug", unresolvedSlugs);
  }
  const unresolvedSkus: string[] = variantSkus.filter((sku) => !variantByKey.has(sku));
  if (unresolvedSkus.length) {
    await loadByColumn("sku", unresolvedSkus);
  }

  // Optional fallback: resolve missing catalog_product_id from legacy "products" table.
  if (enableProductsFallback) {
    await loadByColumnFromProducts("id", variantIds);
    await loadByColumnFromProducts("slug", variantSlugs);
    await loadByColumnFromProducts("sku", variantSkus);
  }

  return variantByKey;
}

function stablePayloadKey(payload: { ids: string[]; slugs?: string[]; skus?: string[] }) {
  const ids = Array.from(new Set(payload.ids || [])).sort();
  const slugs = Array.from(new Set(payload.slugs || [])).sort();
  const skus = Array.from(new Set(payload.skus || [])).sort();
  return JSON.stringify({ ids, slugs, skus });
}

const fetchVariantMetaCached = (payload: { ids: string[]; slugs: string[]; skus: string[] }) => {
  const key = stablePayloadKey(payload);
  return unstable_cache(
    async () => {
      const metaMap = await fetchVariantMeta(payload.ids, payload.slugs, payload.skus);
      return Array.from(metaMap.entries());
    },
    // include payload in key to avoid returning stale meta from unrelated requests
    ["catalog:variant-meta:v3", key],
    {
      revalidate: PRODUCT_LIST_REVALIDATE_SECONDS,
      tags: [PRODUCT_COLLECTION_TAG],
    },
  )();
};

const fetchCatalogMetaCached = (ids: string[]) => {
  const key = JSON.stringify(Array.from(new Set(ids)).sort());
  return unstable_cache(
    async () => {
      const { productById, brandById } = await fetchCatalogMeta(ids);
      return {
        productEntries: Array.from(productById.entries()),
        brandEntries: Array.from(brandById.entries()),
      };
    },
    ["catalog:meta:v3", key],
    {
      revalidate: PRODUCT_LIST_REVALIDATE_SECONDS,
      tags: [PRODUCT_COLLECTION_TAG],
    },
  )();
};

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

function filterProductsByTaxonomy(products: Product[], filters: ProductFilters): Product[] {
  const brandSelection = filters.brand ?? "all";
  const modelSelection = filters.model ?? "all";
  const categorySelection = filters.category ?? "all";

  return products.filter((product) => {
    if (filters.dataset && filters.dataset !== "all" && product.dataset !== filters.dataset) {
      return false;
    }

    if (categorySelection && categorySelection !== "all") {
      const normalizedSelection = categorySelection.trim().toLowerCase();
      if (normalizedSelection) {
        const productCategory = (product.categorySlug ?? product.category ?? "").trim().toLowerCase();
        if (!productCategory) return false;
        // allow matching parent/child slugs like "phones" vs "phones/android"
        const matchesDirect = productCategory === normalizedSelection;
        const matchesNested = productCategory.startsWith(`${normalizedSelection}/`);
        if (!matchesDirect && !matchesNested) {
          return false;
        }
      }
    }

    if (brandSelection && brandSelection !== "all") {
      const normalizedSelection = brandSelection.trim().toLowerCase();
      if (normalizedSelection) {
        const candidates = [product.brand, product.brandSlug, product.brandName]
          .map((value) => (typeof value === "string" ? value.trim().toLowerCase() : ""))
          .filter(Boolean);
        if (!candidates.includes(normalizedSelection)) {
          return false;
        }
      }
    }

    if (modelSelection && modelSelection !== "all") {
      const normalizedSelection = modelSelection.trim().toLowerCase();
      if (normalizedSelection) {
        const candidates = [
          product.model,
          product.modelSlug,
          product.modelTitle ? product.modelTitle.toLowerCase().replace(/\s+/g, "-") : null,
        ]
          .map((value) => (typeof value === "string" ? value.trim().toLowerCase() : ""))
          .filter(Boolean);
        if (!candidates.includes(normalizedSelection)) {
          if (!product.catalogProductId || product.catalogProductId !== modelSelection) {
            return false;
          }
        }
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

function normalizeFilters(filters: ProductFilters = {}): ProductFilters {
  const normalized: ProductFilters = {};

  const sanitizedQuery = sanitizeSearchParam(filters.query ?? "");
  const trimmedQuery = sanitizedQuery ? sanitizedQuery.trim().slice(0, 120) : "";
  if (trimmedQuery) normalized.query = trimmedQuery;

  const category = filters.category?.trim();
  if (category && category !== "all") normalized.category = category;

  const brand = filters.brand?.trim().toLowerCase();
  if (brand && brand !== "all") {
    normalized.brand = brand;
  }

  const model = filters.model?.trim().toLowerCase();
  if (model && model !== "all") {
    normalized.model = model;
  }

  normalized.dataset = filters.dataset === "shop" ? "shop" : "all";

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

const PRODUCT_SELECT_COLUMNS =
  "id, sku, name, slug, basePriceCents, effectivePriceCents, hasDiscount, currency, category_slug, rating, created_at, thumbnail, thumbnail_path, dataset";

function toProductListFilters(filters: ProductFilters): ProductListFilters {
  const normalized: ProductListFilters = {
    sort: filters.sort ?? "recent",
  };

  const search = filters.query?.trim();
  if (search) normalized.search = search;

  if (filters.category && filters.category !== "all") {
    normalized.category = filters.category;
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

type MetaMaps = {
  variantMetaById: Map<string, VariantMeta>;
  catalogProductById: Map<string, CatalogProductMeta>;
  catalogBrandById: Map<string, CatalogBrandMeta>;
};

async function resolveMetaForRows(productRows: Array<Record<string, unknown>>): Promise<MetaMaps> {
  const variantIds = Array.from(
    new Set(
      productRows
        .map((row: any) => {
          const raw = row?.id ?? null;
          if (typeof raw === "string" && raw.trim()) return raw.trim();
          if (typeof raw === "number") return String(raw);
          return null;
        })
        .filter(Boolean) as string[],
    ),
  );

  const variantSlugs = Array.from(
    new Set(
      productRows
        .map((row: any) => {
          const raw = row?.slug ?? null;
          if (typeof raw === "string" && raw.trim()) return raw.trim();
          return null;
        })
        .filter(Boolean) as string[],
    ),
  );

  const variantSkus = Array.from(
    new Set(
      productRows
        .map((row: any) => {
          const raw = row?.sku ?? null;
          if (typeof raw === "string" && raw.trim()) return raw.trim();
          return null;
        })
        .filter(Boolean) as string[],
    ),
  );

  const variantEntries = await fetchVariantMetaCached({
    ids: variantIds,
    slugs: variantSlugs,
    skus: variantSkus,
  });
  const variantMetaById = new Map<string, VariantMeta>(variantEntries);

  const catalogProductIds = Array.from(
    new Set(
      Array.from(variantMetaById.values())
        .map((meta) => meta.catalogProductId)
        .filter((value): value is string => looksLikeUuid(value)),
    ),
  );

  const { productEntries, brandEntries } = await fetchCatalogMetaCached(catalogProductIds);
  const catalogProductById = new Map<string, CatalogProductMeta>(productEntries);
  const catalogBrandById = new Map<string, CatalogBrandMeta>(brandEntries);

  return { variantMetaById, catalogProductById, catalogBrandById };
}

function mapRowsToProducts(
  productRows: Array<Record<string, unknown>>,
  meta: MetaMaps,
  baseOrderOffset = 0,
): Product[] {
  const { variantMetaById, catalogProductById, catalogBrandById } = meta;
  const now = Date.now();

  return productRows.map((row: any, index) => {
    const id = row?.id != null ? String(row.id) : "";
    const slug = row?.slug != null ? String(row.slug) : "";
    const sku = typeof row?.sku === "string" ? row.sku : null;
    const createdAtFallback =
      typeof row?.created_at === "string"
        ? row.created_at
        : typeof row?.createdAt === "string"
          ? row.createdAt
          : null;
    const createdTime = createdAtFallback ? Date.parse(createdAtFallback) : NaN;
    const isNew = Number.isFinite(createdTime) ? createdTime >= now - NEW_WINDOW_MS : index < TOP_LIMIT;

    const variantMeta =
      (id ? variantMetaById.get(id) : null) ??
      (slug ? variantMetaById.get(slug) : null) ??
      (sku ? variantMetaById.get(sku) : null);
    const catalogProductId = variantMeta?.catalogProductId ?? null;
    const catalogProductMeta = catalogProductId ? catalogProductById.get(catalogProductId) : undefined;
    const catalogBrandMeta = catalogProductMeta?.brandId ? catalogBrandById.get(catalogProductMeta.brandId) : undefined;
    const brandSlug = catalogBrandMeta?.slug ?? null;
    const brandName = catalogBrandMeta?.name ?? null;
    const modelSlug = catalogProductMeta?.slug ?? null;
    const modelTitle = catalogProductMeta?.title ?? (typeof row?.name === "string" ? row.name : null);

    const product = mapDbProduct(row as DbProductRow, {
      order: baseOrderOffset + index,
      createdAtFallback,
      meta: {
        catalogProductId,
        brandSlug,
        brandName,
        modelSlug,
        modelTitle,
      },
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
  const normalized = normalizeFilters(filters);
  const limit = Math.min(
    Math.max(1, Math.floor(options?.limit ?? PRODUCT_PAGE_SIZE_DEFAULT)),
    PRODUCT_PAGE_HARD_CAP,
  );
  const cursor = Math.max(0, Math.floor(options?.cursor ?? 0));

  const result = await loadProductsData(normalized, { ...options, limit, cursor });

  const items = result.products;
  const nextCursor = cursor + items.length < result.totalCount ? cursor + items.length : null;

  return {
    items,
    nextCursor,
    total: result.totalCount,
    categories: result.categories,
    structuredData: result.structuredData,
    fetchError: result.fetchError ? (result.fetchError as any)?.message ?? String(result.fetchError) : null,
  };
}

async function fetchProductRows(
  supabase: SupabaseClient,
  filters: ProductListFilters,
  pagination: { limit: number; offset: number; withCount?: boolean },
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
  catalogName: string;
  totalCount: number;
}> {
  const supabase = getCatalogClient();
  const effectiveLimit = Math.min(
    PRODUCT_FETCH_HARD_CAP,
    Math.max(PRODUCT_PAGE_SIZE_DEFAULT, Math.floor(options?.limit ?? PRODUCT_PAGE_SIZE_DEFAULT * 2)),
  );
  const effectiveCursor = Math.max(0, Math.floor(options?.cursor ?? 0));

  const needsDeepScan =
    (filters.brand && filters.brand !== "all") || (filters.model && filters.model !== "all");
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

  if (fetchError || !fetchedRows.length) {
    return {
      products: [],
      fetchError,
      structuredData: null,
      categories: [],
      catalogName: CATALOG_NAME,
      totalCount: 0,
    };
  }

  const meta = await resolveMetaForRows(fetchedRows);
  const products = mapRowsToProducts(fetchedRows, meta, 0);

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

  let filteredProducts = filterProductsByTaxonomy(products, effectiveFilters);

  // Safe fallback: если бренд/модель отфильтровали всё, ослабляем до категории, чтобы не показывать пустую выдачу.
  if (
    filteredProducts.length === 0 &&
    ((effectiveFilters.brand && effectiveFilters.brand !== "all") || (effectiveFilters.model && effectiveFilters.model !== "all"))
  ) {
    const relaxed: ProductFilters = { ...effectiveFilters, brand: undefined, model: undefined };
    filteredProducts = filterProductsByTaxonomy(products, relaxed);
  }

  const categories = summarizeCategories(filteredProducts);

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
          source: "product_with_discount_public",
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
    catalogName: CATALOG_NAME,
    totalCount: totalForFilters,
  };
}

export async function loadProductsData(filters: ProductFilters = {}, options?: LoadProductsOptions) {
  const normalized = normalizeFilters(filters);
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
    ["products:list:data:v3", ...uniqueTags],
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
