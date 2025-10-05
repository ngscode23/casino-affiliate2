// src/pages/Admin/metrics/index.tsx
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Section from "@ui/components/common/section";
import Card from "@ui/components/common/card";

type MetricsResponse = {
  days: number;
  total: number;
  daily: { date: string; count: number }[];
  topOffers: { slug: string; count: number; share: number }[];
  generatedAt: string;
};

const DEV_TOKEN = (import.meta as any).env?.VITE_ADMIN_TOKEN as string | undefined;

export default function MetricsIndex() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialDays = normalizeDays(searchParams.get("days"));
  const [days, setDays] = useState<number>(initialDays);
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const paramsString = searchParams.toString();

  useEffect(() => {
    // Sync URL when days changes
    const sp = new URLSearchParams(paramsString);
    sp.set("days", String(days));
    setSearchParams(sp, { replace: true });
  }, [days, paramsString, setSearchParams]);

  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        setData(null);
        const headers: Record<string, string> = { "accept": "application/json" };
        if (DEV_TOKEN) headers["x-admin-token"] = DEV_TOKEN;
        const res = await fetch(`/api/metrics?days=${days}`, {
          headers,
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `${res.status} ${res.statusText}`);
        }
        const json = (await res.json()) as MetricsResponse;
        if (!canceled) setData(json);
      } catch (e: any) {
        if (!canceled) setError(String(e?.message || e));
      } finally {
        if (!canceled) setLoading(false);
      }
    })();
    return () => {
      canceled = true;
    };
  }, [days]);

  const chart = useMemo(() => buildChart(data?.daily || []), [data]);
  const top = data?.topOffers || [];
  const total = data?.total ?? 0;

  return (
    <Section className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Metrics</h1>
        <div className="flex items-center gap-2">
          <PeriodToggle days={days} setDays={setDays} />
        </div>
      </div>

      {loading && <Card className="p-4">Loading…</Card>}
      {error && !loading && (
        <Card className="p-4 text-red-400">{error}</Card>
      )}
      {!loading && !error && data && (
        <div className="space-y-6">
          <Card className="p-4">
            <h2 className="font-semibold mb-3">Daily clicks (UTC)</h2>
            {chart.max > 0 ? (
              <BarChart daily={chart.bars} max={chart.max} />
            ) : (
              <div className="text-sm text-[var(--text-dim)]">
                No data for selected period.
              </div>
            )}
          </Card>

          <Card className="p-4">
            <h2 className="font-semibold mb-3">Top offers</h2>
            <div className="grid grid-cols-4 text-sm font-semibold text-[var(--text-dim)] border-b border-[var(--border)] pb-1">
              <div>#</div>
              <div>slug</div>
              <div className="text-right">clicks</div>
              <div className="text-right">%</div>
            </div>
            <div className="text-sm divide-y divide-[var(--border)]">
              {top.length === 0 ? (
                <div className="py-2 text-[var(--text-dim)]">No data</div>
              ) : (
                top.map((r, i) => (
                  <div key={r.slug} className="grid grid-cols-4 py-1">
                    <div>{i + 1}</div>
                    <div className="truncate">{r.slug}</div>
                    <div className="text-right">{r.count}</div>
                    <div className="text-right">{(r.share * 100).toFixed(1)}%</div>
                  </div>
                ))
              )}
            </div>
            <div className="grid grid-cols-4 py-2 mt-2 border-t border-[var(--border)] text-sm font-semibold">
              <div></div>
              <div>Total</div>
              <div className="text-right">{total}</div>
              <div className="text-right">{total > 0 ? "100.0%" : "0.0%"}</div>
            </div>
          </Card>
        </div>
      )}
    </Section>
  );
}

function normalizeDays(v: string | null): number {
  const n = Number(v);
  if (!v) return 14;
  if (!isFinite(n) || Number.isNaN(n)) return 14;
  return Math.max(1, Math.min(60, Math.round(n)));
}

function PeriodToggle({ days, setDays }: { days: number; setDays: (n: number) => void }) {
  const options = [7, 14, 30];
  return (
    <div className="inline-flex rounded-md overflow-hidden border border-[var(--border)]">
      {options.map((d) => (
        <button
          key={d}
          className={`px-3 py-1 text-sm ${days === d ? "bg-[var(--bg-2)]" : "bg-[var(--bg-1)]"}`}
          onClick={() => setDays(d)}
        >
          {d}d
        </button>
      ))}
    </div>
  );
}

function buildChart(rows: { date: string; count: number }[]) {
  const max = rows.reduce((m, r) => Math.max(m, r.count || 0), 0);
  const bars = rows.map((r) => ({ label: r.date, value: r.count || 0 }));
  return { max, bars };
}

function BarChart({ daily, max }: { daily: { label: string; value: number }[]; max: number }) {
  const h = 120; // px height
  return (
    <div className="w-full">
      <div className="flex items-end gap-1 h-[140px]">
        {daily.map((d) => {
          const ratio = max > 0 ? d.value / max : 0;
          const height = Math.max(2, Math.round(ratio * h));
          const heightClass = `h-bar-${height}`;
          return (
            <div key={d.label} className="flex-1 flex flex-col items-center">
              <div
                className={`w-full bg-[var(--accent)]/80 ${heightClass}`}
                title={`${d.label}: ${d.value}`}
              />
              <div className="text-[10px] mt-1 text-[var(--text-dim)]">
                {d.label.slice(5)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}



