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

