// netlify/functions/reviews.ts
// Routes:
//   GET  /.netlify/functions/reviews/list?product_id=<uuid>
//   GET  /.netlify/functions/reviews/list?source_schema=public&source_table=ecom_products&source_pk=<id>
//   POST /.netlify/functions/reviews/add
//        body: { rating, title, body|text, product_id? (uuid) | source_schema? source_table? source_pk? }
// Auth:
//   - list: public
//   - add:  requires Authorization: Bearer <supabase-jwt> (user session)

import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
//

const SUPABASE_URL = process.env.SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY) as string | undefined;
// no IP hashing in simplified flow

function json(body: unknown, statusCode = 200) {
  return {
    statusCode,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    body: JSON.stringify(body),
  };
}

function getJwt(event: { headers?: Record<string, string | undefined> }): string | null {
  const auth = (event.headers?.authorization || event.headers?.Authorization) as string | undefined;
  if (!auth || typeof auth !== "string") return null;
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

// helpers no longer needed after simplified add endpoint

export const handler: Handler = async (event) => {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return json({ ok: false, code: "misconfig" }, 500);

    const path = event.path || "";
    if (process.env.NODE_ENV !== 'production') {
      console.log("PATH:", event.path, "METHOD:", event.httpMethod, "QS:", event.queryStringParameters);
    }
    const isAdd = /\/reviews\/add\/?$/i.test(path);
    const isList = /\/reviews\/list\/?$/i.test(path);

    // Clients use anon key; for add we forward their JWT so RLS can see the user.

 if (isList) {
  if (event.httpMethod !== "GET")
    return json({ ok: false, code: "method_not_allowed" }, 405);

  const qs = event.queryStringParameters || {};
  const productId = String(qs.product_id || "").trim();
  const source_schema = String(qs.source_schema || "").trim();
  const source_table = String(qs.source_table || "").trim();
  const source_pk = String(qs.source_pk || "").trim();

  // публичный клиент (для чтения approved)
  const supabasePublic = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });

  let product_uid: string | null = null;

  // 1) пробуем по унифицированному триплету
  if (source_schema && source_table && source_pk) {
    const { data: cat, error: catErr } = await supabasePublic
      .from("product_catalog")
      .select("product_uid")
      .eq("source_schema", source_schema)
      .eq("source_table", source_table)
      .eq("source_pk", source_pk)
      .maybeSingle();
    if (catErr) return json({ ok: false, code: "db", message: catErr.message }, 500);
    product_uid = cat?.product_uid || null;
  }

  // 2) бэк-компат по product_id (это PK из public.ecom_products)
  if (!product_uid && productId) {
    if (!isUuid(productId)) return json({ ok: false, code: "bad_request", message: "product_id invalid" }, 400);
    const { data: cat, error: catErr } = await supabasePublic
      .from("product_catalog")
      .select("product_uid")
      .eq("source_schema", "public")
      .eq("source_table", "ecom_products")
      .eq("source_pk", productId)
      .maybeSingle();
    if (catErr) return json({ ok: false, code: "db", message: catErr.message }, 500);
    product_uid = cat?.product_uid || null;
  }

  if (!product_uid) {
    // товара ещё нет в каталоге → просто пусто
    return json({ ok: true, items: [], stats: null });
  }

  // 3) читаем только approved отзывы
  const { data: items, error: rErr } = await supabasePublic
    .from("reviews_unified")
    .select("rating, title, body, created_at")
    .eq("product_uid", product_uid)
    .eq("status", "approved")
    .order("created_at", { ascending: false, nullsFirst: false })
    .limit(100);
  if (rErr) return json({ ok: false, code: "db", message: rErr.message }, 500);

  // 4) статы
  const { data: stat, error: sErr } = await supabasePublic
    .from("product_rating_stats")
    .select("avg_rating, ratings_count")
    .eq("product_uid", product_uid)
    .maybeSingle();
  if (sErr) return json({ ok: false, code: "db", message: sErr.message }, 500);

  return json({ ok: true, items: items || [], stats: stat || null });
}

    if (isAdd) {
      if (event.httpMethod !== "POST") return json({ ok: false, code: "method_not_allowed" }, 405);

      const jwt = getJwt(event);
      if (!jwt) return json({ ok: false, code: "unauthorized" }, 401);

      // Client with anon key but user JWT so Supabase sees user context
      const supabaseAuthed = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${jwt}` } },
      });

      let raw: unknown = {};
      try {
        raw = JSON.parse(event.body || "{}");
      } catch (_e) { /* handled */ void _e; }

      type Body = { product_id?: string; rating?: number; title?: string; body?: string; text?: string };
      const payload = (raw as Partial<Body>) || {};

      // Strict validation path using product_id
      const product_id = String(payload?.product_id || "").trim();
      const r2 = Number(payload?.rating);
      const t2 = String(payload?.title || "").slice(0, 120);
      const b2 = String((payload?.text ?? payload?.body) || "").slice(0, 2000);

      if (!product_id || !isUuid(product_id))
        return json({ ok: false, code: "bad_request", message: "product_id invalid" }, 400);
      if (!Number.isInteger(r2) || r2 < 1 || r2 > 5)
        return json({ ok: false, code: "bad_request", message: "rating 1..5" }, 400);
      if (!t2 || !b2)
        return json({ ok: false, code: "bad_request", message: "title/body required" }, 400);

      const addRes = await supabaseAuthed.rpc("add_product_review", {
        p_product_id: product_id,
        p_rating: r2,
        p_title: t2,
        p_body: b2,
      });
      if (addRes?.error) return json({ ok: false, code: "db", message: addRes.error.message }, 500);
      return json({ ok: true });
    }

    return json({ ok: false, code: "not_found" }, 404);
  } catch (e: unknown) {
    return json({ ok: false, code: "internal", message: String((e as Error)?.message || e) }, 500);
  }
};

export default handler;

