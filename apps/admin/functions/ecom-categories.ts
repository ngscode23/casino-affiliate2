// netlify/functions/ecom-categories.ts
import type { Handler } from "@netlify/functions";
import { getServiceClient } from "@shared/netlify/shared/auth/supabase";

function json(body: any, statusCode = 200) {
  return {
    statusCode,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    body: JSON.stringify(body),
  };
}

export const handler: Handler = async () => {
  const supabase = getServiceClient();
  // Try to include color if present; if column missing, fallback to basic selection
  let res = await (supabase as any)
    .from("ecom_categories")
    .select("slug,name,icon,color")
    .order("name", { ascending: true });
  if (res.error) {
    res = await (supabase as any)
      .from("ecom_categories")
      .select("slug,name,icon")
      .order("name", { ascending: true });
  }
  if (res.error) return json({ error: "db" }, 500);
  return json({ items: res.data || [], count: (res.data || []).length });
};

export default handler;



