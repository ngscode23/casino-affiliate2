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

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase.rpc("admin_dashboard_metrics_v1", {
      month_count: 12,
      day_count: 7,
    });

    if (error) {
      return NextResponse.json(
        { ok: false, error: "db", message: error.message },
        {
          status: 500,
          headers: { "cache-control": "public, max-age=0, s-maxage=0, must-revalidate" },
        },
      );
    }

    const payload = (data ?? {}) as Partial<DashboardMetricsPayload>;
    const cardsRecord = (payload.kpis?.cards ?? {}) as Record<string, number>;
    const normalizedCards = {
      pending: Number(cardsRecord.pending ?? 0),
      processing: Number("processing" in cardsRecord ? cardsRecord.processing : cardsRecord.inProgress ?? 0),
      succeeded: Number("succeeded" in cardsRecord ? cardsRecord.succeeded : cardsRecord.done ?? 0),
    };

    const responsePayload: DashboardMetricsPayload = {
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

    return NextResponse.json(
      {
        ok: true,
        metrics: responsePayload,
      },
      {
        headers: {
          "cache-control": "public, max-age=0, s-maxage=60, stale-while-revalidate=30",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "internal", message: error instanceof Error ? error.message : String(error) },
      {
        status: 500,
        headers: { "cache-control": "public, max-age=0, s-maxage=0, must-revalidate" },
      },
    );
  }
}
