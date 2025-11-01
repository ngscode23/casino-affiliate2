"use client";

import VirtualList from "./VirtualList";
import { AnalyticsTile as Tile } from "../tiles";

type TopSource = { source: string; count: number };

export default function TopSources({
  data,
  onExportCSVAction,
  onExportJSONAction,
  useVirtualization = false,
}: {
  data: TopSource[];
  onExportCSVAction?: () => void;
  onExportJSONAction?: () => void;
  useVirtualization?: boolean;
}) {
  const showVirtual = useVirtualization && data.length > 80;

  return (
    <Tile tone="muted" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">Top sources</h2>
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
          height={320}
          itemHeight={32}
          keyExtractor={(item) => item.source}
          renderItem={(entry) => (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 py-2 text-sm text-slate-200">
              <span className="truncate font-semibold text-white">{entry.source}</span>
              <span className="text-slate-400">{entry.count}</span>
            </div>
          )}
        />
      ) : (
        <div className="space-y-2 text-sm text-slate-200">
          {data.map((entry) => (
            <div
              key={entry.source}
              className="flex justify-between gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 py-2"
            >
              <span className="truncate font-semibold text-white">{entry.source}</span>
              <span className="text-slate-400">{entry.count}</span>
            </div>
          ))}
        </div>
      )}
    </Tile>
  );
}
