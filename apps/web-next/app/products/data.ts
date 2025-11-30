import "server-only";
import { unstable_cache } from "next/cache";
import { getAdminClient } from "@/utils/supabase/admin";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { Pool } from "pg";
import { applyPersonalizedRanking, type UserProfile } from "@/lib/personalization/rank";
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

export type ProductFilters = {
  query?: string;
  category?: string;
  dataset?: "all" | "shop" | "legacy";
  brand?: string;
  model?: string;
  priceMin?: number | null;
  priceMax?: number | null;
  minRating?: number | null;
  sort?: "recent" | "popular" | "price-asc" | "price-desc" | "impressions";
};

export type LoadProductsOptions = {
  personalize?: {
    profile?: UserProfile | null;
    country?: string;
    device?: string;
    experimentVariant?: string | null;
  };
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
  supabase: SupabaseClient,
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

  const catalogSupabase = getAdminClient();
  for (const chunk of chunkValues(uniqueIds, SUPABASE_IN_FILTER_CHUNK)) {
    const { data, error } = await catalogSupabase
      .from("catalog_product_meta")
      .select("id, slug, title, brand_id, brand_slug, brand_name")
      .in("id", chunk);
    if (error && process.env.NODE_ENV !== "production") {
      const pgError = error as PostgrestError | null;
      console.error("[catalog-meta] products error", {
        chunkSize: chunk.length,
        message: error.message,
        details: pgError?.details,
        hint: pgError?.hint,
      });
    }
    if (!Array.isArray(data)) continue;
    for (const row of data) {
      const id = typeof row?.id === "string" ? row.id : null;
      if (!id) continue;
      const brandId = typeof row?.brand_id === "string" ? row.brand_id : null;
      productById.set(id, {
        id,
        slug: typeof row?.slug === "string" ? row.slug : null,
        title: typeof row?.title === "string" ? row.title : null,
        brandId,
      });
      if (brandId && !brandById.has(brandId)) {
        brandById.set(brandId, {
          id: brandId,
          slug: typeof row?.brand_slug === "string" ? row.brand_slug : null,
          name: typeof row?.brand_name === "string" ? row.brand_name : null,
        });
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
  supabase: SupabaseClient,
  variantIds: string[],
  variantSlugs: string[],
  variantSkus: string[],
): Promise<Map<string, VariantMeta>> {
  const variantByKey = new Map<string, VariantMeta>();
  const enableProductsFallback = process.env.SUPABASE_ENABLE_PRODUCTS_FALLBACK === "true";

  const fetchChunk = async (
    source: "ecom_products" | "products",
    column: "id" | "slug" | "sku",
    values: string[],
  ) => {
    const { data, error } = await supabase
      .from(source)
      .select("id, slug, sku, catalog_product_id")
      .in(column, values);
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

  const variantIds = Array.from(
    new Set(
      data
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
      data
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
      data
        .map((row: any) => {
          const raw = row?.sku ?? null;
          if (typeof raw === "string" && raw.trim()) return raw.trim();
          return null;
        })
        .filter(Boolean) as string[],
    ),
  );

  const variantMetaById = await fetchVariantMeta(supabase, variantIds, variantSlugs, variantSkus);
  const catalogProductIds = Array.from(
    new Set(
      Array.from(variantMetaById.values())
        .map((meta) => meta.catalogProductId)
        .filter((value): value is string => looksLikeUuid(value)),
    ),
  );

  if (process.env.NODE_ENV !== "production") {
    console.log("[catalog-meta] requested product IDs", catalogProductIds);
  }

  const { productById: catalogProductById, brandById: catalogBrandById } = await fetchCatalogMeta(
    supabase,
    catalogProductIds,
  );

  const now = Date.now();

  const products: Product[] = data.map((row: any, index) => {
    const id = row?.id != null ? String(row.id) : "";
    const slug = row?.slug != null ? String(row.slug) : "";
    const sku = typeof row?.sku === "string" ? row.sku : null;
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
      if (typeof row?.thumbnail_path === "string" && row.thumbnail_path.trim()) return row.thumbnail_path.trim();
      return null;
    })();

    if (process.env.NODE_ENV !== "production") {
      try {
        console.debug("catalog:image", slug, thumbnailPath);
      } catch {
        // ignore debug logging failures
      }
    }

    const mainImage = thumbnailPath ? normalizeImageUrl(thumbnailPath) : null;
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

      return {
        id,
        slug,
        sku,
      title,
      description: typeof row?.description === "string" ? row.description : null,
      category: categorySlug,
      brand: brandSlug ?? null,
      brandSlug: brandSlug ?? null,
      brandName,
      model: modelSlug ?? null,
      modelSlug: modelSlug ?? null,
      modelTitle,
      catalogProductId,
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

  const personalizedProducts = options?.personalize
    ? applyPersonalizedRanking(filteredProducts, {
        profile: options.personalize.profile,
        country: options.personalize.country,
        device: options.personalize.device,
        experimentVariant: options.personalize.experimentVariant,
      })
    : filteredProducts;

  const structuredData = buildStructuredData(personalizedProducts);

  if (process.env.NODE_ENV !== "production") {
    try {
      for (const p of personalizedProducts) {
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
    products: personalizedProducts,
    fetchError: null,
    structuredData,
    categories,
    catalogName: CATALOG_NAME,
    totalCount:
      filters.dataset && filters.dataset !== "all"
        ? personalizedProducts.length
        : typeof count === "number"
          ? count
          : personalizedProducts.length,
  };
}

export async function loadProductsData(filters: ProductFilters = {}, options?: LoadProductsOptions) {
  const normalized = normalizeFilters(filters);
  if (options?.personalize) {
    return loadProductsDataInternal(normalized, options);
  }
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








