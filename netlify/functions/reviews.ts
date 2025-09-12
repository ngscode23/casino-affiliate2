// netlify/functions/reviews.ts
// Subpaths:
//   /.netlify/functions/reviews/add   (POST { product_id, rating, title, body })
//   /.netlify/functions/reviews/list  (GET ?product_id=...)
// For add: requires Authorization: Bearer <supabase-jwt>

import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY) as
  | string
  | undefined;

function json(body: any, statusCode = 200) {
  return {
    statusCode,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    body: JSON.stringify(body),
  };
}

function getJwt(event: any): string | null {
  const auth = event.headers?.authorization || event.headers?.Authorization;
  if (!auth || typeof auth !== "string") return null;
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export const handler: Handler = async (event) => {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return json({ ok: false, code: "misconfig" }, 500);

    const path = event.path || "";
    const isAdd = /\/reviews\/add$/i.test(path);
    const isList = /\/reviews\/list$/i.test(path);

    if (isList) {
      if (event.httpMethod !== "GET") return json({ ok: false, code: "method_not_allowed" }, 405);
      const pid = String(event.queryStringParameters?.product_id || "").trim();
      if (!pid || !isUuid(pid)) return json({ ok: false, code: "bad_request", message: "product_id invalid" }, 400);
      // public (anon) client is fine for reading approved reviews
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
      const { data, error } = await (supabase as any)
        .from("product_reviews")
        .select("user_id, rating, title, body, created_at")
        .eq("product_id", pid)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) return json({ ok: false, code: "db", message: error.message }, 500);
      return json({ ok: true, items: data || [] });
    }

    if (isAdd) {
      if (event.httpMethod !== "POST") return json({ ok: false, code: "method_not_allowed" }, 405);
      const jwt = getJwt(event);
      if (!jwt) return json({ ok: false, code: "unauthorized" }, 401);
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${jwt}` } },
      });

      let body: any = {};
      try { body = JSON.parse(event.body || "{}"); } catch {}
      const pid = String(body?.product_id || "").trim();
      const rating = Number(body?.rating);
      const title = String(body?.title || "");
      const text = String(body?.text || body?.body || "");
      if (!pid || !isUuid(pid)) return json({ ok: false, code: "bad_request", message: "product_id invalid" }, 400);
      if (!Number.isFinite(rating) || rating < 1 || rating > 5) return json({ ok: false, code: "bad_request", message: "rating 1..5" }, 400);
      if (!title || !text) return json({ ok: false, code: "bad_request", message: "title/body required" }, 400);

      const { error } = await (supabase as any).rpc("add_product_review", {
        p_product_id: pid,
        p_rating: rating,
        p_title: title,
        p_body: text,
      });
      if (error) return json({ ok: false, code: "db", message: error.message }, 500);
      return json({ ok: true });
    }

    return json({ ok: false, code: "not_found" }, 404);
  } catch (e: any) {
    return json({ ok: false, code: "internal", message: String(e?.message || e) }, 500);
  }
};

export default handler;
