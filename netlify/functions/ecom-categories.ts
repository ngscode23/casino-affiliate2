// netlify/functions/ecom-categories.ts
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

export const handler: Handler = async () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return json({ error: "misconfig" }, 500);
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data, error } = await (supabase as any)
    .from("ecom_categories")
    .select("slug,name,icon")
    .order("name", { ascending: true });
  if (error) return json({ error: "db" }, 500);
  return json({ items: data || [], count: (data || []).length });
};

export default handler;

