import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

type DashboardMetricsPayload = {
  kpis: {
    cash: number;
    cashflowForecast: number;
    goalPct: number;
    cards: {
      pending: number;
      processing: number;
      succeeded: number;
      [key: string]: number;
    };
    productivityPct: number;
  };
  sales: Array<{ label: string; value: number }>;
  expenses: Array<{ label: string; value: number }>;
  profit: Array<{ label: string; value: number }>;
  cashflow: Array<{ label: string; value: number }>;
  updatedAt: string;
};

class DashboardMetricsError extends Error {
  code: "db" | "internal";
  status: number;

  constructor(message: string, code: "db" | "internal", status = 500) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const loadDashboardMetrics = unstable_cache(
  async (): Promise<DashboardMetricsPayload> => {
    const supabase = getAdminClient();
    const { data, error } = await supabase.rpc("admin_dashboard_metrics_v1", {
      month_count: 12,
      day_count: 7,
    });

    if (error) {
      throw new DashboardMetricsError(error.message, "db");
    }

    const payload = (data ?? {}) as Partial<DashboardMetricsPayload>;
    const cardsRecord = (payload.kpis?.cards ?? {}) as Record<string, number>;
    const normalizedCards = {
      pending: Number(cardsRecord.pending ?? 0),
      processing: Number("processing" in cardsRecord ? cardsRecord.processing : cardsRecord.inProgress ?? 0),
      succeeded: Number("succeeded" in cardsRecord ? cardsRecord.succeeded : cardsRecord.done ?? 0),
    };

    return {
      kpis: {
        cash: Number(payload.kpis?.cash ?? 0),
        cashflowForecast: Number(payload.kpis?.cashflowForecast ?? 0),
        goalPct: Number(payload.kpis?.goalPct ?? 0),
        productivityPct: Number(payload.kpis?.productivityPct ?? 0),
        cards: {
          ...normalizedCards,
          inProgress: normalizedCards.processing,
          done: normalizedCards.succeeded,
        },
      },
      sales: payload.sales ?? [],
      expenses: payload.expenses ?? [],
      profit: payload.profit ?? [],
      cashflow: payload.cashflow ?? [],
      updatedAt: payload.updatedAt ?? new Date().toISOString(),
    };
  },
  ["admin-dashboard-metrics"],
  {
    revalidate: 60,
    tags: ["admin-dashboard-metrics"],
  },
);

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  try {
    const metrics = await loadDashboardMetrics();
    return NextResponse.json(
      {
        ok: true,
        metrics,
      },
      {
        headers: {
          "cache-control": "public, max-age=0, s-maxage=60, stale-while-revalidate=30",
        },
      },
    );
  } catch (error: any) {
    const normalized =
      error instanceof DashboardMetricsError
        ? error
        : new DashboardMetricsError(error instanceof Error ? error.message : String(error), "internal");

    return NextResponse.json(
      { ok: false, error: normalized.code, message: normalized.message },
      {
        status: normalized.status,
        headers: { "cache-control": "public, max-age=0, s-maxage=0, must-revalidate" },
      },
    );
  }
}
