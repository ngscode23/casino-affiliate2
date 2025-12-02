import { NextResponse } from "next/server";
import { getAdminClient } from "@/utils/supabase/admin";
import { fetchProductListingPage, type ProductListFilters } from "@/lib/catalog/product-source";
import { sanitizeSearchParam } from "@shared/lib/sanitize";

const SORT_WHITELIST = new Set(["rating", "price", "title", "created_at"]);
const DEFAULT_BUCKET = process.env.SUPABASE_PRODUCT_BUCKET || "product-images";
const MAX_FETCH_LIMIT = 500;
const CACHE_CONTROL = "s-maxage=300, stale-while-revalidate=600";
const DEFAULT_CURRENCY = "EUR";
const PRODUCT_SELECT_COLUMNS =
  "id, slug, name, basePriceCents, effectivePriceCents, priceCents, hasDiscount, currency, category_slug, rating, created_at, thumbnail_path, thumbnail, dataset";

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

function parseCents(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
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
    const datasetParam = (params.get("dataset") || "").trim().toLowerCase();
    const minRating = params.get("min_rating");
    const idsCsv = (params.get("ids") || "").trim();
    const ids = idsCsv ? idsCsv.split(",").map((s) => s.trim()).filter(Boolean) : [];
    const idsOrder = new Map(ids.map((id, index) => [id, index]));
    const catalogProductIdFilter = sanitizeSearchParam(params.get("catalog_product_id"));

    const supabaseUrl = pickSupabaseUrl();
    const bucket = DEFAULT_BUCKET;

    // Special case: admin editor requests precise IDs (no other filters) -> need full rows with SKU, category, etc.
    if (
      ids.length &&
      !category &&
      !q &&
      !min &&
      !max &&
      !minRating &&
      !statusFilterParam &&
      !catalogProductIdFilter
    ) {
      const fallbackColumns =
        "id, slug, sku, title, price, rating, images, short_desc, category_slug, tags, status, currency, catalog_product_id, specs, created_at, main_image_url, image_path";

      const fetchDirectRows = async (table: "products" | "ecom_products", idList: string[]) => {
        if (!idList.length) return [];
        const { data, error } = await supabase.from(table).select(fallbackColumns).in("id", idList);
        if (error) {
          console.warn("ecom-products: direct lookup failed", { table, error, ids: idList });
          return [];
        }
        if (!Array.isArray(data) || !data.length) return [];
        return data as Array<Record<string, unknown>>;
      };

      const rowsById = new Map<string, Record<string, unknown>>();
      const pushRows = (rows: Array<Record<string, unknown>>) => {
        for (const row of rows) {
          const rawId = (row as Record<string, unknown>)?.id;
          const id = typeof rawId === "string" ? rawId : rawId != null ? String(rawId) : "";
          if (!id) continue;
          if (!rowsById.has(id)) {
            rowsById.set(id, row);
          }
        }
      };

      const productRows = await fetchDirectRows("products", ids);
      pushRows(productRows);

      const missingIds = ids.filter((id) => !rowsById.has(id));
      if (missingIds.length) {
        const legacyRows = await fetchDirectRows("ecom_products", missingIds);
        pushRows(legacyRows);
      }

      if (!rowsById.size) {
        console.warn("ecom-products: fallback lookup failed for ids", ids);
        return json({ items: [], page: 1, limit: ids.length, total: 0 });
      }

      const orderedRows = ids
        .map((id) => rowsById.get(id))
        .filter((row): row is Record<string, unknown> => Boolean(row));
      const fallbackRows = orderedRows.length ? orderedRows : Array.from(rowsById.values());

      const items = fallbackRows.map((row: any) => {
        const id = String(row.id ?? "");
        const slug = typeof row.slug === "string" ? row.slug : "";
        const title = typeof row.title === "string" ? row.title : "";
        const priceValue =
          typeof row.price === "number"
            ? row.price
            : Number(row.price ?? row.price_cents ?? 0);
        const price = Number.isFinite(priceValue) ? priceValue : 0;
          const ratingValue =
            typeof row.rating === "number"
              ? row.rating
              : row.rating != null
                ? Number(row.rating)
                : null;
        const rating = Number.isFinite(ratingValue ?? NaN) ? Number(ratingValue) : null;
        const imagesArray = Array.isArray(row.images)
          ? (row.images as (string | null | undefined)[])
              .map((value) => (value ? String(value) : ""))
              .filter(Boolean)
          : [];
        const rawImage =
          imagesArray[0] ??
          (typeof row.main_image_url === "string" ? row.main_image_url : null) ??
          null;
          const fallbackImage =
            rawImage ??
            (typeof row.image_path === "string"
              ? toPublicUrl(supabaseUrl, bucket, row.image_path)
              : null);
        const currencyValue = String(row.currency || DEFAULT_CURRENCY).toUpperCase();

        const tagsArray = Array.isArray(row.tags)
          ? (row.tags as (string | null | undefined)[])
              .map((value) => (value ? String(value) : ""))
              .filter(Boolean)
          : [];

        return {
          id,
          slug,
          title,
          price,
          rating,
          created_at: row.created_at ?? null,
          thumbnail_path: null,
          category_slug: row.category_slug ?? null,
          status: row.status ?? null,
          currency: currencyValue,
          short_desc: row.short_desc ?? null,
          catalog_product_id: row.catalog_product_id ?? null,
          image_url: fallbackImage,
          images: imagesArray.length ? imagesArray : fallbackImage ? [fallbackImage] : [],
          sku: typeof row.sku === "string" ? row.sku : null,
          tags: tagsArray,
          specs: row.specs ?? null,
        };
      });

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

    const priceMinCents = parsePriceBound(min);
    const priceMaxCents = parsePriceBound(max);
    const minRatingValue = (() => {
      if (minRating == null || minRating === "") return null;
      const parsed = Number(minRating);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    })();

    const sortColumn = SORT_WHITELIST.has(sortRaw) ? sortRaw : "rating";
    const direction = dir === "asc" ? "asc" : "desc";
    const requiresPostFilter =
      Boolean(catalogProductIdFilter) || (statusFilterParam && statusFilterParam !== "all");

    const listFilters: ProductListFilters = {
      search: q ?? undefined,
      category: category ?? undefined,
      dataset:
        datasetParam === "shop" || datasetParam === "legacy"
          ? (datasetParam as ProductListFilters["dataset"])
          : "all",
      priceMinCents,
      priceMaxCents,
      minRating: minRatingValue,
      sort: resolveListSort(sortColumn, direction),
    };

    const queryOffset = requiresPostFilter ? 0 : (page - 1) * limit;
    const queryLimit = requiresPostFilter ? MAX_FETCH_LIMIT : limit;

    const {
      rows: baseRows,
      count,
      error,
    } = await fetchProductListingPage({
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

    const baseIds = baseRows
      .map((row) => (row?.id != null ? String(row.id) : ""))
      .filter((value) => value.length > 0);

    let metadataRows: Array<Record<string, unknown>> = [];
    if (baseIds.length) {
      try {
        const { data: metaData, error: metaError } = await supabase
          .from("products")
          .select("id, status, category_slug, short_desc, currency, catalog_product_id")
          .in("id", baseIds);
        if (!metaError && Array.isArray(metaData)) {
          metadataRows = metaData as Array<Record<string, unknown>>;
        } else if (metaError) {
          console.warn("ecom-products: meta fetch failed", metaError);
        }
      } catch (metaErr) {
        console.warn("ecom-products: meta fetch threw", metaErr);
      }
    }

    const metaById = new Map<string, Record<string, unknown>>(
      metadataRows.map((row) => [String(row.id), row]),
    );

    if (process.env.NODE_ENV !== "production") {
      try {
        for (const row of baseRows) {
          console.debug("rpc item", row?.thumbnail_path, row?.slug);
        }
      } catch {
        // ignore debug logging failures
      }
    }

    const normalized = baseRows.map((row) => {
      const id = row?.id != null ? String(row.id) : "";
      const slug = row?.slug != null ? String(row.slug) : "";
      const titleSource = row?.title ?? row?.name ?? "";
      const title = typeof titleSource === "string" ? titleSource : "";
      const priceCentsValue =
        parseCents((row as Record<string, unknown>)?.effectivePriceCents) ??
        parseCents((row as Record<string, unknown>)?.priceCents) ??
        null;
      const price =
        priceCentsValue != null
          ? Math.max(priceCentsValue, 0) / 100
          : typeof row?.price === "number" && Number.isFinite(row.price)
            ? Math.max(row.price, 0)
            : Number.isFinite(Number(row?.price))
              ? Math.max(Number(row?.price), 0)
              : 0;
      const rating =
        typeof row?.rating === "number" && Number.isFinite(row.rating) ? Number(row.rating) : null;
      const createdAt = typeof row?.created_at === "string" ? row.created_at : null;
      const thumbnailPath =
        typeof row?.thumbnail_path === "string" && row.thumbnail_path.trim()
          ? row.thumbnail_path.trim()
          : null;
      const meta = metaById.get(id) ?? null;
      const statusValue =
        typeof meta?.status === "string" && meta.status.trim() ? meta.status.trim() : null;
      const catalogProductId =
        typeof meta?.catalog_product_id === "string" && meta.catalog_product_id.trim()
          ? meta.catalog_product_id.trim()
          : null;
      const currencySource =
        typeof row?.currency === "string" && row.currency.trim()
          ? String(row.currency).trim()
          : typeof meta?.currency === "string" && meta.currency.trim()
            ? meta.currency.trim()
            : DEFAULT_CURRENCY;
      const currencyValue = String(currencySource || DEFAULT_CURRENCY).toUpperCase();
      const categorySlug =
        typeof row?.category_slug === "string" && row.category_slug.trim()
          ? row.category_slug.trim()
          : typeof meta?.category_slug === "string" && meta.category_slug.trim()
            ? meta.category_slug.trim()
            : null;
      const shortDesc =
        typeof meta?.short_desc === "string" && meta.short_desc.trim() ? meta.short_desc.trim() : null;

      const imageUrl = toPublicUrl(supabaseUrl, bucket, thumbnailPath);

      return {
        id,
        slug,
        title,
        price,
        rating,
        created_at: createdAt,
        thumbnail_path: thumbnailPath,
        category_slug: categorySlug,
        status: statusValue,
        currency: currencyValue,
        short_desc: shortDesc,
        catalog_product_id: catalogProductId,
        image_url: imageUrl,
        images: imageUrl ? [imageUrl] : [],
      };
    });

    let filtered = normalized.filter((item) => item.id);

    if (catalogProductIdFilter) {
      filtered = filtered.filter((item) => item.catalog_product_id === catalogProductIdFilter);
    }

    if (statusFilterParam && statusFilterParam !== "all") {
      const statusFilter = statusFilterParam.toLowerCase();
      filtered = filtered.filter((item) => (item.status?.toLowerCase() ?? "") === statusFilter);
    }

    if (requiresPostFilter) {
      const start = Math.max(0, (page - 1) * limit);
      const end = start + limit;
      const total = filtered.length;
      const items = filtered.slice(start, end);
      return json({ items, page, limit, total }, 200, CACHE_CONTROL);
    }

    if (sortColumn === "title") {
      const directionFactor = direction === "asc" ? 1 : -1;
      filtered.sort((a, b) => directionFactor * a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
    }

    const total = typeof count === "number" ? count : filtered.length + queryOffset;
    return json({ items: filtered, page, limit, total }, 200, CACHE_CONTROL);
  } catch (error) {
    console.error("ecom-products: unexpected error", error);
    return json({ error: "internal" }, 500);
  }
}
