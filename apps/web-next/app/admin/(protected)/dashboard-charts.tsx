"use client";

import dynamic from "next/dynamic";

import Skeleton from "@ui/components/common/skeleton";

import {
  METRIC_VALUE_CLASS,
  TITLE_LABEL_CLASS,
  Tile,
  toCurrency,
  type TileProps,
  type TileTone,
} from "./dashboard-primitives";
import type { DashboardMetrics } from "@/lib/admin/metrics";

const BarsChart = dynamic(() => import("./dashboard-charts.client").then((mod) => mod.BarsChart), {
  ssr: false,
  loading: () => (
    <div className="h-40 w-full">
      <Skeleton className="h-full w-full" />
    </div>
  ),
});

const LineMiniChart = dynamic(() => import("./dashboard-charts.client").then((mod) => mod.LineMiniChart), {
  ssr: false,
  loading: () => (
    <div className="h-40 w-full">
      <Skeleton className="h-full w-full" />
    </div>
  ),
});

const GoalPieChart = dynamic(() => import("./dashboard-charts.client").then((mod) => mod.GoalPieChart), {
  ssr: false,
  loading: () => (
    <div className="h-[140px] w-full">
      <Skeleton className="h-full w-full" />
    </div>
  ),
});

type Props = {
  metrics: DashboardMetrics;
};

export function DashboardChartsSection({ metrics }: Props) {
  const { kpis, sales, profit, cashflow } = metrics;

  return (
    <div className="space-y-10">
      <div className="grid gap-6 lg:grid-cols-3">
        <Tile tone="accent" className="overflow-hidden">
          <div className={TITLE_LABEL_CLASS}>Cash</div>
          <div className={METRIC_VALUE_CLASS}>{toCurrency(kpis.cash)}</div>
          <div className="mt-3 text-sm text-slate-400">Available balance</div>
          <span className="pointer-events-none absolute -top-16 right-0 h-56 w-56 rounded-full bg-sky-500/25 blur-3xl" />
        </Tile>
        <Tile tone="accent" className="overflow-hidden">
          <div className={TITLE_LABEL_CLASS}>Goal Progress</div>
          <div className="mt-6 flex items-center gap-6">
            <GoalPieChart value={kpis.goalPct} />
            <div>
              <div className="text-4xl font-semibold text-white">{kpis.goalPct}%</div>
              <div className="mt-3 space-y-2 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-sky-400" />
                  Done
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-white/25" />
                  Remain
                </div>
              </div>
            </div>
          </div>
          <span className="pointer-events-none absolute -bottom-12 left-12 h-44 w-44 rounded-full bg-fuchsia-500/25 blur-3xl" />
        </Tile>
        <Tile tone="accent" className="overflow-hidden">
          <div className={TITLE_LABEL_CLASS}>Cashflow Forecast</div>
          <div className={METRIC_VALUE_CLASS}>{toCurrency(kpis.cashflowForecast)}</div>
          <div className="mt-3 text-sm text-slate-400">Next 30 days</div>
          <span className="pointer-events-none absolute -top-12 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-emerald-500/20 blur-3xl" />
        </Tile>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Tile tone="muted">
          <div className={TITLE_LABEL_CLASS}>Sales · 12 months</div>
          <div className="mt-4">
            <BarsChart data={sales} />
          </div>
        </Tile>
        <Tile tone="muted">
          <div className={TITLE_LABEL_CLASS}>Profit · 12 months</div>
          <div className="mt-4">
            <BarsChart data={profit} />
          </div>
        </Tile>
        <Tile tone="muted">
          <div className={TITLE_LABEL_CLASS}>Productivity · 7 days</div>
          <div className="mt-4">
            <LineMiniChart data={cashflow} />
          </div>
        </Tile>
      </div>
    </div>
  );
}

export default DashboardChartsSection;

export {
  Tile,
  type TileProps,
  type TileTone,
  TITLE_LABEL_CLASS,
  METRIC_VALUE_CLASS,
  toCurrency,
} from "./dashboard-primitives";
