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
const ECOM_SELECT_COLUMNS =
  "id, sku, slug, title, price, price_cents, currency, status, category_slug, short_desc, images, image_path, main_image_url, is_available, inventory_status, stock_quantity, created_at";
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
    const sourceParam = sanitizeSearchParam(params.get("source"))?.toLowerCase();
    const wantsSkuSource = sourceParam === "sku";

    const supabaseUrl = pickSupabaseUrl();
    const bucket = DEFAULT_BUCKET;
    const isAdmin = await hasAdminAccess(request);
    const statusFilter =
      isAdmin && statusFilterParam && statusFilterParam !== "all" && ADMIN_STATUS_VALUES.has(statusFilterParam)
        ? statusFilterParam
        : null;
    let leadTimeMap = new Map<string, number>();

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
        sku: typeof (row as any).sku === "string" ? (row as any).sku : null,
        slug,
        title,
        price,
        price_cents: Math.round(price * 100),
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
        is_available: null,
        inventory_status: null,
        stock_quantity: null,
        lead_time_days: null,
      };
    };

    const mapEcomRow = (row: Record<string, unknown>) => {
      const id = row?.id != null ? String(row.id) : "";
      const slug = typeof row.slug === "string" ? row.slug : "";
      const title = typeof row.title === "string" ? row.title : slug || "Product";
      const priceCentsRaw =
        typeof (row as any).price_cents === "number"
          ? (row as any).price_cents
          : Number((row as any).price_cents ?? NaN);
      const priceRaw = typeof (row as any).price === "number" ? (row as any).price : Number((row as any).price ?? 0);
      const priceCents = Number.isFinite(priceCentsRaw)
        ? Math.round(priceCentsRaw)
        : Number.isFinite(priceRaw)
          ? Math.round(priceRaw * 100)
          : 0;
      const price = Number.isFinite(priceRaw) ? priceRaw : priceCents / 100;
      const currencyValue = String((row as any).currency || DEFAULT_CURRENCY).toUpperCase();
      const status = typeof row.status === "string" ? row.status : null;
      const categorySlug = typeof row.category_slug === "string" ? row.category_slug : null;
      const shortDesc = typeof row.short_desc === "string" ? row.short_desc : null;
      const mainImage = (row as any).main_image_url ?? (row as any).image_path ?? null;
      const imageUrl = toPublicUrl(supabaseUrl, bucket, mainImage);
      const imagesSource = Array.isArray((row as any).images) ? (row as any).images : [];
      const images = (imagesSource as unknown[])
        .map((value: unknown) =>
          typeof value === "string" ? toPublicUrl(supabaseUrl, bucket, value) ?? value : null,
        )
        .filter(Boolean) as string[];
      const leadTimeDays =
        leadTimeMap.has(id) && Number.isFinite(leadTimeMap.get(id) as number)
          ? (leadTimeMap.get(id) as number)
          : null;

      return {
        id,
        slug,
        title,
        price,
        price_cents: priceCents,
        rating: null,
        created_at: (row as any).created_at ?? null,
        thumbnail_path: mainImage ?? null,
        category_slug: categorySlug,
        status,
        currency: currencyValue,
        short_desc: shortDesc,
        catalog_product_id: (row as any).catalog_product_id ?? null,
        image_url: imageUrl,
        images: images.length ? images : imageUrl ? [imageUrl] : [],
        tags: Array.isArray((row as any).tags) ? (row as any).tags : [],
        specs: (row as any).specs ?? null,
        is_available: typeof (row as any).is_available === "boolean" ? (row as any).is_available : null,
        inventory_status: typeof (row as any).inventory_status === "string" ? (row as any).inventory_status : null,
        stock_quantity:
          typeof (row as any).stock_quantity === "number" ? (row as any).stock_quantity : null,
        lead_time_days: leadTimeDays,
      };
    };

    if (wantsSkuSource) {
      if (!isAdmin) {
        return json({ error: "forbidden" }, 403);
      }

      const pattern = q ? `%${q.replace(/[\\%_]/g, (match) => `\\${match}`)}%` : null;
      let query = supabase.from("ecom_products").select(ECOM_SELECT_COLUMNS, { count: "exact" });

      if (pattern) {
        query = query.or(`sku.ilike.${pattern},slug.ilike.${pattern},title.ilike.${pattern}`);
      }

      if (ids.length) {
        query = query.in("id", ids);
      }

      if (category) {
        query = query.eq("category_slug", category);
      }

      if (catalogProductIdFilter) {
        query = query.eq("catalog_product_id", catalogProductIdFilter);
      }

      if (statusFilter) {
        query = query.eq("status", statusFilter);
      }

      query = query.order("created_at", { ascending: false, nullsFirst: false });

      const start = Math.max(0, (page - 1) * limit);
      const end = start + limit - 1;
      const { data, error, count } = await query.range(start, end);

      if (error) {
        console.error("ecom-products: sku source query failed", error);
        return json({ error: "db" }, 500);
      }

      let leadTimeMap = new Map<string, number>();
      const skuIds = Array.isArray(data)
        ? data.map((row) => String((row as any)?.id ?? "")).filter(Boolean)
        : [];
      if (skuIds.length) {
        const { data: leadRows, error: leadError } = await supabase
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

      const items = Array.isArray(data)
        ? data.map((row) => {
            const mapped = mapEcomRow(row as Record<string, unknown>);
            const lead = leadTimeMap.get(mapped.id);
            return lead != null ? { ...mapped, lead_time_days: lead } : mapped;
          })
        : [];

      return json(
        { items, page, limit, total: typeof count === "number" ? count : items.length },
        200,
        CACHE_CONTROL,
      );
    }

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
      const items: Array<Record<string, unknown>> = [];
      const skuMap = new Map<string, Record<string, unknown>>();

      const { data: skuRows, error: skuError } = await supabase
        .from("ecom_products")
        .select(ECOM_SELECT_COLUMNS)
        .in("id", ids);

      const skuIds = Array.isArray(skuRows)
        ? skuRows.map((row) => String((row as any)?.id ?? "")).filter(Boolean)
        : [];
      if (skuIds.length) {
        const { data: leadRows, error: leadError } = await supabase
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
      if (!skuError && Array.isArray(skuRows)) {
        for (const row of skuRows) {
          const id = row?.id != null ? String((row as any).id) : "";
          if (!id) continue;
          skuMap.set(id, mapEcomRow(row as Record<string, unknown>));
        }
      }

      const missingIds = ids.filter((id) => !skuMap.has(id));
      const catalogMap = new Map<string, Record<string, unknown>>();

      if (missingIds.length) {
        let query = supabase.from("catalog_products_v").select(PRODUCT_SELECT_COLUMNS).in("id", missingIds);
        if (!isAdmin) {
          query = query.eq("status", "published");
        } else if (statusFilter) {
          query = query.eq("status", statusFilter);
        }

        const { data, error } = await query;
        if (error || !Array.isArray(data)) {
          console.warn("ecom-products: direct lookup failed", { error, ids: missingIds });
        } else {
          for (const row of data) {
            const id = row?.id != null ? String((row as any).id) : "";
            if (!id) continue;
            catalogMap.set(id, mapRow(row as Record<string, unknown>));
          }
        }
      }

      for (const id of ids) {
        const item = skuMap.get(id) ?? catalogMap.get(id);
        if (item) items.push(item);
      }

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
