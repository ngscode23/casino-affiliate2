// netlify/functions/metrics.ts
// Admin metrics endpoint: daily clicks + top offers for last N days
// Auth: requires x-admin-token matching ADMIN_TOKEN env var

import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL as string | undefined;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN as string | undefined;

type DailyRow = { date: string; count: number };
type TopRow = { slug: string; count: number };

function clampDays(raw: unknown): number {
  const n = Number(raw);
  if (!isFinite(n) || Number.isNaN(n)) return 14;
  const i = Math.round(n);
  if (i < 1) return 1;
  if (i > 60) return 60;
  return i;
}

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

export const handler: Handler = async (event) => {
  try {
    const token = event.headers["x-admin-token"] || event.headers["X-Admin-Token"];
    if (!ADMIN_TOKEN || !token || token !== ADMIN_TOKEN) {
      return { statusCode: 403, body: "" };
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return json({ error: "internal" }, 500);
    }

    const days = clampDays(event.queryStringParameters?.days);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const [dailyRes, topRes] = await Promise.all([
      (supabase as any).rpc("metrics_clicks_daily", { p_days: days }),
      (supabase as any).rpc("metrics_clicks_top_offers", { p_days: days }),
    ]);

    if (dailyRes?.error || topRes?.error) {
      return json({ error: "internal" }, 500);
    }

    const daily: DailyRow[] = (dailyRes?.data || []).map((r: any) => ({
      date: String(r.date),
      count: Number(r.count) || 0,
    }));
    const total = daily.reduce((a, b) => a + (b.count || 0), 0);

    const topOffers: Array<{ slug: string; count: number; share: number }> = (topRes?.data || []).map((r: any) => {
      const count = Number(r.count) || 0;
      const share = total > 0 ? Math.round((count / total) * 10000) / 10000 : 0;
      return { slug: String(r.slug), count, share };
    });

    return json({
      days,
      total,
      daily,
      topOffers,
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    return json({ error: "internal" }, 500);
  }
};

export default handler;

