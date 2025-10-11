"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

import Section from "@ui/components/common/section";
import Card from "@ui/components/common/card";
import Skeleton from "@ui/components/common/skeleton";
import {
  loadAnalytics,
  type AnalyticsFilters,
  type AnalyticsRangePreset,
  type AnalyticsSnapshot,
  type AnalyticsKpi,
  type AnalyticsFunnel,
  type AnalyticsDayPoint,
} from "@/lib/admin/analytics";

const PRESETS: Array<{ value: AnalyticsRangePreset; label: string }> = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "custom", label: "Custom" },
];

const ClicksByDay = dynamic(() => import("./charts/ClicksByDay"), { ssr: false });
const SlugSparklines = dynamic(() => import("./charts/SlugSparklines"), { ssr: false });
const TopSlugsBlock = dynamic(() => import("./blocks/TopSlugs"), { ssr: false });
const TopSourcesBlock = dynamic(() => import("./blocks/TopSources"), { ssr: false });
const UtmTableBlock = dynamic(() => import("./blocks/UtmTable"), { ssr: false });

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function exportCSV(filename: string, headers: string[], rows: Array<Array<string>>) {
  const csv = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))].join("\n");
  download(new Blob([csv], { type: "text/csv;charset=utf-8;" }), filename);
}

function exportJSON(filename: string, data: unknown) {
  download(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), filename);
}

