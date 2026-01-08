import { NextResponse } from "next/server";
import { getAdminClient } from "@/utils/supabase/admin";
import { fetchProductListingPage, type ProductListFilters } from "@/lib/catalog/product-source";
import { sanitizeSearchParam } from "@shared/lib/sanitize";
import { requireAdmin } from "@/utils/auth/guard";

const SORT_WHITELIST = new Set(["rating", "price", "title", "created_at"]);
const DEFAULT_BUCKET = process.env.SUPABASE_PRODUCT_BUCKET || "product-images";
const MAX_FETCH_LIMIT = 500;
const CACHE_CONTROL = "s-maxage=300, stale-while-revalidate=600";
const DEFAULT_CURRENCY = "EUR";
const PRODUCT_SELECT_COLUMNS =
  "id, slug, title, description, price, currency, status, category_slug, category_title, thumbnail_url, specs, created_at, updated_at, brand_slug, brand_name";
const ADMIN_STATUS_VALUES = new Set(["draft", "published", "archived"]);

function toInt(value: string | null, def: number, min: number, max: number) {
  const num = Number(value);
  if (!Number.isFinite(num)) return def;
  return Math.max(min, Math.min(max, Math.round(num)));
}

function json(body: unknown, status = 200, cacheControl?: string) {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", cacheControl ?? "no-store");
  return response;
}

function pickSupabaseUrl(): string {
  const candidates = [process.env.SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_URL];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  return "";
}

function normalizePath(raw: string, bucket: string): string {
  const trimmed = raw.replace(/^\/+/, "");
  const bucketPrefix = `${bucket}/`;
  if (trimmed.startsWith(bucketPrefix)) {
    return trimmed.slice(bucketPrefix.length);
  }
  return trimmed;
}

function toPublicUrl(baseUrl: string, bucket: string, path: unknown): string | null {
  if (typeof path !== "string" || !path.trim()) return null;
  if (/^https?:/i.test(path)) return path.trim();
  if (!baseUrl) return null;
  const objectPath = normalizePath(path.trim(), bucket)
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
  return `${baseUrl.replace(/\/$/, "")}/storage/v1/object/public/${encodeURIComponent(bucket)}/${objectPath}`;
}

function parsePriceBound(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(Math.max(0, parsed) * 100);
}

function resolveListSort(column: string, direction: "asc" | "desc"): ProductListFilters["sort"] {
  switch (column) {
    case "price":
      return direction === "asc" ? "price-asc" : "price-desc";
    case "created_at":
      return "recent";
    case "rating":
      return "popular";
    case "title":
      return "recent";
    default:
      return "popular";
  }
}

async function hasAdminAccess(request: Request): Promise<boolean> {
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!header) return false;
  const auth = await requireAdmin(request);
  return !("response" in auth);
}

