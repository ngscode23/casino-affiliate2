// netlify/functions/reviews-admin.ts
// Admin-only moderation endpoints for product reviews.
// Auth: header `x-admin-token: <ADMIN_TOKEN>` must match env ADMIN_TOKEN.
//
// Routes:
//   GET  /.netlify/functions/reviews-admin/pending?limit=50
//   POST /.netlify/functions/reviews-admin/approve { user_id, product_id? | source_schema+source_table+source_pk }
//   POST /.netlify/functions/reviews-admin/reject  { user_id, product_id? | source_schema+source_table+source_pk, reason? }

import type { Handler } from "@netlify/functions";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceClient } from "@shared/netlify/shared/auth/supabase";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN as string | undefined;

function json(body: unknown, statusCode = 200) {
  return { statusCode, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }, body: JSON.stringify(body) };
}
function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}
type ResolveSrc = {
  source_schema?: string;
  source_table?: string;
  source_pk?: string;
  product_id?: string;
};

async function resolveProductUid(sb: SupabaseClient, src: ResolveSrc): Promise<string | null> {
  const source_schema = String(src?.source_schema || "").trim();
  const source_table  = String(src?.source_table  || "").trim();
  const source_pk     = String(src?.source_pk     || "").trim();
  if (source_schema && source_table && source_pk) {
    const { data, error } = await sb.from("product_catalog")
      .select("product_uid").eq("source_schema", source_schema).eq("source_table", source_table).eq("source_pk", source_pk).maybeSingle();
    if (error) throw new Error(error.message);
    return data?.product_uid ?? null;
  }
  const legacyPid = String(src?.product_id || "").trim();
  if (legacyPid && isUuid(legacyPid)) {
    const { data, error } = await sb.from("product_catalog")
      .select("product_uid").eq("source_schema","public").eq("source_table","ecom_products").eq("source_pk", legacyPid).maybeSingle();
    if (error) throw new Error(error.message);
    return data?.product_uid ?? null;
  }
  return null;
}

export const handler: Handler = async (event) => {
  try {
    if (!ADMIN_TOKEN) return json({ ok:false, code:"misconfig", message:"ADMIN_TOKEN missing" }, 500);

    const token = (event.headers?.["x-admin-token"] || event.headers?.["X-Admin-Token"]) as string | undefined;
    if (!token || token !== ADMIN_TOKEN) return json({ ok:false, code:"unauthorized" }, 401);

    const sb: SupabaseClient = getServiceClient();
    const path = event.path || "";
    if (process.env.NODE_ENV !== 'production') {
      console.log("PATH:", event.path, "METHOD:", event.httpMethod, "QS:", event.queryStringParameters);
    }

    // PENDING
    if (/\/reviews-admin\/pending\/?$/i.test(path)) {
      const lim = Math.max(1, Math.min(200, Number(event.queryStringParameters?.limit || 50)));
      const { data, error } = await sb
        .from("product_reviews_admin_v")
        .select("id, product_uid, source_schema, source_table, source_pk, product_title, product_slug, rating, review_title, review_body, status, created_at")
        .eq("status","pending")
        .order("created_at", { ascending: false })
        .limit(lim);
      if (error) return json({ ok:false, code:"db", message:error.message }, 500);
      return json({ ok:true, items: data || [] });
    }

    // APPROVE / REJECT
    if (/\/reviews-admin\/(approve|reject)\/?$/i.test(path)) {
      if (event.httpMethod !== "POST") return json({ ok:false, code:"method_not_allowed" }, 405);
      let body: unknown = {};
      try { body = JSON.parse(event.body || "{}"); } catch (_e) { /* handled */ void _e; }
      const b = body as Partial<ResolveSrc> & { user_id?: string };
      const user_id = String(b?.user_id || "").trim();
      if (!isUuid(user_id)) return json({ ok:false, code:"bad_request", message:"user_id invalid" }, 400);

      const product_uid = await resolveProductUid(sb, b);
      if (!product_uid) return json({ ok:false, code:"bad_request", message:"unknown product" }, 400);

      const newStatus = /\/approve\/?$/i.test(path) ? "approved" : "rejected";

      // найдём целевую запись: последний отзыв этой пары, у которого статус отличается от целевого
      const { data: review, error: findErr } = await sb
        .from("reviews_unified")
        .select("id, status")
        .eq("product_uid", product_uid)
        .eq("user_id", user_id)
        .neq("status", newStatus)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (findErr) return json({ ok:false, code:"db", message: findErr.message }, 500);
      if (!review) return json({ ok:true, changed: false });

      // 1) Пытаемся через RPC (атомарно и безопасно к индексу)
      const rpcRes = await sb.rpc("admin_set_review_status", { p_review_id: review.id, p_status: newStatus });
      if (!rpcRes.error) return json({ ok:true, changed:true });

      // 2) Fallback без RPC: делаем два апдейта по очереди
      //    a) сначала опускаем остальные активные, чтобы уникальный индекс не заорал
      const drop = await sb
        .from("reviews_unified")
        .update({ status: "rejected" })
        .eq("product_uid", product_uid)
        .eq("user_id", user_id)
        .in("status", ["pending","approved"])
        .neq("id", review.id)
        .select("id");

      if (drop.error) return json({ ok:false, code:"db", message: drop.error.message }, 500);

      //    b) теперь целевую ставим в нужный статус
      const upd = await sb
        .from("reviews_unified")
        .update({ status: newStatus })
        .eq("id", review.id)
        .select("id")
        .single();

      if (upd.error) return json({ ok:false, code:"db", message: upd.error.message }, 500);

      //    c) попытаться пересчитать статы (если есть RPC — ок; если нет — забьём, триггер/следующий апдейт покроет)
      try {
        await sb.rpc("recalc_product_rating", { p_product_uid: product_uid });
      } catch (_e) { /* handled */ void _e; }

      return json({ ok:true, changed:true });
    }

    return json({ ok:false, code:"not_found" }, 404);
  } catch (e: unknown) {
    return json({ ok:false, code:"internal", message:String((e as Error)?.message || e) }, 500);
  }
};

export default handler;


