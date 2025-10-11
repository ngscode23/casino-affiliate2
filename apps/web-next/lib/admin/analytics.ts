import { adminFetch } from "@shared/lib/api";
import type { AnalyticsRangePreset, AnalyticsSnapshot } from "@/app/api/admin/analytics/types";

export type {
  AnalyticsDayPoint,
  AnalyticsSlugEntry,
  AnalyticsSourceEntry,
  AnalyticsUtmEntry,
  AnalyticsBreakdownEntry,
  AnalyticsKpi,
  AnalyticsFunnel,
  AnalyticsSnapshot,
  AnalyticsCompareBlock,
} from "@/app/api/admin/analytics/types";

export type { AnalyticsRangePreset } from "@/app/api/admin/analytics/types";

export interface AnalyticsFilters {
  range?: AnalyticsRangePreset;
  from?: string;
  to?: string;
  slug?: string[];
  utm_source?: string[];
  utm_campaign?: string[];
  device?: string[];
  lang?: string[];
  referrer_host?: string[];
  limit?: number;
  compare?: boolean;
}

function buildQuery(filters?: AnalyticsFilters): string {
  if (!filters) return "";
  const params = new URLSearchParams();
  if (filters.range) params.set("range", filters.range);
  if (filters.range === "custom") {
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
  }
  const multi = (key: keyof AnalyticsFilters, paramName: string) => {
    const value = filters[key];
    if (!value) return;
    const list = Array.isArray(value) ? value : [value];
    list
      .flatMap((item) => {
        if (typeof item === "string") return item.split(",");
        return String(item);
      })
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => params.append(paramName, item));
  };
  multi("slug", "slug");
  multi("utm_source", "utm_source");
  multi("utm_campaign", "utm_campaign");
  multi("device", "device");
  multi("lang", "lang");
  multi("referrer_host", "referrer_host");
  if (typeof filters.limit === "number" && Number.isFinite(filters.limit)) {
    params.set("limit", String(Math.max(1, Math.floor(filters.limit))));
  }
  if (filters.compare) params.set("compare", "1");
  if (!params.size) return "";
  return `?${params.toString()}`;
}

export async function loadAnalytics(filters?: AnalyticsFilters): Promise<AnalyticsSnapshot> {
  const query = buildQuery(filters);
  // Авторизация: куки SSR + x-admin-token через adminFetch. Bearer-токен не обязателен.
  const response = await adminFetch(`/api/admin/analytics${query}`, {
    method: "GET",
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
