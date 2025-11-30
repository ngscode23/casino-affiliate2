"use client";;
import { mutedTextSm, mutedTextXs } from "@/styles/classnames";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import Section from "@ui/components/common/section";
import Card from "@ui/components/common/card";
import { adminFetch } from "@shared/lib/api";

type MetricsResponse = {
  days: number;
  total: number;
  daily: { date: string; count: number }[];
  topOffers: { slug: string; count: number; share: number }[];
  generatedAt: string;
};

type RecsMetricRow = {
  treatment: string;
  impressions: number;
  clicks: number;
  add_to_cart: number;
  purchases: number;
  gmv_cents: number;
  ctr: number;
  atc_rate: number;
  conv_rate: number;
  revenue_per_click: number;
  revenue_per_impression: number;
};

function normalizeDays(value: string | null): number {
  const parsed = Number(value);
  if (!value || Number.isNaN(parsed) || !Number.isFinite(parsed)) return 14;
  return Math.max(1, Math.min(60, Math.round(parsed)));
}

type Bar = { label: string; value: number };

function buildChart(rows: { date: string; count: number }[]): { max: number; bars: Bar[] } {
  const max = rows.reduce((acc, row) => Math.max(acc, row.count || 0), 0);
  const bars = rows.map((row) => ({ label: row.date, value: row.count || 0 }));
  return { max, bars };
}

function formatRate(value: number): string {
  if (value == null || Number.isNaN(value)) return "0.0%";
  return `${(value * 100).toFixed(1)}%`;
}

