// netlify/functions/reviews-admin.ts
// Admin-only moderation endpoints for product reviews.
// Auth: header `x-admin-token: <ADMIN_TOKEN>` must match env ADMIN_TOKEN.
// Subpaths:
//   GET  /.netlify/functions/reviews-admin/pending?limit=50
//   POST /.netlify/functions/reviews-admin/approve  { product_id, user_id }
//   POST /.netlify/functions/reviews-admin/reject   { product_id, user_id, reason? }

import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL as string | undefined;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN as string | undefined;

function json(body: any, statusCode = 200) {
  return {
    statusCode,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    body: JSON.stringify(body),
  };
}

function isUuid(v: string): boolean { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v); }

export const handler: Handler = async (event) => {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return json({ ok: false, code: "misconfig" }, 500);
    if (!ADMIN_TOKEN) return json({ ok: false, code: "misconfig", message: "ADMIN_TOKEN missing" }, 500);
    const token = event.headers?.["x-admin-token"] || event.headers?.["X-Admin-Token"];
    if (!token || token !== ADMIN_TOKEN) return json({ ok: false, code: "unauthorized" }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const path = event.path || "";

    if (/\/reviews-admin\/pending$/i.test(path)) {
      const lim = Math.max(1, Math.min(200, Number(event.queryStringParameters?.limit || 50)));
      const { data, error } = await (supabase as any)
        .from('product_reviews')
        .select('product_id,user_id,rating,title,body,created_at')
        .eq('status','pending')
        .order('created_at', { ascending: false })
        .limit(lim);
      if (error) return json({ ok: false, code: 'db', message: error.message }, 500);
      return json({ ok: true, items: data || [] });
    }

    if (/\/reviews-admin\/(approve|reject)$/i.test(path)) {
      if (event.httpMethod !== 'POST') return json({ ok: false, code: 'method_not_allowed' }, 405);
      let body: any = {};
      try { body = JSON.parse(event.body || '{}'); } catch {}
      const pid = String(body?.product_id || '').trim();
      const uid = String(body?.user_id || '').trim();
      if (!isUuid(pid) || !isUuid(uid)) return json({ ok: false, code: 'bad_request' }, 400);
      const approve = /\/approve$/i.test(path);
      const status = approve ? 'approved' : 'rejected';
      const { error } = await (supabase as any)
        .from('product_reviews')
        .update({ status })
        .eq('product_id', pid)
        .eq('user_id', uid)
        .neq('status', status);
      if (error) return json({ ok: false, code: 'db', message: error.message }, 500);
      return json({ ok: true });
    }

    return json({ ok: false, code: 'not_found' }, 404);
  } catch (e: any) {
    return json({ ok: false, code: 'internal', message: String(e?.message || e) }, 500);
  }
};

export default handler;

