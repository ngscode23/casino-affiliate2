import { json } from "../../orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

const DAY_MS = 86_400_000;
const MAX_ROWS = 5_000;

function parseRange(search: URLSearchParams) {
  const rangeRaw = (search.get("range") ?? "30").toLowerCase();
  const now = new Date();
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

  if (rangeRaw === "custom") {
    const fromParam = search.get("from");
    const toParam = search.get("to");
    if (fromParam && toParam) {
      const fromDate = new Date(fromParam);
      const toDate = new Date(toParam);
      if (!Number.isNaN(fromDate.getTime()) && !Number.isNaN(toDate.getTime())) {
        const from = new Date(Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), fromDate.getUTCDate(), 0, 0, 0, 0));
        const toCustom = new Date(Date.UTC(toDate.getUTCFullYear(), toDate.getUTCMonth(), toDate.getUTCDate(), 23, 59, 59, 999));
        if (from <= toCustom) {
          return { from, to: toCustom };
        }
      }
    }
  }

  const days = Number.parseInt(rangeRaw, 10);
  const validDays = Number.isFinite(days) && days > 0 ? Math.min(days, 180) : 30;
  const from = new Date(to.getTime() - validDays * DAY_MS);
  from.setUTCHours(0, 0, 0, 0);
  return { from, to };
}

function dateKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function safeSlug(slug: unknown): string {
  if (typeof slug !== "string") return "-";
  const trimmed = slug.trim();
  return trimmed || "-";
}

function normalizeSource(row: any): string {
  const params = (row?.params ?? {}) as Record<string, unknown>;
  const source = typeof params?.utm_source === "string" ? params.utm_source.trim() : "";
  if (source) return source;
  const referrer = typeof row?.referrer === "string" ? row.referrer.trim() : "";
  return referrer || "-";
}

function normalizeCampaign(row: any): string {
  const params = (row?.params ?? {}) as Record<string, unknown>;
  const campaign = typeof params?.utm_campaign === "string" ? params.utm_campaign.trim() : "";
  return campaign || "-";
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const supabase = getAdminClient();
  const url = new URL(request.url);
  const { from, to } = parseRange(url.searchParams);

  try {
    const [clicksRes, impressionsRes] = await Promise.all([
      supabase
        .from("clicks")
        .select("ts, slug, referrer, params")
        .gte("ts", from.toISOString())
        .lte("ts", to.toISOString())
        .order("ts", { ascending: false })
        .limit(MAX_ROWS),
      supabase
        .from("impressions")
        .select("ts, slug, device, lang")
        .gte("ts", from.toISOString())
        .lte("ts", to.toISOString())
        .order("ts", { ascending: false })
        .limit(MAX_ROWS),
    ]);

    if (clicksRes.error) {
      return json({ ok: false, code: "db_clicks", message: clicksRes.error.message }, 500);
    }
    if (impressionsRes.error) {
      return json({ ok: false, code: "db_impressions", message: impressionsRes.error.message }, 500);
    }

    const clicks = (clicksRes.data ?? []) as Array<Record<string, any>>;
    const impressions = (impressionsRes.data ?? []) as Array<Record<string, any>>;

    const clicksByDayMap = new Map<string, number>();
    const impressionsByDayMap = new Map<string, number>();
    const slugClicks = new Map<string, number>();
    const slugImpressions = new Map<string, number>();
    const slugSparks = new Map<string, Map<string, number>>();
    const sourcesMap = new Map<string, number>();
    const utmMap = new Map<string, number>();
    const deviceMap = new Map<string, number>();
    const langMap = new Map<string, number>();

    for (const row of clicks) {
      const day = dateKey(row.ts);
      if (!day) continue;
      clicksByDayMap.set(day, (clicksByDayMap.get(day) ?? 0) + 1);

      const slug = safeSlug(row.slug);
      slugClicks.set(slug, (slugClicks.get(slug) ?? 0) + 1);

      if (!slugSparks.has(slug)) slugSparks.set(slug, new Map());
      const sparkMap = slugSparks.get(slug)!;
      sparkMap.set(day, (sparkMap.get(day) ?? 0) + 1);

      const sourceKey = normalizeSource(row);
      sourcesMap.set(sourceKey, (sourcesMap.get(sourceKey) ?? 0) + 1);

      const utmKey = `${normalizeSource(row)}|${normalizeCampaign(row)}`;
      utmMap.set(utmKey, (utmMap.get(utmKey) ?? 0) + 1);
    }

    for (const row of impressions) {
      const day = dateKey(row.ts);
      if (day) {
        impressionsByDayMap.set(day, (impressionsByDayMap.get(day) ?? 0) + 1);
      }
      const slug = safeSlug(row.slug);
      slugImpressions.set(slug, (slugImpressions.get(slug) ?? 0) + 1);

      const device = typeof row?.device === "string" && row.device.trim() ? row.device.trim() : "unknown";
      deviceMap.set(device, (deviceMap.get(device) ?? 0) + 1);
      const lang = typeof row?.lang === "string" && row.lang.trim() ? row.lang.trim() : "-";
      langMap.set(lang, (langMap.get(lang) ?? 0) + 1);
    }

    const clicksByDay = Array.from(clicksByDayMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
    const impressionsByDay = Array.from(impressionsByDayMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const topSlugs = Array.from(slugClicks.entries())
      .map(([slug, clicksCount]) => {
        const imp = slugImpressions.get(slug) ?? 0;
        const ctr = imp > 0 ? clicksCount / imp : 0;
        return { slug, clicks: clicksCount, impressions: imp, ctr };
      })
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 50);

    const sparkline = Object.fromEntries(
      topSlugs.slice(0, 10).map(({ slug }) => {
        const map = slugSparks.get(slug) ?? new Map<string, number>();
        const data = Array.from(map.entries())
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => a.date.localeCompare(b.date));
        return [slug, data];
      }),
    );

    const topSources = Array.from(sourcesMap.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    const utmReport = Array.from(utmMap.entries())
      .map(([key, count]) => {
        const [source, campaign] = key.split("|");
        return { source, campaign, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);

    const devices = Array.from(deviceMap.entries())
      .map(([device, count]) => ({ device, count }))
      .sort((a, b) => b.count - a.count);

    const languages = Array.from(langMap.entries())
      .map(([lang, count]) => ({ lang, count }))
      .sort((a, b) => b.count - a.count);

    return json({
      ok: true,
      range: {
        from: from.toISOString(),
        to: to.toISOString(),
      },
      totals: {
        clicks: clicks.length,
        impressions: impressions.length,
      },
      byDay: {
        clicks: clicksByDay,
        impressions: impressionsByDay,
      },
      topSlugs,
      sparkline,
      topSources,
      utm: utmReport,
      devices,
      languages,
      meta: {
        limit: MAX_ROWS,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    return json(
      {
        ok: false,
        code: "internal",
        message: String((error as Error)?.message ?? error),
      },
      500,
    );
  }
}
