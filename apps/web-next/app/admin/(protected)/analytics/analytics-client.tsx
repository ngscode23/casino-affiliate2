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
  type AnalyticsFunnel,
  type AnalyticsCompareBlock,
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

function splitList(value: string): string[] {
  if (!value) return [];
  return value
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function formatSigned(value: number, style: "integer" | "decimal" | "percent"): string {
  if (!Number.isFinite(value) || Number.isNaN(value)) return "0";
  let magnitude = Math.abs(value);
  let formatter: Intl.NumberFormat;
  if (style === "percent") {
    magnitude *= 100;
    formatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });
  } else if (style === "integer") {
    formatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
  } else {
    formatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
  }
  const formatted = formatter.format(magnitude);
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return style === "percent" ? `${sign}${formatted}%` : `${sign}${formatted}`;
}

function formatMoneyMap(map?: Record<string, number>, fallback = "-") {
  if (!map) return fallback;
  const entries = Object.entries(map);
  if (!entries.length) return fallback;
  return entries
    .map(([cur, amount]) =>
      `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(amount ?? 0)} ${cur}`,
    )
    .join(" · ");
}

function formatRevenueDiff(abs?: Record<string, number>, pct?: Record<string, number>): string {
  if (!abs || Object.keys(abs).length === 0) return "—";
  return Object.entries(abs)
    .map(([currency, amount]) => {
      const pctValue = pct?.[currency] ?? 0;
      return `${formatSigned(amount ?? 0, "decimal")} ${currency} (${formatSigned(pctValue, "percent")})`;
    })
    .join(" · ");
}

