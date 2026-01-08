import type { SupabaseClient, PostgrestError } from "@supabase/supabase-js";

export type ProductListSort = "recent" | "popular" | "price-asc" | "price-desc" | "impressions";

export type ProductListFilters = {
  search?: string;
  category?: string;
  dataset?: "all" | "shop" | "legacy";
  priceMinCents?: number | null;
  priceMaxCents?: number | null;
  minRating?: number | null;
  sort?: ProductListSort;
};

const PRODUCT_TABLE = "catalog_products_v";

type AnySupabase = SupabaseClient<any, string, any>;

type QueryConfig = {
  supabase: AnySupabase;
  select: string;
  filters: ProductListFilters;
  limit: number;
  offset?: number;
  withCount?: boolean;
  allowedIds?: string[] | null;
};

type QueryResult<Row> = {
  rows: Row[];
  count: number | null;
  error: PostgrestError | null;
};

export async function fetchProductListingPage<Row = Record<string, unknown>>({
  supabase,
  select,
  filters,
  limit,
  offset = 0,
  withCount = false,
  allowedIds = null,
}: QueryConfig): Promise<QueryResult<Row>> {
  // Legacy dataset is intentionally unsupported for the new catalog.
  if (filters.dataset === "legacy") {
    return { rows: [], count: withCount ? 0 : null, error: null };
  }

  const safeLimit = Math.max(0, Math.floor(limit));
  if (safeLimit === 0) {
    return { rows: [], count: 0, error: null };
  }

  const query = buildProductListingQuery(supabase, select, filters, withCount, allowedIds);
  const start = Math.max(0, offset);
  const end = start + safeLimit - 1;
  const { data, error, count } = await query.range(start, end);

  return {
    rows: (data as Row[]) ?? [],
    count: withCount ? count ?? null : null,
    error: error ?? null,
  };
}

function buildProductListingQuery(
  supabase: AnySupabase,
  select: string,
  filters: ProductListFilters,
  withCount: boolean,
  allowedIds: string[] | null,
) {
  const query = supabase.from(PRODUCT_TABLE).select(select, withCount ? { count: "exact" } : undefined);

  if (allowedIds && allowedIds.length) {
    query.in("id", allowedIds);
  }

  // Новый каталог не использует dataset; legacy выдачу не поддерживаем.
  // Public storefront should only show published products.
  query.eq("status", "published");

  if (filters.category) {
    // Match exact slug or nested paths like "electronics/phones" and "phones/smart"
    const slug = escapeForILike(filters.category);
    query.or(
      [
        `category_slug.eq.${slug}`,
        `category_slug.ilike.${slug}/%`,
        `category_slug.ilike.%/${slug}`,
        `category_slug.ilike.%/${slug}/%`,
      ].join(","),
    );
  }

  if (typeof filters.priceMinCents === "number" && Number.isFinite(filters.priceMinCents)) {
    const minPrice = Math.max(0, filters.priceMinCents) / 100;
    query.gte("price", minPrice);
  }

  if (typeof filters.priceMaxCents === "number" && Number.isFinite(filters.priceMaxCents)) {
    const maxPrice = Math.max(0, filters.priceMaxCents) / 100;
    query.lte("price", maxPrice);
  }

  // В новом каталоге рейтинги отсутствуют — фильтр игнорируем.

  if (filters.search) {
    const pattern = `%${escapeForILike(filters.search)}%`;
    query.or(`title.ilike.${pattern},slug.ilike.${pattern}`);
  }

  applySort(query, filters.sort ?? "recent");
  return query;
}

type SortableQuery = {
  order: (column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) => unknown;
};

function applySort(query: SortableQuery, sort: ProductListSort) {
  const normalized = sort ?? "recent";
  switch (normalized) {
    case "price-asc":
      query.order("price", { ascending: true, nullsFirst: false });
      query.order("created_at", { ascending: false, nullsFirst: false });
      break;
    case "price-desc":
      query.order("price", { ascending: false, nullsFirst: false });
      query.order("created_at", { ascending: false, nullsFirst: false });
      break;
    case "popular":
      query.order("created_at", { ascending: false, nullsFirst: false });
      break;
    case "impressions":
      query.order("created_at", { ascending: false, nullsFirst: false });
      break;
    case "recent":
    default:
      query.order("created_at", { ascending: false, nullsFirst: false });
      break;
  }
}

function escapeForILike(value: string) {
  return value.trim().replace(/[\\%_]/g, (match) => `\\${match}`);
}