function formatMoneyFromCents(cents: number): string {
  if (cents == null || Number.isNaN(cents)) return "$0.00";
  const value = Number(cents) / 100;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(
      value,
    );
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

function PeriodToggle({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const options = [7, 14, 30];
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-border/60">
      {options.map((option) => {
        const active = value === option;
        return (
          <button
            key={option}
            type="button"
            className={`px-3 py-1 text-sm transition ${
              active ? "bg-primary text-primaryfg" : "bg-card text-muted hover:bg-card/80"
            }`}
            onClick={() => onChange(option)}
          >
            {option}d
          </button>
        );
      })}
    </div>
  );
}

function BarChart({ data, max }: { data: Bar[]; max: number }) {
  if (!data.length) {
    return <div className={mutedTextSm}>No data for selected period.</div>;
  }

  return (
    <div className="flex h-40 items-end gap-1">
      {data.map((bar) => {
        const ratio = max > 0 ? bar.value / max : 0;
        const height = Math.max(8, Math.round(ratio * 120));
        return (
          <div key={bar.label} className="flex flex-1 flex-col items-center">
            <div
              className="w-full rounded-t bg-primary/80"
              style={{ height }}
              title={`${bar.label}: ${bar.value}`}
            />
            <span className="mt-1 text-[10px] text-muted-foreground">{bar.label.slice(5)}</span>
          </div>
        );
      })}
    </div>
  );
}

export function MetricsClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const queryDays = normalizeDays(searchParams?.get("days"));

  const [days, setDays] = useState<number>(queryDays);
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [recsMetrics, setRecsMetrics] = useState<RecsMetricRow[] | null>(null);
  const [recsError, setRecsError] = useState<string | null>(null);

  useEffect(() => {
    const nextValue = normalizeDays(searchParams?.get("days"));
    setDays((prev) => (prev === nextValue ? prev : nextValue));
  }, [searchParams]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    const current = normalizeDays(searchParams?.get("days"));
    if (current === days) return;
    params.set("days", String(days));
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [days, pathname, router, searchParams]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        setData(null);
        setRecsMetrics(null);
        setRecsError(null);

        const [coreRes, recsRes] = await Promise.all([
          adminFetch(`/api/metrics?days=${days}`),
          adminFetch(`/api/admin/recs-metrics?days=${days}`),
        ]);

        if (!coreRes.ok) {
          const text = await coreRes.text();
          throw new Error(text || `${coreRes.status} ${coreRes.statusText}`);
        }
        const json = (await coreRes.json()) as MetricsResponse;
        if (!cancelled) setData(json);

        if (recsRes.ok) {
          const recJson = (await recsRes.json()) as { metrics?: RecsMetricRow[] };
          if (!cancelled) setRecsMetrics(recJson.metrics ?? []);
        } else {
          const text = await recsRes.text();
          if (!cancelled) setRecsError(text || `${recsRes.status} ${recsRes.statusText}`);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [days]);

  const chart = useMemo(() => buildChart(data?.daily ?? []), [data]);
  const topOffers = data?.topOffers ?? [];
  const totalClicks = data?.total ?? 0;

  return (
    <Section className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Metrics</h1>
          <p className={mutedTextSm}>Clicks and top offers for the selected period.</p>
        </div>
        <PeriodToggle value={days} onChange={setDays} />
      </div>
      {loading ? (
        <Card className="p-4 text-sm text-muted-foreground">Loading…</Card>
      ) : error ? (
        <Card className="p-4 text-sm text-rose-500">{error}</Card>
      ) : data ? (
        <div className="space-y-6">
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Daily clicks (UTC)</h2>
            <BarChart data={chart.bars} max={chart.max} />
          </Card>

          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Top offers</h2>
            <div className="grid grid-cols-4 border-b border-border/40 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <div>#</div>
              <div>Slug</div>
              <div className="text-right">Clicks</div>
              <div className="text-right">%</div>
            </div>
            <div className="divide-y divide-border/30 text-sm">
              {topOffers.length === 0 ? (
                <div className="py-2 text-muted-foreground">No data</div>
              ) : (
                topOffers.map((row, index) => (
                  <div key={row.slug} className="grid grid-cols-4 py-1">
                    <div>{index + 1}</div>
                    <div className="truncate text-foreground">{row.slug}</div>
                    <div className="text-right text-foreground">{row.count}</div>
                    <div className="text-right text-muted-foreground">{(row.share * 100).toFixed(1)}%</div>
                  </div>
                ))
              )}
            </div>
            <div className="grid grid-cols-4 border-t border-border/30 py-2 text-sm font-semibold text-foreground">
              <div />
              <div>Total</div>
              <div className="text-right">{totalClicks}</div>
              <div className="text-right">{totalClicks > 0 ? "100.0%" : "0.0%"}</div>
            </div>
          </Card>

          <Card className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground">Recommendations funnel</h2>
              {recsMetrics?.length ? (
                <span className={mutedTextXs}>{recsMetrics.length} variants</span>
              ) : null}
            </div>
            {recsError ? (
              <div className="text-sm text-rose-500">{recsError}</div>
            ) : recsMetrics ? (
              recsMetrics.length ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="border-b border-border/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="py-2 pr-3">Treatment</th>
                        <th className="py-2 pr-3 text-right">Impr</th>
                        <th className="py-2 pr-3 text-right">CTR</th>
                        <th className="py-2 pr-3 text-right">ATC rate</th>
                        <th className="py-2 pr-3 text-right">Purch</th>
                        <th className="py-2 pr-3 text-right">GMV</th>
                        <th className="py-2 pr-3 text-right">Rev/Click</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {recsMetrics.map((row) => (
                        <tr key={row.treatment} className="text-foreground">
                          <td className="py-2 pr-3 font-medium capitalize">{row.treatment}</td>
                          <td className="py-2 pr-3 text-right">{row.impressions}</td>
                          <td className="py-2 pr-3 text-right">{formatRate(row.ctr)}</td>
                          <td className="py-2 pr-3 text-right">{formatRate(row.atc_rate)}</td>
                          <td className="py-2 pr-3 text-right">{row.purchases}</td>
                          <td className="py-2 pr-3 text-right">{formatMoneyFromCents(row.gmv_cents)}</td>
                          <td className="py-2 pr-3 text-right">{formatMoneyFromCents(row.revenue_per_click)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={mutedTextSm}>No recommendation events yet.</div>
              )
            ) : (
              <div className={mutedTextSm}>Loading recommendation metrics…</div>
            )}
          </Card>
        </div>
      ) : (
        <Card className="p-4 text-sm text-muted-foreground">No data.</Card>
      )}
    </Section>
  );
}
