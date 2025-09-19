// netlify/functions/payments-webhook.ts
import type { Handler } from "@netlify/functions";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceClient } from "../lib/shared/auth/supabase";


function json(b: unknown, s = 200) {
  return { statusCode: s, headers: { "content-type": "application/json", "cache-control": "no-store" }, body: JSON.stringify(b) };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json({ ok: false, code: "method_not_allowed" }, 405);
  try {
    const sb: SupabaseClient = getServiceClient();
    let payload: unknown = {};
    try {
      payload = JSON.parse(event.body || "{}");
    } catch (_e) { /* handled */ void _e; }

    const { payment_id, status } = (payload as { payment_id?: string; status?: string }) || {};
    if (!payment_id || !status) return json({ ok: false, code: "bad_request" }, 400);

    // update payment status
    const { data: pay, error: pErr } = await sb
      .from("payments")
      .update({ status })
      .eq("id", payment_id)
      .select("order_id,status")
      .maybeSingle();

    if (pErr || !pay) return json({ ok: false, code: "db", message: pErr?.message || "not_found" }, 500);

    // successful payments mark order as succeeded (align with allowed status values)
    if ((pay as { status?: string })?.status === "succeeded") {
      const { error: oErr } = await sb
        .from("orders")
        .update({ status: "succeeded", paid_at: new Date().toISOString() })
        .eq("id", (pay as { order_id: string }).order_id);
      if (oErr) return json({ ok: false, code: "db", message: oErr.message }, 500);
    }

    return json({ ok: true });
  } catch (e: unknown) {
    return json({ ok: false, code: "internal", message: String((e as Error)?.message || e) }, 500);
  }
};

export default handler;