export function AdminAnalyticsClient() {
  const [range, setRange] = useState<AnalyticsRangePreset>("30");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [slugFilter, setSlugFilter] = useState("");
  const [utmSourceFilter, setUtmSourceFilter] = useState("");
  const [utmCampaignFilter, setUtmCampaignFilter] = useState("");
  const [deviceFilter, setDeviceFilter] = useState("");
  const [langFilter, setLangFilter] = useState("");
  const [referrerFilter, setReferrerFilter] = useState("");
  const [limitInput, setLimitInput] = useState("50");
  const [compare, setCompare] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<AnalyticsSnapshot | null>(null);

  const slugValues = useMemo(() => splitList(slugFilter), [slugFilter]);
  const utmSourceValues = useMemo(() => splitList(utmSourceFilter), [utmSourceFilter]);
  const utmCampaignValues = useMemo(() => splitList(utmCampaignFilter), [utmCampaignFilter]);
  const deviceValues = useMemo(() => splitList(deviceFilter), [deviceFilter]);
  const langValues = useMemo(() => splitList(langFilter), [langFilter]);
  const referrerValues = useMemo(() => splitList(referrerFilter), [referrerFilter]);
  const limitValue = useMemo(() => {
    const parsed = Number.parseInt(limitInput, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return Math.min(parsed, 300);
  }, [limitInput]);

  useEffect(() => {
    let cancelled = false;
    const needsCustom = range === "custom";
    const customReady = !needsCustom || (customFrom && customTo);

    if (!customReady) {
      setLoading(false);
      setSnapshot(null);
      return () => {
        cancelled = true;
      };
    }

    const filters: AnalyticsFilters = { range };
    if (needsCustom) {
      filters.from = customFrom;
      filters.to = customTo;
    }
    if (slugValues.length) filters.slug = slugValues;
    if (utmSourceValues.length) filters.utm_source = utmSourceValues;
    if (utmCampaignValues.length) filters.utm_campaign = utmCampaignValues;
    if (deviceValues.length) filters.device = deviceValues;
    if (langValues.length) filters.lang = langValues;
    if (referrerValues.length) filters.referrer_host = referrerValues;
    if (limitValue != null) filters.limit = limitValue;
    if (compare) filters.compare = true;

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
  }, [
    range,
    customFrom,
    customTo,
    slugValues,
    utmSourceValues,
    utmCampaignValues,
    deviceValues,
    langValues,
    referrerValues,
    limitValue,
    compare,
  ]);

  const presetLabel = useMemo(() => PRESETS.find((preset) => preset.value === range)?.label ?? "30 days", [range]);
  const isCustom = range === "custom";
  const lastUpdated = snapshot?.meta.generatedAt ? new Date(snapshot.meta.generatedAt) : null;

  const hasAdvancedFilters = useMemo(
    () =>
      slugValues.length > 0 ||
      utmSourceValues.length > 0 ||
      utmCampaignValues.length > 0 ||
      deviceValues.length > 0 ||
      langValues.length > 0 ||
      referrerValues.length > 0 ||
      (limitValue != null && limitValue !== 50) ||
      compare,
    [
      slugValues.length,
      utmSourceValues.length,
      utmCampaignValues.length,
      deviceValues.length,
      langValues.length,
      referrerValues.length,
      limitValue,
      compare,
    ],
  );

  const appliedFilters = useMemo(() => {
    const tags: string[] = [];
    if (slugValues.length) tags.push(`slug=${slugValues.join(", ")}`);
    if (utmSourceValues.length) tags.push(`utm_source=${utmSourceValues.join(", ")}`);
    if (utmCampaignValues.length) tags.push(`utm_campaign=${utmCampaignValues.join(", ")}`);
    if (deviceValues.length) tags.push(`device=${deviceValues.join(", ")}`);
    if (langValues.length) tags.push(`lang=${langValues.join(", ")}`);
    if (referrerValues.length) tags.push(`referrer=${referrerValues.join(", ")}`);
    if (limitValue != null && limitValue !== 50) tags.push(`limit=${limitValue}`);
    if (compare) tags.push("compare=1");
    return tags;
  }, [
    slugValues,
    utmSourceValues,
    utmCampaignValues,
    deviceValues,
    langValues,
    referrerValues,
    limitValue,
    compare,
  ]);

  function resetFilters() {
    setSlugFilter("");
    setUtmSourceFilter("");
    setUtmCampaignFilter("");
    setDeviceFilter("");
    setLangFilter("");
    setReferrerFilter("");
    setLimitInput("50");
    setCompare(false);
  }

  function KpiCard({ label, value }: { label: string; value: string }) {
    return (
      <Card className="p-4">
        <div className="text-sm text-(--text-dim)">{label}</div>
        <div className="mt-1 text-2xl font-semibold">{value}</div>
      </Card>
    );
  }

  function formatPct(num: number): string {
    if (!Number.isFinite(num)) return "0%";
    return `${(num * 100).toFixed(1)}%`;
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
      <Card className="space-y-3 p-4">
        <h2 className="font-semibold">Funnel</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-neutral-200 bg-white p-3 text-slate-700 shadow-sm dark:border-white/15 dark:bg-white/5 dark:text-white/80">
            <div className="text-sm text-slate-500 dark:text-white/60">Impressions</div>
            <div className="text-xl font-semibold text-slate-900 dark:text-white">{step1.toLocaleString()}</div>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-3 text-slate-700 shadow-sm dark:border-white/15 dark:bg-white/5 dark:text-white/80">
            <div className="text-sm text-slate-500 dark:text-white/60">Clicks</div>
            <div className="text-xl font-semibold text-slate-900 dark:text-white">
              {step2.toLocaleString()}
              <span className="ml-2 text-xs text-slate-500 dark:text-white/60">{formatPct(ctr)}</span>
            </div>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-3 text-slate-700 shadow-sm dark:border-white/15 dark:bg-white/5 dark:text-white/80">
            <div className="text-sm text-slate-500 dark:text-white/60">Payment attempts</div>
            <div className="text-xl font-semibold text-slate-900 dark:text-white">
              {step3.toLocaleString()}
              <span className="ml-2 text-xs text-slate-500 dark:text-white/60">{formatPct(pa)}</span>
            </div>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-3 text-slate-700 shadow-sm dark:border-white/15 dark:bg-white/5 dark:text-white/80">
            <div className="text-sm text-slate-500 dark:text-white/60">Paid</div>
            <div className="text-xl font-semibold text-slate-900 dark:text-white">
              {step4.toLocaleString()}
              <span className="ml-2 text-xs text-slate-500 dark:text-white/60">{formatPct(cr)}</span>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  function CompareRow({
    label,
    abs,
    pct,
    absStyle = "integer",
  }: {
    label: string;
    abs: number;
    pct: number;
    absStyle?: "integer" | "decimal" | "percent";
  }) {
    const tone =
      abs > 0 || pct > 0 ? "text-emerald-300" : abs < 0 || pct < 0 ? "text-rose-300" : "text-slate-500 dark:text-white/70";
    return (
      <div className="flex items-center justify-between rounded border border-neutral-200 bg-white px-3 py-2 text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white/80">
        <span>{label}</span>
        <span className={`text-right ${tone}`}>
          {formatSigned(abs, absStyle)}
          <span className="ml-2 text-xs text-slate-500 dark:text-white/60">{formatSigned(pct, "percent")}</span>
        </span>
      </div>
    );
  }

  function CompareSummary({ compare }: { compare: AnalyticsCompareBlock }) {
    const { rangePrev, diffAbs, diffPct } = compare;
    const prevLabel = `${new Date(rangePrev.from).toLocaleDateString()} – ${new Date(rangePrev.to).toLocaleDateString()}`;

    return (
      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Compare with previous period</h2>
          <span className="text-xs text-slate-500 dark:text-white/60">Baseline: {prevLabel}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm text-slate-600 dark:text-white/80">
          <CompareRow label="Clicks" abs={diffAbs.clicks ?? 0} pct={diffPct.clicks ?? 0} />
          <CompareRow label="Impressions" abs={diffAbs.impressions ?? 0} pct={diffPct.impressions ?? 0} />
          <CompareRow label="Paid" abs={diffAbs.paid ?? 0} pct={diffPct.paid ?? 0} />
          <CompareRow label="Conversion rate" abs={diffAbs.cr ?? 0} pct={diffPct.cr ?? 0} absStyle="percent" />
          <CompareRow label="AOV" abs={diffAbs.aov ?? 0} pct={diffPct.aov ?? 0} absStyle="decimal" />
        </div>
        <div className="rounded border border-neutral-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white/80">
          <div className="text-slate-500 dark:text-white/60">Revenue delta</div>
          <div className="mt-1 text-slate-900 dark:text-white">{formatRevenueDiff(diffAbs.revenue, diffPct.revenue)}</div>
        </div>
      </Card>
    );
  }

  function handleExportTopSlugsCSV() {
    if (!snapshot) return;
    exportCSV(
      `analytics-top-slugs-${range}.csv`,
      ["slug", "clicks", "impressions", "ctr", "paid", "cr", "revenue"],
      snapshot.topSlugs.map((entry) => [
        entry.slug,
        String(entry.clicks ?? 0),
        String(entry.impressions ?? 0),
        (entry.ctr ?? 0).toFixed(4),
        String(entry.paid ?? 0),
        (entry.cr ?? 0).toFixed(4),
        formatMoneyMap(entry.revenue),
      ]),
    );
  }

  function handleExportTopSlugsJSON() {
    if (!snapshot) return;
    exportJSON(`analytics-top-slugs-${range}.json`, snapshot.topSlugs);
  }

  function handleExportSourcesCSV() {
    if (!snapshot) return;
    exportCSV(
      `analytics-sources-${range}.csv`,
      ["source", "count", "paid", "cr", "revenue"],
      snapshot.topSources.map((entry) => [
        entry.source,
        String(entry.count ?? 0),
        String(entry.paid ?? 0),
        (entry.cr ?? 0).toFixed(4),
        formatMoneyMap(entry.revenue),
      ]),
    );
  }

  function handleExportSourcesJSON() {
    if (!snapshot) return;
    exportJSON(`analytics-sources-${range}.json`, snapshot.topSources);
  }

  function handleExportUtmCSV() {
    if (!snapshot) return;
    exportCSV(
      `analytics-utm-${range}.csv`,
      ["utm_source", "utm_campaign", "count"],
      snapshot.utm.map((entry) => [entry.source, entry.campaign, String(entry.count ?? 0)]),
    );
  }

  const topSparkline = useMemo(
    () => (snapshot ? Object.entries(snapshot.sparkline).map(([slug, data]) => ({ slug, data })) : []),
    [snapshot],
  );

  const virt = useMemo(
    () => ({
      topSlugs: (snapshot?.topSlugs?.length ?? 0) > 200,
      topSources: (snapshot?.topSources?.length ?? 0) > 200,
      utm: (snapshot?.utm?.length ?? 0) > 200,
    }),
    [snapshot],
  );

  return (
    <Section className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-sm text-slate-500 dark:text-white/60">
          Overview of impressions, clicks, conversions, and UTM performance.
        </p>
      </div>
      {lastUpdated ? (
        <div className="text-xs text-slate-500 dark:text-white/40">Updated {lastUpdated.toLocaleString()}</div>
      ) : null}
    </div>

    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 bg-white p-4 text-sm shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white/80">
      <label htmlFor="analytics-range" className="text-slate-600 dark:text-white/70">
        Range
      </label>
      <select
        id="analytics-range"
        className="h-10 rounded-lg border border-neutral-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-(--accent) focus:ring-1 focus:ring-(--accent)/20 dark:border-white/10 dark:bg-black/40 dark:text-white"
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
            className="h-10 rounded-lg border border-neutral-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none focus:border-(--accent) focus:ring-1 focus:ring-(--accent)/20 dark:border-white/10 dark:bg-black/40 dark:text-white"
            value={customFrom}
            onChange={(event) => setCustomFrom(event.target.value)}
          />
          <input
            type="date"
            className="h-10 rounded-lg border border-neutral-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none focus:border-(--accent) focus:ring-1 focus:ring-(--accent)/20 dark:border-white/10 dark:bg-black/40 dark:text-white"
            value={customTo}
            onChange={(event) => setCustomTo(event.target.value)}
          />
        </>
      ) : null}
      <details className="ml-auto w-full rounded-lg border border-neutral-200 bg-white p-3 shadow-sm md:w-auto md:min-w-[320px] dark:border-white/10 dark:bg-black/40">
        <summary className="cursor-pointer text-slate-600 dark:text-white/70">Advanced filters</summary>
        <div className="mt-3 space-y-3 text-sm text-slate-600 dark:text-white/80">
            <div className="grid gap-3 md:grid-cols-2">
              <input
                className="h-9 rounded border border-neutral-300 bg-white px-3 text-sm text-slate-900 outline-none shadow-sm focus:border-(--accent) focus:ring-1 focus:ring-(--accent)/20 dark:border-white/15 dark:bg-white/5 dark:text-white"
                placeholder="Slug comma separated"
                value={slugFilter}
                onChange={(event) => setSlugFilter(event.target.value)}
              />
              <input
                className="h-9 rounded border border-neutral-300 bg-white px-3 text-sm text-slate-900 outline-none shadow-sm focus:border-(--accent) focus:ring-1 focus:ring-(--accent)/20 dark:border-white/15 dark:bg-white/5 dark:text-white"
                placeholder="UTM source"
                value={utmSourceFilter}
                onChange={(event) => setUtmSourceFilter(event.target.value)}
              />
              <input
                className="h-9 rounded border border-neutral-300 bg-white px-3 text-sm text-slate-900 outline-none shadow-sm focus:border-(--accent) focus:ring-1 focus:ring-(--accent)/20 dark:border-white/15 dark:bg-white/5 dark:text-white"
                placeholder="UTM campaign"
                value={utmCampaignFilter}
                onChange={(event) => setUtmCampaignFilter(event.target.value)}
              />
              <input
                className="h-9 rounded border border-neutral-300 bg-white px-3 text-sm text-slate-900 outline-none shadow-sm focus:border-(--accent) focus:ring-1 focus:ring-(--accent)/20 dark:border-white/15 dark:bg-white/5 dark:text-white"
                placeholder="Device (desktop,mobile)"
                value={deviceFilter}
                onChange={(event) => setDeviceFilter(event.target.value)}
              />
              <input
                className="h-9 rounded border border-neutral-300 bg-white px-3 text-sm text-slate-900 outline-none shadow-sm focus:border-(--accent) focus:ring-1 focus:ring-(--accent)/20 dark:border-white/15 dark:bg-white/5 dark:text-white"
                placeholder="Language (en,ru)"
                value={langFilter}
                onChange={(event) => setLangFilter(event.target.value)}
              />
              <input
                className="h-9 rounded border border-neutral-300 bg-white px-3 text-sm text-slate-900 outline-none shadow-sm focus:border-(--accent) focus:ring-1 focus:ring-(--accent)/20 dark:border-white/15 dark:bg-white/5 dark:text-white"
                placeholder="Referrer host"
                value={referrerFilter}
                onChange={(event) => setReferrerFilter(event.target.value)}
              />
              <input
                type="number"
                min={10}
                max={300}
                step={10}
                className="h-9 rounded border border-neutral-300 bg-white px-3 text-sm text-slate-900 outline-none shadow-sm focus:border-(--accent) focus:ring-1 focus:ring-(--accent)/20 dark:border-white/15 dark:bg-white/5 dark:text-white"
                placeholder="Top limit"
                value={limitInput}
                onChange={(event) => setLimitInput(event.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 text-slate-600 dark:text-white/80">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border border-white/30 bg-white/10 text-(--accent) focus:ring-(--accent)"
                  checked={compare}
                  onChange={(event) => setCompare(event.target.checked)}
                />
                Compare with previous period
              </label>
              <button
                type="button"
                className="ml-auto inline-flex items-center rounded border border-neutral-200 bg-white px-3 py-1 text-xs text-slate-700 transition hover:-translate-y-px hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent)/30 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                onClick={resetFilters}
                disabled={!hasAdvancedFilters}
              >
                Reset filters
              </button>
            </div>
          </div>
        </details>
      </div>

      {appliedFilters.length ? (
        <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-white/60">
          <span className="text-slate-500 dark:text-white/50">Active filters:</span>
          {appliedFilters.map((token) => (
            <span key={token} className="rounded-full border border-neutral-200 bg-white dark:border-white/10 dark:bg-white/5 px-2 py-1 text-slate-500 dark:text-white/70">
              {token}
            </span>
          ))}
        </div>
      ) : null}

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
          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2 xl:grid-cols-4">
            <KpiCard label="Impressions" value={(snapshot.totals.impressions || 0).toLocaleString()} />
            <KpiCard label="Clicks" value={(snapshot.totals.clicks || 0).toLocaleString()} />
            <KpiCard
              label="CTR"
              value={formatPct(
                (snapshot.totals.impressions || 0) > 0
                  ? (snapshot.totals.clicks || 0) / (snapshot.totals.impressions || 1)
                  : 0,
              )}
            />
            <KpiCard label="Paid" value={(snapshot.funnel?.paid || 0).toLocaleString()} />
            <KpiCard
              label="CR (Click→Paid)"
              value={formatPct(
                (snapshot.funnel?.clicks || 0) > 0 ? (snapshot.funnel?.paid || 0) / (snapshot.funnel?.clicks || 1) : 0,
              )}
            />
            <KpiCard label="Revenue" value={formatMoneyMap(snapshot.kpi?.revenueByCurrency)} />
            <KpiCard label="Net" value={formatMoneyMap(snapshot.kpi?.netByCurrency)} />
          </div>

          {compare && snapshot.compare ? <CompareSummary compare={snapshot.compare} /> : null}

          <FunnelView funnel={snapshot.funnel} />

          <ClicksByDay data={snapshot.byDay.clicks} label={presetLabel} />

          <TopSlugsBlock
            data={snapshot.topSlugs}
            onExportCSVAction={handleExportTopSlugsCSV}
            onExportJSONAction={handleExportTopSlugsJSON}
            useVirtualization={virt.topSlugs}
          />

          <SlugSparklines items={topSparkline} />

          <TopSourcesBlock
            data={snapshot.topSources}
            onExportCSVAction={handleExportSourcesCSV}
            onExportJSONAction={handleExportSourcesJSON}
            useVirtualization={virt.topSources}
          />

          <UtmTableBlock data={snapshot.utm} onExportCSVAction={handleExportUtmCSV} useVirtualization={virt.utm} />

          <Card className="space-y-3 p-4">
            <h2 className="font-semibold">Impressions by device</h2>
            <div className="space-y-1 text-sm text-slate-600 dark:text-white/80">
              {snapshot.devices.map((entry) => (
                <div key={entry.device} className="flex justify-between gap-3">
                  <span className="capitalize">{entry.device}</span>
                  <span className="text-slate-500 dark:text-white/70">{entry.count}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="space-y-3 p-4">
            <h2 className="font-semibold">Impressions by language</h2>
            <div className="space-y-1 text-sm text-slate-600 dark:text-white/80">
              {snapshot.languages.map((entry) => (
                <div key={entry.lang} className="flex justify-between gap-3">
                  <span>{entry.lang}</span>
                  <span className="text-slate-500 dark:text-white/70">{entry.count}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : (
        <Card className="p-4 text-sm text-slate-500 dark:text-white/60">Select range to load analytics.</Card>
      )}
    </Section>
  );
}
