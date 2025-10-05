// netlify/functions/ecom-products.ts
import type { Handler } from "@netlify/functions";
import { getServiceClient } from "@shared/netlify/shared/auth/supabase";

function json(body: any, statusCode = 200) {
  return {
    statusCode,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    body: JSON.stringify(body),
  };
}

const SORT_WHITELIST = new Set(["rating", "price", "title", "created_at"]);

function toInt(v: any, def: number, min: number, max: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export const handler: Handler = async (event) => {
  try {
    const supabase = getServiceClient();

    const qp = event.queryStringParameters || {};
    const q = (qp.q || "").toString().trim();
    const category = (qp.category || "").toString().trim();
    const min = Number(qp.min || "");
    const max = Number(qp.max || "");
    const sort = SORT_WHITELIST.has(String(qp.sort)) ? String(qp.sort) : "rating";
    const dir = String(qp.dir) === "asc" ? "asc" : "desc";
    const page = toInt(qp.page, 1, 1, 1000);
    const limit = toInt(qp.limit, 24, 1, 200);
    const status = (qp.status || "").toString().trim().toLowerCase();
    const minRating = Number(qp.min_rating || "");

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // optional: ids filter overrides text/category filters
    const idsCsv = (qp.ids || "").toString().trim();
    const ids = idsCsv ? idsCsv.split(",").map((s) => s.trim()).filter(Boolean) : [];

    let query = (supabase as any)
      .from("ecom_products")
      .select("id,sku,slug,title,price,rating,images,short_desc,category_slug,tags,specs,created_at,status", { count: "exact" });

    if (ids.length) {
      query = query.in("id", ids);
    } else {
      if (category && category !== "all") query = query.eq("category_slug", category);
      if (!Number.isNaN(min) && qp.min !== undefined && qp.min !== "") query = query.gte("price", min);
      if (!Number.isNaN(max) && qp.max !== undefined && qp.max !== "") query = query.lte("price", max);
      if (q) {
        // simple OR on title/short_desc; for arrays(tags) keep for later
        query = query.or(`title.ilike.%${q}%,short_desc.ilike.%${q}%`);
      }
      if (status && status !== "all") query = query.eq("status", status);
    }
    if (!Number.isNaN(minRating) && qp.min_rating !== undefined && qp.min_rating !== "") query = query.gte("rating", minRating);

    query = query.order(sort, { ascending: dir === "asc" }).range(from, to);

    const { data, error, count } = await query;
    if (error) return json({ error: "db" }, 500);

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
    const baseUrl = supabaseUrl.replace(/\/$/, "");
    const bucket = process.env.SUPABASE_PRODUCT_BUCKET || "product-images";

    const productIds = (data || [])
      .map((row: any) => (row?.id ? String(row.id) : ""))
      .filter((value: string, index: number, arr: string[]) => value && arr.indexOf(value) === index);
    const slugs = (data || [])
      .map((row: any) => (row?.slug ? String(row.slug) : ""))
      .filter((slugValue: string, index: number, arr: string[]) => slugValue && arr.indexOf(slugValue) === index);

    const imagePathBySlug = new Map<string, string>();
    if (slugs.length) {
      try {
        const { data: shopRows, error: shopError } = await (supabase as any)
          .from("shop.products")
          .select("slug,image_path")
          .in("slug", slugs);
        if (!shopError && Array.isArray(shopRows)) {
          for (const row of shopRows) {
            if (row?.slug && typeof row.image_path === "string") {
              imagePathBySlug.set(String(row.slug), row.image_path);
            }
          }
        }
      } catch (shopErr) {
        console.warn("ecom-products: shop.products lookup failed", shopErr);
      }
    }

    const imagePathByProductId = new Map<string, string>();
    if (productIds.length) {
      try {
        const { data: versionRows, error: versionError } = await (supabase as any)
          .from("ecom_product_image_versions")
          .select("product_id,path")
          .in("product_id", productIds)
          .eq("is_current", true);
        if (!versionError && Array.isArray(versionRows)) {
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

    function normalizePath(raw: string): string {
      const trimmed = raw.replace(/^\/+/, "");
      const bucketPrefix = `${bucket}/`;
      if (trimmed.startsWith(bucketPrefix)) {
        return trimmed.slice(bucketPrefix.length);
      }
      return trimmed;
    }

    function toPublicUrl(path: unknown): string | null {
      if (typeof path !== "string" || !path.trim()) return null;
      if (/^https?:/i.test(path)) return path;
      if (!baseUrl) return null;
      const objectPath = normalizePath(path.trim());
      const encoded = objectPath
        .split("/")
        .filter(Boolean)
        .map(encodeURIComponent)
        .join("/");
      return `${baseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encoded}`;
    }

    const items = (data || []).map((row: any) => {
      const idValue = row?.id ? String(row.id) : "";
      const slugValue = row?.slug ? String(row.slug) : "";
      const directPath = typeof row?.image_path === "string" ? row.image_path : null;
      const mappedPath = imagePathByProductId.get(idValue) ?? imagePathBySlug.get(slugValue) ?? directPath;
      const imageUrl = toPublicUrl(mappedPath) || (Array.isArray(row?.images) && row.images[0] ? String(row.images[0]) : null);

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

    return json({ items, page, limit, total: count ?? (data?.length || 0) });
  } catch (e) {
    return json({ error: "internal" }, 500);
  }
};

export default handler;



