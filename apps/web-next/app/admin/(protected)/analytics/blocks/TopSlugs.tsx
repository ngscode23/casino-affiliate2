"use client";

import Card from "@ui/components/common/card";
import VirtualList from "./VirtualList";

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
    <Card className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Top slugs</h2>
        <div className="flex gap-2">
          {onExportCSVAction ? (
            <button
              type="button"
              className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs text-slate-700 shadow-sm transition hover:-translate-y-px hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent)/30 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
              onClick={onExportCSVAction}
            >
              Export CSV
            </button>
          ) : null}
          {onExportJSONAction ? (
            <button
              type="button"
              className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs text-slate-700 shadow-sm transition hover:-translate-y-px hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent)/30 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
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
          itemHeight={36}
          keyExtractor={(item) => item.slug}
          renderItem={(entry) => (
            <div className="grid grid-cols-[minmax(0,1fr),auto,auto,auto,auto,auto] items-center gap-3 text-xs text-slate-600 sm:text-sm dark:text-white/80">
              <span className="truncate font-medium text-slate-900 dark:text-white">{entry.slug}</span>
              <span className="text-right">{entry.clicks}</span>
              <span className="text-right">{entry.impressions}</span>
              <span className="text-right text-slate-500 dark:text-white/70">{(entry.ctr * 100).toFixed(1)}%</span>
              <span className="text-right">{entry.paid ?? 0}</span>
              <span className="text-right text-slate-500 dark:text-white/70">{((entry.cr ?? 0) * 100).toFixed(1)}%</span>
              <span className="col-span-full truncate text-right text-slate-500 dark:text-white/80 sm:col-span-1">{formatRevenue(entry.revenue)}</span>
            </div>
          )}
        />
      ) : (
        <div className="space-y-2 text-sm text-slate-600 dark:text-white/80">
          {data.slice(0, 10).map((entry) => (
            <div key={entry.slug} className="grid grid-cols-[minmax(0,1fr),auto,auto,auto,auto,auto] gap-3 text-xs text-slate-600 sm:text-sm dark:text-white/80">
              <span className="truncate font-medium text-slate-900 dark:text-white">{entry.slug}</span>
              <span className="text-right">{entry.clicks}</span>
              <span className="text-right">{entry.impressions}</span>
              <span className="text-right text-slate-500 dark:text-white/70">{(entry.ctr * 100).toFixed(1)}%</span>
              <span className="text-right">{entry.paid ?? 0}</span>
              <span className="text-right text-slate-500 dark:text-white/70">{((entry.cr ?? 0) * 100).toFixed(1)}%</span>
              <span className="col-span-full truncate text-right text-slate-500 dark:text-white/80 sm:col-span-1">{formatRevenue(entry.revenue)}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
