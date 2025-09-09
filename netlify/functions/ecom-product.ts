// netlify/functions/ecom-product.ts
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

export const handler: Handler = async (event) => {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return json({ error: "misconfig" }, 500);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    const slug = (event.queryStringParameters?.slug || "").toString().trim();
    if (!slug) return json({ error: "bad_request" }, 400);

    const { data, error } = await (supabase as any)
      .from("ecom_products")
      .select("id,slug,title,price,rating,images,short_desc,category_slug,tags,specs,created_at")
      .eq("slug", slug)
      .single();

    if (error) return json({ error: "not_found" }, 404);
    return json({ item: data });
  } catch (e) {
    return json({ error: "internal" }, 500);
  }
};

export default handler;

