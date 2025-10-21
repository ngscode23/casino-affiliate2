import { NextResponse } from "next/server";
import { getAdminClient } from "@/utils/supabase/admin";
import { sanitizeSearchParam } from "@shared/lib/sanitize";

const SORT_WHITELIST = new Set(["rating", "price", "title", "created_at"]);
const DEFAULT_BUCKET = process.env.SUPABASE_PRODUCT_BUCKET || "product-images";

function toInt(value: string | null, def: number, min: number, max: number) {
  const num = Number(value);
  if (!Number.isFinite(num)) return def;
  return Math.max(min, Math.min(max, Math.round(num)));
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
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
  if (/^https?:/i.test(path)) return path;
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
    const client = supabase as any;
    const url = new URL(request.url);
    const params = url.searchParams;

    const q = sanitizeSearchParam(params.get("q"));
    const category = sanitizeSearchParam(params.get("category"));
    const min = params.get("min");
    const max = params.get("max");
    const sortRaw = params.get("sort") || "rating";
    const dir = params.get("dir") === "asc" ? "asc" : "desc";
    const page = toInt(params.get("page"), 1, 1, 1000);
    const limit = toInt(params.get("limit"), 24, 1, 200);
    const status = (params.get("status") || "").trim().toLowerCase();
    const minRating = params.get("min_rating");
    const idsCsv = (params.get("ids") || "").trim();
    const ids = idsCsv ? idsCsv.split(",").map((s) => s.trim()).filter(Boolean) : [];

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = client
      .from("ecom_products")
      .select(
        "id,sku,slug,title,price,rating,images,short_desc,category_slug,tags,specs,created_at,status,image_path",
        { count: "exact" }
      );

    const DEFAULT_STATUSES = ["active", "published"] as const;

    if (ids.length) {
      query = query.in("id", ids);
    } else {
      if (category && category !== "all") query = query.eq("category_slug", category);
      const minVal = Number(min);
      if (!Number.isNaN(minVal) && min !== null && min !== "") query = query.gte("price", minVal);
      const maxVal = Number(max);
      if (!Number.isNaN(maxVal) && max !== null && max !== "") query = query.lte("price", maxVal);
      if (q) query = query.or(`title.ilike.%${q}%,short_desc.ilike.%${q}%`);
      if (status && status !== "all") {
        query = query.eq("status", status);
      } else {
        // Restrict to active/published by default to leverage partial indexes
        query = query.in("status", DEFAULT_STATUSES as unknown as string[]);
      }
    }

    const minRatingVal = Number(minRating);
    if (!Number.isNaN(minRatingVal) && minRating !== null && minRating !== "") {
      query = query.gte("rating", minRatingVal);
    }

    const sortField = SORT_WHITELIST.has(sortRaw) ? sortRaw : "rating";
    query = query.order(sortField, { ascending: dir === "asc" }).range(from, to);

    const { data, error, count } = await query;
    if (error) {
      console.warn("ecom-products: query failed", error);
      return json({ error: "db" }, 500);
    }

    const supabaseUrl = pickSupabaseUrl();
    const bucket = DEFAULT_BUCKET;

    let rows = Array.isArray(data) ? data : [];

    // Fallback: if fetching by specific ids and some are missing in ecom_products,
    // try to enrich from legacy `products` table so корзина может посчитать сумму.
    if (ids.length && rows.length < ids.length) {
      try {
        const foundIds = new Set<string>(rows.map((r: any) => String(r?.id ?? "")));
        const missingIds = ids.filter((id) => !foundIds.has(id));
        if (missingIds.length) {
          const { data: legacyRows, error: legacyErr } = await client
            .from("products")
            .select("id, slug, title, price_cents, currency, main_image_url, status")
            .in("id", missingIds);
          if (!legacyErr && Array.isArray(legacyRows) && legacyRows.length) {
            const mapped = legacyRows.map((p: any) => ({
              id: String(p.id),
              sku: null,
              slug: String(p.slug ?? ""),
              title: String(p.title ?? "Untitled"),
              price: typeof p.price_cents === "number" ? p.price_cents / 100 : 0,
              rating: null,
              images: p.main_image_url ? [String(p.main_image_url)] : [],
              short_desc: null,
              category_slug: null,
              tags: null,
              specs: null,
              created_at: null,
              status: String(p.status ?? "active"),
              image_path: null,
            }));
            rows = rows.concat(mapped);
          }
        }
      } catch (fallbackErr) {
        console.warn("ecom-products: legacy fallback failed", fallbackErr);
      }
    }

    const productIds = rows
      .map((row: any) => (row?.id ? String(row.id) : ""))
      .filter((value: string): value is string => Boolean(value))
      .filter((value: string, index: number, arr: string[]) => arr.indexOf(value) === index);
    const slugs = rows
      .map((row: any) => (row?.slug ? String(row.slug) : ""))
      .filter((value: string): value is string => Boolean(value))
      .filter((value: string, index: number, arr: string[]) => arr.indexOf(value) === index);

    const imagePathBySlug = new Map<string, string>();
    if (slugs.length) {
      try {
        const { data: slugRows, error: slugErr } = await client
          .from("ecom_products")
          .select("slug,image_path")
          .in("slug", slugs);
        if (!slugErr && Array.isArray(slugRows)) {
          for (const row of slugRows) {
            if (row?.slug && typeof row.image_path === "string") {
              imagePathBySlug.set(String(row.slug), row.image_path);
            }
          }
        }
      } catch (slugErr) {
        console.warn("ecom-products: ecom_products slug lookup failed", slugErr);
      }
    }

    const imagePathByProductId = new Map<string, string>();
    if (productIds.length) {
      try {
        const { data: versionRows, error: versionErr } = await client
          .from("ecom_product_image_versions")
          .select("product_id,path")
          .in("product_id", productIds)
          .eq("is_current", true);
        if (!versionErr && Array.isArray(versionRows)) {
          for (const row of versionRows) {
            if (row?.product_id && typeof row.path === "string") {
              imagePathByProductId.set(String(row.product_id), row.path);
            }
          }
        }
      } catch (versionErr) {
        console.warn("ecom-products: image versions lookup failed", versionErr);
      }
    }

    const items = rows.map((row: any) => {
      const idValue = row?.id ? String(row.id) : "";
      const slugValue = row?.slug ? String(row.slug) : "";
      const directPath = typeof row?.image_path === "string" ? row.image_path : null;
      const mappedPath = imagePathByProductId.get(idValue) ?? imagePathBySlug.get(slugValue) ?? directPath;
      const imageUrl = toPublicUrl(supabaseUrl, bucket, mappedPath) ||
        (Array.isArray(row?.images) && row.images[0] ? String(row.images[0]) : null);

      const imagesArray = Array.isArray(row?.images)
        ? (row.images as any[]).map((value) => String(value)).filter(Boolean)
        : [];

      let nextImages = imagesArray;
      if (imageUrl) {
        if (!imagesArray.length) {
          nextImages = [imageUrl];
        } else if (!imagesArray.includes(imageUrl)) {
          nextImages = [imageUrl, ...imagesArray.filter((value) => value !== imageUrl)];
        }
      }

      return {
        ...row,
        images: nextImages,
        image_url: imageUrl,
      };
    });

    return json({ items, page, limit, total: count ?? rows.length });
  } catch (error) {
    console.error("ecom-products: unexpected error", error);
    return json({ error: "internal" }, 500);
  }
}
