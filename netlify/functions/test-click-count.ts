// netlify/functions/test-click-count.ts
// Lightweight test helper: returns recent clicks count for a slug
// Usage: GET ?slug=lucky-star&since_sec=600
// Requires SUPABASE_URL + SUPABASE_SECRET_KEY
import type { Handler } from "@netlify/functions";
import { getServiceClient } from "../lib/shared/auth/supabase";

export const handler: Handler = async (event) => {
  try {
    const slug = String(event.queryStringParameters?.slug || "").trim();
    const sinceSec = Math.max(0, Math.min(24*3600, Number(event.queryStringParameters?.since_sec || 600)));
    if (!slug) return { statusCode: 400, body: JSON.stringify({ error: "slug required" }) };
    const supabase = getServiceClient();
    const sinceIso = new Date(Date.now() - sinceSec*1000).toISOString();
    const { data, error } = await (supabase as any)
      .from('clicks')
      .select('id', { count: 'exact', head: true })
      .eq('slug', slug)
      .gte('ts', sinceIso);
    if (error) throw error;
    // count is in data?.length for head: true? Supabase sets count on response
    // @ts-ignore
    const count = (data && data.length) ? data.length : (error ? 0 : (supabase as any).postgrest?.count) || null;
    return { statusCode: 200, body: JSON.stringify({ ok: true, since_sec: sinceSec, slug, count: (count ?? 0) }) };
  } catch (e: any) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e?.message || e) }) };
  }
};

export default handler;

