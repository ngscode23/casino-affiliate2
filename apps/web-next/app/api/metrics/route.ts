import { json, DAY_MS, qsNumber } from "../orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const supabase = getAdminClient();
  const url = new URL(request.url);
  const days = qsNumber(url.searchParams.get("days"), 14, { min: 1, max: 60, round: true });

  const now = new Date();
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
  const from = new Date(to.getTime() - days * DAY_MS);
  from.setUTCHours(0, 0, 0, 0);

  try {
    const [dailyRes, topRes] = await Promise.all([
      supabase.rpc("clicks_daily", { _from: from.toISOString(), _to: to.toISOString() }),
      supabase.rpc("top_offers_with_share", { _from: from.toISOString(), _to: to.toISOString(), _limit: 20 }),
    ]);

    if (dailyRes.error) {
      return json({ ok: false, code: "rpc_clicks_daily", message: dailyRes.error.message }, 500);
    }
    if (topRes.error) {
      return json({ ok: false, code: "rpc_top_offers", message: topRes.error.message }, 500);
    }

    const daily = (dailyRes.data ?? []) as Array<{ date: string; count: number }>;
    const topOffers = (topRes.data ?? []) as Array<{ slug: string; count: number; share: number }>;
    const total = daily.reduce((sum, r) => sum + (r.count || 0), 0);

    return json({
      days,
      total,
      daily,
      topOffers,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return json({ ok: false, code: "internal", message: String(err instanceof Error ? err.message : err) }, 500);
  }
}
