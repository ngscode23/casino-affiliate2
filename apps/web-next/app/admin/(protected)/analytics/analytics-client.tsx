"use client";

import { useEffect, useMemo, useState } from "react";

import Section from "@ui/components/common/section";
import Card from "@ui/components/common/card";
import Skeleton from "@ui/components/common/skeleton";
import {
  loadAnalytics,
  type AnalyticsFilters,
  type AnalyticsRangePreset,
  type AnalyticsSnapshot,
  type AnalyticsDayPoint,
} from "@/lib/admin/analytics";

const PRESETS: Array<{ value: AnalyticsRangePreset; label: string }> = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "custom", label: "Custom" },
];

function Spark({ data }: { data: AnalyticsDayPoint[] }) {
  if (!data.length) {
    return <div className="h-10 w-full rounded bg-white/5" aria-hidden />;
  }

  const width = 240;
  const height = 40;
  const padding = 4;
  const max = Math.max(1, ...data.map((point) => point.count));
  const step = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0;
  const d = data
    .map((point, index) => {
      const command = index === 0 ? "M" : "L";
      const x = padding + index * step;
      const y = height - padding - (point.count / max) * (height - padding * 2);
      return `${command} ${x} ${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth={2} strokeOpacity={0.85} />
    </svg>
  );
}

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

  function handleExportTopSlugsCSV() {
    if (!snapshot) return;
    exportCSV(
      `top-slugs-${range}.csv`,
      ["slug", "clicks", "impressions", "ctr"],
      snapshot.topSlugs.map((entry) => [
        entry.slug,
        entry.clicks.toString(),
        entry.impressions.toString(),
        entry.ctr.toFixed(4),
      ]),
    );
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

  return (
    <Section className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          {snapshot ? (
            <p className="text-sm text-white/60 dark:text-white/50">
              {new Date(snapshot.range.from).toLocaleDateString()} – {new Date(snapshot.range.to).toLocaleDateString()} • {snapshot.totals.clicks} clicks / {snapshot.totals.impressions} impressions
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
          <Card className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Clicks by day</h2>
              <span className="text-xs text-white/50">{presetLabel}</span>
            </div>
            <Spark data={snapshot.byDay.clicks} />
            <div className="grid grid-cols-2 gap-2 text-xs text-white/60">
              {snapshot.byDay.clicks.slice(-10).map((point) => (
                <div key={point.date} className="flex justify-between">
                  <span>{point.date}</span>
                  <span>{point.count}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Top slugs</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-md border border-white/15 px-2 py-1 text-xs text-white transition hover:bg-white/10"
                  onClick={handleExportTopSlugsCSV}
                >
                  Export CSV
                </button>
                <button
                  type="button"
                  className="rounded-md border border-white/15 px-2 py-1 text-xs text-white transition hover:bg-white/10"
                  onClick={handleExportTopSlugsJSON}
                >
                  Export JSON
                </button>
              </div>
            </div>
            <div className="space-y-2 text-sm text-white/80">
              {snapshot.topSlugs.slice(0, 10).map((entry) => (
                <div key={entry.slug} className="grid grid-cols-[minmax(0,1fr),auto,auto,auto] gap-3 text-xs sm:text-sm">
                  <span className="truncate font-medium text-white">{entry.slug}</span>
                  <span className="text-right">{entry.clicks}</span>
                  <span className="text-right">{entry.impressions}</span>
                  <span className="text-right text-white/70">{(entry.ctr * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Slug sparklines</h2>
              <span className="text-xs text-white/50">Top {topSparkline.length}</span>
            </div>
            <div className="space-y-2 text-sm text-white/80">
              {topSparkline.length === 0 ? (
                <div className="text-xs text-white/50">No data</div>
              ) : (
                topSparkline.map((entry) => (
                  <div key={entry.slug} className="flex items-center justify-between gap-3">
                    <span className="truncate text-xs text-white/70">{entry.slug}</span>
                    <Spark data={entry.data} />
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Top sources</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-md border border-white/15 px-2 py-1 text-xs text-white transition hover:bg-white/10"
                  onClick={handleExportSourcesCSV}
                >
                  Export CSV
                </button>
                <button
                  type="button"
                  className="rounded-md border border-white/15 px-2 py-1 text-xs text-white transition hover:bg-white/10"
                  onClick={handleExportSourcesJSON}
                >
                  Export JSON
                </button>
              </div>
            </div>
            <div className="space-y-1 text-sm text-white/80">
              {snapshot.topSources.map((entry) => (
                <div key={entry.source} className="flex justify-between gap-3">
                  <span className="truncate">{entry.source}</span>
                  <span className="text-white/70">{entry.count}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">UTM source/campaign</h2>
              <button
                type="button"
                className="rounded-md border border-white/15 px-2 py-1 text-xs text-white transition hover:bg-white/10"
                onClick={handleExportUtmCSV}
              >
                Export CSV
              </button>
            </div>
            <div className="space-y-1 text-xs text-white/80">
              {snapshot.utm.slice(0, 20).map((entry) => (
                <div key={`${entry.source}-${entry.campaign}`} className="flex justify-between gap-3">
                  <span className="truncate">{entry.source} • {entry.campaign}</span>
                  <span>{entry.count}</span>
                </div>
              ))}
            </div>
          </Card>

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
