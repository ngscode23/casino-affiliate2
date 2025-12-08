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

const PRODUCT_TABLE = "product_with_discount_with_dataset";

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

  // Dataset handling:
  // - "all" (или пусто) трактуем как основной каталог ("shop"), чтобы legacy-товары по умолчанию не попадали в публичный список.
  // - "shop" явно ограничивает только новые товары.
  // - "legacy" оставляем как опцию для архивных карточек (например, в админке).
  if (filters.dataset === "shop") {
    query.eq("dataset", "shop");
  } else if (filters.dataset === "legacy") {
    query.eq("dataset", "legacy");
  }

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
    query.gte("effectivePriceCents", Math.max(0, filters.priceMinCents));
  }

  if (typeof filters.priceMaxCents === "number" && Number.isFinite(filters.priceMaxCents)) {
    query.lte("effectivePriceCents", Math.max(0, filters.priceMaxCents));
  }

  if (typeof filters.minRating === "number" && Number.isFinite(filters.minRating)) {
    query.gte("rating", filters.minRating);
  }

  if (filters.search) {
    const pattern = `%${escapeForILike(filters.search)}%`;
    query.or(`name.ilike.${pattern},slug.ilike.${pattern}`);
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
      query.order("effectivePriceCents", { ascending: true, nullsFirst: false });
      query.order("created_at", { ascending: false, nullsFirst: false });
      break;
    case "price-desc":
      query.order("effectivePriceCents", { ascending: false, nullsFirst: false });
      query.order("created_at", { ascending: false, nullsFirst: false });
      break;
    case "popular":
      query.order("rating", { ascending: false, nullsFirst: true });
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