export async function GET(request: Request) {
  try {
    const supabase = getAdminClient();
    const url = new URL(request.url);
    const params = url.searchParams;

    const q = sanitizeSearchParam(params.get("q"));
    const categoryParam = sanitizeSearchParam(params.get("category"));
    const category = categoryParam && categoryParam !== "all" ? categoryParam : null;
    const min = params.get("min");
    const max = params.get("max");
    const sortRaw = params.get("sort") || "rating";
    const dir = params.get("dir") === "asc" ? "asc" : "desc";
    const page = toInt(params.get("page"), 1, 1, 1000);
    const limit = toInt(params.get("limit"), 24, 1, MAX_FETCH_LIMIT);
    const statusFilterParam = (params.get("status") || "").trim().toLowerCase();
    const minRating = params.get("min_rating");
    const idsCsv = (params.get("ids") || "").trim();
    const ids = idsCsv ? idsCsv.split(",").map((s) => s.trim()).filter(Boolean) : [];
    const idsOrder = new Map(ids.map((id, index) => [id, index]));
    const catalogProductIdFilter = sanitizeSearchParam(params.get("catalog_product_id"));

    const supabaseUrl = pickSupabaseUrl();
    const bucket = DEFAULT_BUCKET;
    const isAdmin = await hasAdminAccess(request);
    const statusFilter =
      isAdmin && statusFilterParam && statusFilterParam !== "all" && ADMIN_STATUS_VALUES.has(statusFilterParam)
        ? statusFilterParam
        : null;

    const mapRow = (row: Record<string, unknown>) => {
      const id = row?.id != null ? String(row.id) : "";
      const slug = typeof row.slug === "string" ? row.slug : "";
      const title = typeof row.title === "string" ? row.title : slug || "Product";
      const priceValue = typeof row.price === "number" ? row.price : Number(row.price ?? 0);
      const price = Number.isFinite(priceValue) ? priceValue : 0;
      const currencyValue = String((row as any).currency || DEFAULT_CURRENCY).toUpperCase();
      const status = typeof row.status === "string" ? row.status : null;
      const categorySlug = typeof row.category_slug === "string" ? row.category_slug : null;
      const shortDesc = typeof row.description === "string" ? row.description : null;
      const imageUrl = toPublicUrl(supabaseUrl, bucket, (row as any).thumbnail_url ?? null);

      return {
        id,
        slug,
        title,
        price,
        rating: null,
        created_at: (row as any).created_at ?? null,
        thumbnail_path: (row as any).thumbnail_url ?? null,
        category_slug: categorySlug,
        status,
        currency: currencyValue,
        short_desc: shortDesc,
        catalog_product_id: id,
        image_url: imageUrl,
        images: imageUrl ? [imageUrl] : [],
        tags: [],
        specs: (row as any).specs ?? null,
      };
    };

    if (
      ids.length &&
      !category &&
      !q &&
      !min &&
      !max &&
      !minRating &&
      !statusFilter &&
      !catalogProductIdFilter
    ) {
      let query = supabase.from("catalog_products_v").select(PRODUCT_SELECT_COLUMNS).in("id", ids);
      if (!isAdmin) {
        query = query.eq("status", "published");
      } else if (statusFilter) {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error || !Array.isArray(data)) {
        console.warn("ecom-products: direct lookup failed", { error, ids });
        return json({ items: [], page: 1, limit: ids.length, total: 0 });
      }

      const items = data.map((row) => mapRow(row as Record<string, unknown>));
      items.sort((a, b) => {
        const ai = idsOrder.get(String(a.id)) ?? 0;
        const bi = idsOrder.get(String(b.id)) ?? 0;
        return ai - bi;
      });

      return json(
        {
          items,
          page: 1,
          limit: items.length,
          total: items.length,
        },
        200,
        "no-store",
      );
    }

    // Admin browsing: allow draft/archived visibility, keep consistent pagination (count + range).
    if (isAdmin) {
      const priceMinCents = parsePriceBound(min);
      const priceMaxCents = parsePriceBound(max);
      const sortColumn = SORT_WHITELIST.has(sortRaw) ? sortRaw : "created_at";
      const direction = dir === "asc" ? "asc" : "desc";

      let query = supabase
        .from("catalog_products_v")
        .select(PRODUCT_SELECT_COLUMNS, { count: "exact" });

      if (category) {
        query = query.eq("category_slug", category);
      }

      if (q) {
        const pattern = `%${q.replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
        query = query.or(`title.ilike.${pattern},slug.ilike.${pattern}`);
      }

      if (typeof priceMinCents === "number" && Number.isFinite(priceMinCents)) {
        query = query.gte("price", Math.max(0, priceMinCents) / 100);
      }
      if (typeof priceMaxCents === "number" && Number.isFinite(priceMaxCents)) {
        query = query.lte("price", Math.max(0, priceMaxCents) / 100);
      }

      if (statusFilter) {
        query = query.eq("status", statusFilter);
      }

      if (catalogProductIdFilter) {
        query = query.eq("id", catalogProductIdFilter);
      }

      switch (sortColumn) {
        case "price":
          query = query.order("price", { ascending: direction === "asc", nullsFirst: false });
          query = query.order("created_at", { ascending: false, nullsFirst: false });
          break;
        case "title":
          query = query.order("title", { ascending: direction === "asc", nullsFirst: false });
          query = query.order("created_at", { ascending: false, nullsFirst: false });
          break;
        case "created_at":
        default:
          query = query.order("created_at", { ascending: direction === "asc", nullsFirst: false });
          break;
      }

      const start = Math.max(0, (page - 1) * limit);
      const end = start + limit - 1;
      const { data, error, count } = await query.range(start, end);

      if (error) {
        console.error("ecom-products: admin query failed", error);
        return json({ error: "db" }, 500);
      }

      const items = Array.isArray(data) ? data.map((row) => mapRow(row as Record<string, unknown>)) : [];
      return json({ items, page, limit, total: typeof count === "number" ? count : items.length }, 200, CACHE_CONTROL);
    }

    const priceMinCents = parsePriceBound(min);
    const priceMaxCents = parsePriceBound(max);
    const sortColumn = SORT_WHITELIST.has(sortRaw) ? sortRaw : "rating";
    const direction = dir === "asc" ? "asc" : "desc";
    const requiresPostFilter = Boolean(catalogProductIdFilter);

    const listFilters: ProductListFilters = {
      search: q ?? undefined,
      category: category ?? undefined,
      priceMinCents,
      priceMaxCents,
      sort: resolveListSort(sortColumn, direction),
    };

    const queryOffset = requiresPostFilter ? 0 : (page - 1) * limit;
    const queryLimit = requiresPostFilter ? MAX_FETCH_LIMIT : limit;

    const { rows: baseRows, count, error } = await fetchProductListingPage({
      supabase,
      select: PRODUCT_SELECT_COLUMNS,
      filters: listFilters,
      limit: queryLimit,
      offset: queryOffset,
      withCount: !requiresPostFilter,
    });

    if (error) {
      console.error("ecom-products: query failed", error);
      return json({ error: "db" }, 500);
    }

    let items = baseRows.map((row) => mapRow(row as Record<string, unknown>)).filter((item) => item.id);

    items = items.filter((item) => (item.status?.toLowerCase() ?? "") === "published");

    if (catalogProductIdFilter) {
      items = items.filter((item) => item.catalog_product_id == catalogProductIdFilter || item.id == catalogProductIdFilter);
    }

    if (requiresPostFilter) {
      const start = Math.max(0, (page - 1) * limit);
      const end = start + limit;
      const total = items.length;
      const pageItems = items.slice(start, end);
      return json({ items: pageItems, page, limit, total }, 200, CACHE_CONTROL);
    }

    if (sortColumn === "title") {
      const directionFactor = direction === "asc" ? 1 : -1;
      items.sort((a, b) => directionFactor * a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
    }

    const total = typeof count === "number" ? count : items.length + queryOffset;
    return json({ items, page, limit, total }, 200, CACHE_CONTROL);
  } catch (error) {
    console.error("ecom-products: unexpected error", error);
    return json({ error: "internal" }, 500);
  }
}
