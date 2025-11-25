import { NextResponse } from "next/server";
import { getAdminClient } from "@/utils/supabase/admin";
import { sanitizeSearchParam } from "@shared/lib/sanitize";

const SORT_WHITELIST = new Set(["rating", "price", "title", "created_at"]);
const DEFAULT_BUCKET = process.env.SUPABASE_PRODUCT_BUCKET || "product-images";
const MAX_FETCH_LIMIT = 500;
const CACHE_CONTROL = "s-maxage=300, stale-while-revalidate=600";
const DEFAULT_CURRENCY = "EUR";

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
    const limit = toInt(params.get("limit"), 24, 1, 200);
    const statusFilterParam = (params.get("status") || "").trim().toLowerCase();
    const minRating = params.get("min_rating");
    const idsCsv = (params.get("ids") || "").trim();
    const ids = idsCsv ? idsCsv.split(",").map((s) => s.trim()).filter(Boolean) : [];
    const idsOrder = new Map(ids.map((id, index) => [id, index]));

    const desiredCount = Math.max(limit * page, limit, ids.length);
    const fetchLimit = Math.min(Math.max(desiredCount, limit), MAX_FETCH_LIMIT);

    const { data, error } = await supabase.rpc("api_catalog_list", {
      _category: category,
      _limit: fetchLimit,
      _offset: 0,
    });

    if (error) {
      console.warn("ecom-products: rpc failed", error);
      return json({ error: "db" }, 500);
    }

    const baseRows: Array<Record<string, unknown>> = Array.isArray(data) ? (data as any[]) : [];
    const supabaseUrl = pickSupabaseUrl();
    const bucket = DEFAULT_BUCKET;

    const baseIds = baseRows
      .map((row) => (row?.id != null ? String(row.id) : ""))
      .filter((value) => value.length > 0);

    let metadataRows: Array<Record<string, unknown>> = [];
    if (baseIds.length) {
      try {
        const { data: metaData, error: metaError } = await supabase
          .from("products")
          .select("id, status, category_slug, short_desc, currency")
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
      const title = row?.title != null ? String(row.title) : "";
      const priceRaw = typeof row?.price === "number" ? row.price : Number(row?.price ?? 0);
      const price = Number.isFinite(priceRaw) ? Math.max(priceRaw, 0) : 0;
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
      const currencySource =
        typeof row?.currency === "string" && row.currency.trim()
          ? String(row.currency).trim()
          : typeof meta?.currency === "string" && meta.currency.trim()
            ? meta.currency.trim()
            : DEFAULT_CURRENCY;
      const currencyValue = currencySource.toUpperCase();
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
        image_url: imageUrl,
        images: imageUrl ? [imageUrl] : [],
      };
    });

    let filtered = normalized.filter((item) => item.id);

    if (ids.length) {
      const idsSet = new Set(ids);
      filtered = filtered.filter((item) => idsSet.has(item.id));
      filtered.sort((a, b) => {
        const ai = idsOrder.get(a.id) ?? 0;
        const bi = idsOrder.get(b.id) ?? 0;
        return ai - bi;
      });
    }

    if (q) {
      const query = q.toLowerCase();
      filtered = filtered.filter((item) => item.title.toLowerCase().includes(query));
    }

    const minVal = Number(min);
    if (!Number.isNaN(minVal) && min !== null && min !== "") {
      filtered = filtered.filter((item) => item.price >= minVal);
    }

    const maxVal = Number(max);
    if (!Number.isNaN(maxVal) && max !== null && max !== "") {
      filtered = filtered.filter((item) => item.price <= maxVal);
    }

    const minRatingVal = Number(minRating);
    if (!Number.isNaN(minRatingVal) && minRating !== null && minRating !== "") {
      filtered = filtered.filter((item) => (item.rating ?? 0) >= minRatingVal);
    }

    const statusFilter =
      statusFilterParam && statusFilterParam !== "all" ? statusFilterParam : null;
    if (statusFilter) {
      filtered = filtered.filter(
        (item) => (item.status?.toLowerCase() ?? "") === statusFilter,
      );
    }

    const sortField = SORT_WHITELIST.has(sortRaw) ? sortRaw : "rating";
    filtered.sort((a, b) => {
      const direction = dir === "asc" ? 1 : -1;
      if (sortField === "title") {
        return direction * a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
      }
      if (sortField === "created_at") {
        const aTime = a.created_at ? Date.parse(a.created_at) || 0 : 0;
        const bTime = b.created_at ? Date.parse(b.created_at) || 0 : 0;
        return direction * (aTime - bTime);
      }
      if (sortField === "price") {
        return direction * (a.price - b.price);
      }
      const aRating =
        typeof a.rating === "number" && Number.isFinite(a.rating) ? a.rating : -Infinity;
      const bRating =
        typeof b.rating === "number" && Number.isFinite(b.rating) ? b.rating : -Infinity;
      return direction * (aRating - bRating);
    });

    const total = filtered.length;
    const start = Math.max(0, (page - 1) * limit);
    const end = start + limit;
    const items = filtered.slice(start, end);

    return json({ items, page, limit, total }, 200, CACHE_CONTROL);
  } catch (error) {
    console.error("ecom-products: unexpected error", error);
    return json({ error: "internal" }, 500);
  }
}
