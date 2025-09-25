// netlify/functions/payments.ts
import type { Handler } from "@netlify/functions";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceClient } from "@shared/netlify/shared/auth/supabase";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN as string | undefined;

function json(body: unknown, statusCode = 200) {
  return {
    statusCode,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
    body: JSON.stringify(body),
  };
}

export const handler: Handler = async (event) => {
  const path = event.path || "";
  const supa: SupabaseClient = getServiceClient();

  if (/\/payments\/create$/i.test(path)) {
    if (event.httpMethod !== "POST") return json({ ok: false, code: "method_not_allowed" }, 405);
    const token = (event.headers?.["x-admin-token"] || event.headers?.["X-Admin-Token"]) as string | undefined;
    if (!ADMIN_TOKEN || !token || token !== ADMIN_TOKEN) return json({ ok: false, code: "unauthorized" }, 401);

    let raw: unknown = {};
    try {
      raw = JSON.parse(event.body || "{}");
    } catch (_e) { /* handled */ void _e; }
    const body = (raw as { order_id?: string }) || {};
    const order_id = String(body?.order_id || "");
    if (!order_id) return json({ ok: false, code: "bad_request" }, 400);

    // посчитать сумму по order_items
    type Item = { qty?: number; unit_price?: number; total?: number };
    const { data: sumRows, error: sErr } = await supa
      .from("order_items")
      .select("qty, unit_price, total")
      .eq("order_id", order_id);
    if (sErr) return json({ ok: false, code: "db", message: sErr.message }, 500);

    const items = (sumRows || []) as Item[];
    const amount = items.reduce((acc, r) => acc + Number(r.total ?? ((r.qty || 0) * (r.unit_price || 0))), 0);

    const { data, error } = await supa
      .from("payments")
      .insert({ order_id, provider: "testpay", provider_ref: "api-create", amount, currency: "EUR", status: "pending" })
      .select("id")
      .single();

    if (error) return json({ ok: false, code: "db", message: error.message }, 500);
    return json({ ok: true, payment_id: (data as { id: string }).id });
  }

  if (/\/payments\/webhook$/i.test(path)) {
    if (event.httpMethod !== "POST") return json({ ok: false, code: "method_not_allowed" }, 405);
    // в реальной жизни тут верифицируешь подпись провайдера
    let raw: unknown = {};
    try {
      raw = JSON.parse(event.body || "{}");
    } catch (_e) { /* handled */ void _e; }
    const body = (raw as { payment_id?: string; status?: string }) || {};
    const id = String(body?.payment_id || "");
    const status = String(body?.status || "");

    if (!id || !["succeeded", "failed"].includes(status)) {
      return json({ ok: false, code: "bad_request" }, 400);
    }

    const { error } = await supa
      .from("payments")
      .update({ status })
      .eq("id", id);
    if (error) return json({ ok: false, code: "db", message: error.message }, 500);

    // триггер сам поднимет orders.status = 'paid' когда status='succeeded'
    return json({ ok: true });
  }

  return json({ ok: false, code: "not_found" }, 404);
};

export default handler;



