// netlify/functions/ecom-wishlist.ts
// One function handling subpaths:
//   /.netlify/functions/ecom-wishlist/list   (GET)
//   /.netlify/functions/ecom-wishlist/upsert (POST { product_id })
//   /.netlify/functions/ecom-wishlist/remove (POST { product_id })
// Auth: expects Supabase JWT in Authorization: Bearer <token>.

import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY) as
  | string
  | undefined;

function json(body: any, statusCode = 200) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
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
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return json({ ok: false, code: "misconfig", message: "Supabase env missing" }, 500);
    }

    const jwt = getJwt(event);
    if (!jwt) return json({ ok: false, code: "unauthorized", message: "Missing bearer token" }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    // Verify token and get user id
    const { data: u, error: uerr } = await supabase.auth.getUser();
    if (uerr || !u?.user?.id) return json({ ok: false, code: "unauthorized", message: "Invalid token" }, 401);
    const userId = u.user.id;

    const p = event.path || "";
    const isList = /\/ecom-wishlist\/list$/i.test(p);
    const isUpsert = /\/ecom-wishlist\/upsert$/i.test(p);
    const isRemove = /\/ecom-wishlist\/remove$/i.test(p);

    if (isList) {
      if (event.httpMethod !== "GET") return json({ ok: false, code: "method_not_allowed" }, 405);
      const { data, error } = await (supabase as any)
        .from("ecom_wishlist")
        .select("product_id, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) return json({ ok: false, code: "db", message: error.message }, 500);
      return json({ ok: true, items: data || [] });
    }

    if (isUpsert) {
      if (event.httpMethod !== "POST") return json({ ok: false, code: "method_not_allowed" }, 405);
      let payload: any = {};
      try { payload = JSON.parse(event.body || "{}"); } catch {}
      const pid = String(payload?.product_id || "").trim();
      if (!pid || !isUuid(pid)) return json({ ok: false, code: "bad_request", message: "product_id invalid" }, 400);

      const { error } = await (supabase as any)
        .from("ecom_wishlist")
        .upsert([{ user_id: userId, product_id: pid }], { onConflict: "user_id,product_id" });
      if (error) return json({ ok: false, code: "db", message: error.message }, 500);
      return json({ ok: true });
    }

    if (isRemove) {
      if (event.httpMethod !== "POST") return json({ ok: false, code: "method_not_allowed" }, 405);
      let payload: any = {};
      try { payload = JSON.parse(event.body || "{}"); } catch {}
      const pid = String(payload?.product_id || "").trim();
      if (!pid || !isUuid(pid)) return json({ ok: false, code: "bad_request", message: "product_id invalid" }, 400);

      const { error } = await (supabase as any)
        .from("ecom_wishlist")
        .delete()
        .eq("user_id", userId)
        .eq("product_id", pid);
      if (error) return json({ ok: false, code: "db", message: error.message }, 500);
      return json({ ok: true });
    }

    return json({ ok: false, code: "not_found" }, 404);
  } catch (e: any) {
    return json({ ok: false, code: "internal", message: String(e?.message || e) }, 500);
  }
};

export default handler;

