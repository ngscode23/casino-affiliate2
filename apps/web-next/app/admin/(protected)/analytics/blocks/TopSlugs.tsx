"use client";;
import { headingLgOnDark } from "@/styles/classnames";

import VirtualList from "./VirtualList";
import { AnalyticsTile as Tile } from "../tiles";

type TopSlug = {
  slug: string;
  clicks: number;
  impressions: number;
  ctr: number;
  paid?: number;
  cr?: number;
  revenue?: Record<string, number>;
};

function formatRevenue(map?: Record<string, number>): string {
  if (!map) return "—";
  const entries = Object.entries(map);
  if (entries.length === 0) return "—";
  return entries
    .map(([cur, amount]) => `${(amount ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${cur}`)
    .join(" · ");
}

export default function TopSlugs({
  data,
  onExportCSVAction,
  onExportJSONAction,
  useVirtualization = false,
}: {
  data: TopSlug[];
  onExportCSVAction?: () => void;
  onExportJSONAction?: () => void;
  useVirtualization?: boolean;
}) {
  const showVirtual = useVirtualization && data.length > 50;

  return (
    <Tile tone="muted" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className={headingLgOnDark}>Top slugs</h2>
        <div className="flex gap-2">
          {onExportCSVAction ? (
            <button
              type="button"
              className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-100 transition hover:border-white/20 hover:bg-white/15"
              onClick={onExportCSVAction}
            >
              Export CSV
            </button>
          ) : null}
          {onExportJSONAction ? (
            <button
              type="button"
              className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-100 transition hover:border-white/20 hover:bg-white/15"
              onClick={onExportJSONAction}
            >
              Export JSON
            </button>
          ) : null}
        </div>
      </div>
      {showVirtual ? (
        <VirtualList
          items={data}
          height={360}
          itemHeight={40}
          keyExtractor={(item) => item.slug}
          renderItem={(entry) => (
            <div className="grid grid-cols-[minmax(0,1fr),auto,auto,auto,auto,auto] items-center gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 py-2 text-xs text-slate-200 sm:text-sm">
              <span className="truncate font-semibold text-white">{entry.slug}</span>
              <span className="text-right text-slate-300">{entry.clicks}</span>
              <span className="text-right text-slate-300">{entry.impressions}</span>
              <span className="text-right text-slate-500">{(entry.ctr * 100).toFixed(1)}%</span>
              <span className="text-right text-slate-300">{entry.paid ?? 0}</span>
              <span className="text-right text-slate-500">{((entry.cr ?? 0) * 100).toFixed(1)}%</span>
              <span className="col-span-full truncate text-right text-slate-400 sm:col-span-1">
                {formatRevenue(entry.revenue)}
              </span>
            </div>
          )}
        />
      ) : (
        <div className="space-y-2 text-xs text-slate-300 sm:text-sm">
          {data.slice(0, 10).map((entry) => (
            <div
              key={entry.slug}
              className="grid grid-cols-[minmax(0,1fr),auto,auto,auto,auto,auto] items-center gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 py-2"
            >
              <span className="truncate font-semibold text-white">{entry.slug}</span>
              <span className="text-right text-slate-300">{entry.clicks}</span>
              <span className="text-right text-slate-300">{entry.impressions}</span>
              <span className="text-right text-slate-500">{(entry.ctr * 100).toFixed(1)}%</span>
              <span className="text-right text-slate-300">{entry.paid ?? 0}</span>
              <span className="text-right text-slate-500">{((entry.cr ?? 0) * 100).toFixed(1)}%</span>
              <span className="col-span-full truncate text-right text-slate-400 sm:col-span-1">
                {formatRevenue(entry.revenue)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Tile>
  );
}
