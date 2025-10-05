import { getValidAccessToken } from "@shared/lib/auth";
import { adminFetch } from "@shared/lib/api";

export type BarPoint = { label: string; value: number };
export type LinePoint = { label: string; value: number };

export interface DashboardMetrics {
  kpis: {
    cash: number;
    cashflowForecast: number;
    goalPct: number;
    cards: {
      pending: number;
      inProgress: number;
      done: number;
    };
    productivityPct: number;
  };
  sales: BarPoint[];
  expenses: BarPoint[];
  profit: BarPoint[];
  cashflow: LinePoint[];
  updatedAt: string;
}

async function fetchJson<T>(input: RequestInfo, init: RequestInit): Promise<T> {
  const response = await adminFetch(input as string, init);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }
  const json = (await response.json()) as { ok?: boolean } & T;
  if (json && Object.prototype.hasOwnProperty.call(json, "ok") && (json as any).ok === false) {
    throw new Error(String((json as any).message || (json as any).error || "Failed to load metrics"));
  }
  return json as T;
}

export async function loadDashboardMetrics(): Promise<DashboardMetrics> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) throw new Error("Not authenticated");

  const headers = new Headers({
    accept: "application/json",
    Authorization: `Bearer ${accessToken}`,
  });

  const payload = await fetchJson<{ metrics: DashboardMetrics }>(
    "/api/admin/dashboard-metrics",
    {
      method: "GET",
      headers,
      cache: "no-store",
    },
  );

  if (!payload?.metrics) {
    throw new Error("Metrics payload missing");
  }

  return payload.metrics;
}
