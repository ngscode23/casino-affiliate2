// netlify/functions/admin-orders.ts
import type { Handler } from "@netlify/functions";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceClient } from "@shared/netlify/shared/auth/supabase";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN as string | undefined;

function json(body: unknown, statusCode = 200) {
  return { statusCode, headers: { "content-type": "application/json", "cache-control": "no-store" }, body: JSON.stringify(body) };
}

export const handler: Handler = async (event) => {
  // Auth by X-Admin-Token only (server-side summary)
  const token = (event.headers?.["x-admin-token"] || event.headers?.["X-Admin-Token"]) as string | undefined;
  if (!ADMIN_TOKEN || !token || token !== ADMIN_TOKEN) return json({ ok: false, code: "unauthorized" }, 401);

  const supa: SupabaseClient = getServiceClient();
  const days = Math.max(1, Math.min(365, Number(event.queryStringParameters?.days || 30)));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  try {
    // Pull from order_v2 for totals
    const { data, error } = await supa
      .from("order_v2")
      .select("status, amount_total")
      .gte("created_at", since);
    if (error) return json({ ok: false, code: "db", message: error.message }, 500);

    const rows = (data as Array<{ status: string; amount_total: number }>) || [];
    const total = rows.length;
    let pending = 0, processing = 0, succeeded = 0, failed = 0, cancelled = 0;
    let sum = 0;
    for (const r of rows) {
      sum += Number(r.amount_total || 0);
      const st = (r.status === 'paid') ? 'succeeded' : r.status; // normalize legacy
      if (st === 'pending') pending++;
      else if (st === 'processing') processing++;
      else if (st === 'succeeded') succeeded++;
      else if (st === 'failed') failed++;
      else if (st === 'cancelled') cancelled++;
    }
    const avg = total ? sum / total : 0;
    const failedShare = total ? failed / total : 0;
    const conversion = total ? succeeded / total : 0;
    return json({ ok: true, total, pending, processing, succeeded, failed, cancelled, average_check: Number(avg.toFixed(2)), failed_share: Number((failedShare*100).toFixed(2)), conversion: Number((conversion*100).toFixed(2)) });
  } catch (e: unknown) {
    return json({ ok: false, code: "internal", message: String((e as Error)?.message || e) }, 500);
  }
};

export default handler;