export function AdminAnalyticsClient() {
  const [range, setRange] = useState<AnalyticsRangePreset>("30");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<AnalyticsSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    const needsCustom = range === "custom";
    const customReady = !needsCustom || (customFrom && customTo);

    if (!customReady) {
      setSnapshot(null);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    const filters: AnalyticsFilters = { range };
    if (range === "custom") {
      filters.from = customFrom;
      filters.to = customTo;
    }

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await loadAnalytics(filters);
        if (!cancelled) setSnapshot(data);
      } catch (err) {
        if (!cancelled) {
          setSnapshot(null);
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [range, customFrom, customTo]);

  const presetLabel = useMemo(() => PRESETS.find((preset) => preset.value === range)?.label ?? "30 days", [range]);
  const isCustom = range === "custom";
  const lastUpdated = snapshot?.meta.generatedAt ? new Date(snapshot.meta.generatedAt) : null;

  function KpiCard({ label, value }: { label: string; value: string }) {
    return (
      <Card className="p-4">
        <div className="text-sm text-[var(--text-dim)]">{label}</div>
        <div className="mt-1 text-2xl font-semibold">{value}</div>
      </Card>
    );
  }

  function formatPct(num: number): string {
    if (!Number.isFinite(num)) return "0%";
    return `${(num * 100).toFixed(1)}%`;
  }

  function formatMoneyMap(map?: AnalyticsKpi["revenueByCurrency"], fallback = "—") {
    if (!map || Object.keys(map).length === 0) return fallback;
    const entries = Object.entries(map);
    return entries
      .map(([cur, amount]) => `${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${cur}`)
      .join(" · ");
  }

  function FunnelView({ funnel }: { funnel?: AnalyticsFunnel }) {
    const f = funnel || { impressions: 0, clicks: 0, payment_attempts: 0, paid: 0 };
    const step1 = f.impressions;
    const step2 = f.clicks;
    const step3 = f.payment_attempts;
    const step4 = f.paid;
    const ctr = step1 > 0 ? step2 / step1 : 0;
    const cr = step2 > 0 ? step4 / step2 : 0;
    const pa = step2 > 0 ? step3 / step2 : 0;
    return (
      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-[var(--text-dim)]">Funnel</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <div className="text-xs text-[var(--text-dim)]">Impressions</div>
            <div className="text-lg font-semibold">{step1.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-[var(--text-dim)]">Clicks</div>
            <div className="text-lg font-semibold">{step2.toLocaleString()}</div>
            <div className="text-xs text-[var(--text-dim)]">CTR {formatPct(ctr)}</div>
          </div>
          <div>
            <div className="text-xs text-[var(--text-dim)]">Payment attempts</div>
            <div className="text-lg font-semibold">{step3.toLocaleString()}</div>
            <div className="text-xs text-[var(--text-dim)]">Attempts/Click {formatPct(pa)}</div>
          </div>
          <div>
            <div className="text-xs text-[var(--text-dim)]">Paid</div>
            <div className="text-lg font-semibold">{step4.toLocaleString()}</div>
            <div className="text-xs text-[var(--text-dim)]">CR {formatPct(cr)}</div>
          </div>
        </div>
      </Card>
    );
  }

  function handleExportTopSlugsCSV() {
    if (!snapshot) return;
    const headers = ["slug", "clicks", "impressions", "ctr", "paid", "cr", "revenue"];
    const rows = snapshot.topSlugs.map((entry) => {
      const rev = entry.revenue
        ? Object.entries(entry.revenue)
            .map(([cur, amt]) => `${(amt ?? 0).toFixed(2)} ${cur}`)
            .join(" | ")
        : "";
      return [
        entry.slug,
        String(entry.clicks ?? 0),
        String(entry.impressions ?? 0),
        (entry.ctr ?? 0).toFixed(4),
        String(entry.paid ?? 0),
        (entry.cr ?? 0).toFixed(4),
        rev,
      ];
    });
    exportCSV(`top-slugs-${range}.csv`, headers, rows);
  }

  function handleExportTopSlugsJSON() {
    if (!snapshot) return;
    exportJSON(`top-slugs-${range}.json`, snapshot.topSlugs);
  }

  function handleExportSourcesCSV() {
    if (!snapshot) return;
    exportCSV(
      `top-sources-${range}.csv`,
      ["source", "clicks"],
      snapshot.topSources.map((entry) => [entry.source, entry.count.toString()]),
    );
  }

  function handleExportSourcesJSON() {
    if (!snapshot) return;
    exportJSON(`top-sources-${range}.json`, snapshot.topSources);
  }

  function handleExportUtmCSV() {
    if (!snapshot) return;
    exportCSV(
      `utm-${range}.csv`,
      ["source", "campaign", "clicks"],
      snapshot.utm.map((entry) => [entry.source, entry.campaign, entry.count.toString()]),
    );
  }

  const topSparkline = useMemo(
    () => (snapshot ? Object.entries(snapshot.sparkline).map(([slug, data]) => ({ slug, data })) : []),
    [snapshot],
  );
  const virt = useMemo(() => ({
    topSlugs: (snapshot?.topSlugs?.length ?? 0) > 200,
    topSources: (snapshot?.topSources?.length ?? 0) > 200,
    utm: (snapshot?.utm?.length ?? 0) > 200,
  }), [snapshot]);

  return (
    <Section className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          {snapshot ? (
            <p className="text-sm text-white/60 dark:text-white/50">
              {new Date(snapshot.range.from).toLocaleDateString()} - {new Date(snapshot.range.to).toLocaleDateString()} · {snapshot.totals.clicks} clicks / {snapshot.totals.impressions} impressions
            </p>
          ) : null}
        </div>
        {lastUpdated ? (
          <div className="text-xs text-white/50 dark:text-white/40">Updated {lastUpdated.toLocaleString()}</div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="analytics-range" className="text-sm text-white/70 dark:text-white/60">
          Range
        </label>
        <select
          id="analytics-range"
          className="h-10 rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
          value={range}
          onChange={(event) => setRange(event.target.value as AnalyticsRangePreset)}
        >
          {PRESETS.map((preset) => (
            <option key={preset.value} value={preset.value}>
              {preset.label}
            </option>
          ))}
        </select>
        {isCustom ? (
          <>
            <input
              type="date"
              className="h-10 rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white outline-none focus:border-[var(--accent)]"
              value={customFrom}
              onChange={(event) => setCustomFrom(event.target.value)}
            />
            <input
              type="date"
              className="h-10 rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white outline-none focus:border-[var(--accent)]"
              value={customTo}
              onChange={(event) => setCustomTo(event.target.value)}
            />
          </>
        ) : null}
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="p-4">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="mt-3 h-10 w-full" />
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</Card>
      ) : snapshot ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* KPI cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2 xl:grid-cols-4">
            <KpiCard label="Impressions" value={(snapshot.totals.impressions || 0).toLocaleString()} />
            <KpiCard label="Clicks" value={(snapshot.totals.clicks || 0).toLocaleString()} />
            <KpiCard
              label="CTR"
              value={formatPct((snapshot.totals.impressions || 0) > 0 ? (snapshot.totals.clicks || 0) / (snapshot.totals.impressions || 1) : 0)}
            />
            <KpiCard label="Paid" value={(snapshot.funnel?.paid || 0).toLocaleString()} />
            <KpiCard
              label="CR (Click→Paid)"
              value={formatPct((snapshot.funnel?.clicks || 0) > 0 ? (snapshot.funnel?.paid || 0) / (snapshot.funnel?.clicks || 1) : 0)}
            />
            <KpiCard label="Revenue" value={formatMoneyMap(snapshot.kpi?.revenueByCurrency)} />
            <KpiCard label="Net" value={formatMoneyMap(snapshot.kpi?.netByCurrency)} />
          </div>

          {/* Funnel */}
          <FunnelView funnel={snapshot.funnel} />

          <ClicksByDay data={snapshot.byDay.clicks} label={presetLabel} />

          <TopSlugsBlock
            data={snapshot.topSlugs}
            onExportCSV={handleExportTopSlugsCSV}
            onExportJSON={handleExportTopSlugsJSON}
            useVirtualization={virt.topSlugs}
          />

          <SlugSparklines items={topSparkline} />

          <TopSourcesBlock
            data={snapshot.topSources}
            onExportCSV={handleExportSourcesCSV}
            onExportJSON={handleExportSourcesJSON}
            useVirtualization={virt.topSources}
          />

          <UtmTableBlock
            data={snapshot.utm}
            onExportCSV={handleExportUtmCSV}
            useVirtualization={virt.utm}
          />

          <Card className="space-y-3 p-4">
            <h2 className="font-semibold">Impressions by device</h2>
            <div className="space-y-1 text-sm text-white/80">
              {snapshot.devices.map((entry) => (
                <div key={entry.device} className="flex justify-between gap-3">
                  <span className="capitalize">{entry.device}</span>
                  <span className="text-white/70">{entry.count}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="space-y-3 p-4">
            <h2 className="font-semibold">Impressions by language</h2>
            <div className="space-y-1 text-sm text-white/80">
              {snapshot.languages.map((entry) => (
                <div key={entry.lang} className="flex justify-between gap-3">
                  <span>{entry.lang}</span>
                  <span className="text-white/70">{entry.count}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : (
        <Card className="p-4 text-sm text-white/60">Select range to load analytics.</Card>
      )}
    </Section>
  );
}
