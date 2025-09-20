// netlify/functions/ecom-product.ts
import type { Handler } from "@netlify/functions";
import { getServiceClient } from "@shared/netlify/shared/auth/supabase";

function json(body: any, statusCode = 200) {
  return {
    statusCode,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    body: JSON.stringify(body),
  };
}

export const handler: Handler = async (event) => {
  try {
    const supabase = getServiceClient();

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


