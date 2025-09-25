// netlify/functions/payments-create.ts
import type { Handler } from "@netlify/functions";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceClient } from "@shared/netlify/shared/auth/supabase";
import crypto from "node:crypto";


function json(b: unknown, s = 200) {
  return {
    statusCode: s,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
    body: JSON.stringify(b),
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json({ ok: false, code: "method_not_allowed" }, 405);
  try {
    const sb: SupabaseClient = getServiceClient();

    let payload: unknown = {};
    try {
      payload = JSON.parse(event.body || "{}");
    } catch (_e) { /* handled */ void _e; }

    const { order_id, amount, currency = "USD" } = (payload as { order_id?: string; amount?: number; currency?: string }) || {};
    if (!order_id || !amount) return json({ ok: false, code: "bad_request" }, 400);

    const { data, error } = await sb
      .from("payments")
      .insert({
        id: crypto.randomUUID(),
        order_id,
        amount,
        currency,
        provider: "demo",
        status: "pending",
      })
      .select("id")
      .single();

    if (error) return json({ ok: false, code: "db", message: error.message }, 500);
    return json({ ok: true, payment_id: (data as { id: string }).id });
  } catch (e: unknown) {
    return json({ ok: false, code: "internal", message: String((e as Error)?.message || e) }, 500);
  }
};

export default handler;



