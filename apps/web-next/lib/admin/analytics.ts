import { getValidAccessToken } from "@shared/lib/auth";
import { adminFetch } from "@shared/lib/api";

export type AnalyticsRangePreset = "7" | "30" | "90" | "custom";

export interface AnalyticsFilters {
  range?: AnalyticsRangePreset;
  from?: string;
  to?: string;
}

export interface AnalyticsDayPoint {
  date: string;
  count: number;
}

export interface AnalyticsSlugEntry {
  slug: string;
  clicks: number;
  impressions: number;
  ctr: number;
}

export interface AnalyticsSourceEntry {
  source: string;
  count: number;
}

export interface AnalyticsUtmEntry {
  source: string;
  campaign: string;
  count: number;
}

export interface AnalyticsBreakdownEntry {
  device?: string;
  lang?: string;
  count: number;
}

export interface AnalyticsSnapshot {
  range: { from: string; to: string };
  totals: { clicks: number; impressions: number };
  byDay: {
    clicks: AnalyticsDayPoint[];
    impressions: AnalyticsDayPoint[];
  };
  topSlugs: AnalyticsSlugEntry[];
  sparkline: Record<string, AnalyticsDayPoint[]>;
  topSources: AnalyticsSourceEntry[];
  utm: AnalyticsUtmEntry[];
  devices: Array<{ device: string; count: number }>;
  languages: Array<{ lang: string; count: number }>;
  meta: {
    limit: number;
    generatedAt: string;
  };
}

function buildQuery(filters?: AnalyticsFilters): string {
  if (!filters) return "";
  const params = new URLSearchParams();
  if (filters.range) params.set("range", filters.range);
  if (filters.range === "custom") {
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
  }
  if (!params.size) return "";
  return `?${params.toString()}`;
}

export async function loadAnalytics(filters?: AnalyticsFilters): Promise<AnalyticsSnapshot> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) throw new Error("Not authenticated");

  const query = buildQuery(filters);
  const response = await adminFetch(`/api/admin/analytics${query}`, {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as { ok?: boolean; message?: string } & { snapshot?: AnalyticsSnapshot } & AnalyticsSnapshot;

  if (payload && Object.prototype.hasOwnProperty.call(payload, "ok") && payload.ok === false) {
    throw new Error(String(payload.message || "Failed to load analytics"));
  }

  const snapshot = (payload as any).snapshot ?? payload;
  if (!snapshot || !snapshot.range) {
    throw new Error("Analytics payload missing");
  }

  return snapshot as AnalyticsSnapshot;
}
