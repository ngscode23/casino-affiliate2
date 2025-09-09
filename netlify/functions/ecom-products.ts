// netlify/functions/ecom-products.ts
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL as string | undefined;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

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
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return json({ error: "misconfig" }, 500);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    const qp = event.queryStringParameters || {};
    const q = (qp.q || "").toString().trim();
    const category = (qp.category || "").toString().trim();
    const min = Number(qp.min || "");
    const max = Number(qp.max || "");
    const sort = SORT_WHITELIST.has(String(qp.sort)) ? String(qp.sort) : "rating";
    const dir = String(qp.dir) === "asc" ? "asc" : "desc";
    const page = toInt(qp.page, 1, 1, 1000);
    const limit = toInt(qp.limit, 24, 1, 200);

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = (supabase as any)
      .from("ecom_products")
      .select("id,slug,title,price,rating,images,short_desc,category_slug,tags,specs,created_at", { count: "exact" });

    if (category && category !== "all") query = query.eq("category_slug", category);
    if (!Number.isNaN(min) && qp.min !== undefined && qp.min !== "") query = query.gte("price", min);
    if (!Number.isNaN(max) && qp.max !== undefined && qp.max !== "") query = query.lte("price", max);
    if (q) {
      // simple OR on title/short_desc; for arrays(tags) keep for later
      query = query.or(`title.ilike.%${q}%,short_desc.ilike.%${q}%`);
    }

    query = query.order(sort, { ascending: dir === "asc" }).range(from, to);

    const { data, error, count } = await query;
    if (error) return json({ error: "db" }, 500);
    return json({ items: data || [], page, limit, total: count ?? (data?.length || 0) });
  } catch (e) {
    return json({ error: "internal" }, 500);
  }
};

export default handler;

