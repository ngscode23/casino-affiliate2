"use client";;
import { headingLgOnDark } from "@/styles/classnames";

import VirtualList from "./VirtualList";
import { AnalyticsTile as Tile } from "../tiles";

type UtmRow = { source: string; campaign: string; count: number };

export default function UtmTable({
  data,
  onExportCSVAction,
  useVirtualization = false,
}: {
  data: UtmRow[];
  onExportCSVAction?: () => void;
  useVirtualization?: boolean;
}) {
  const showVirtual = useVirtualization && data.length > 100;

  const rowClass =
    "flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 py-2 text-xs text-slate-200 sm:text-sm";

  return (
    <Tile tone="muted" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className={headingLgOnDark}>UTM source / campaign</h2>
        {onExportCSVAction ? (
          <button
            type="button"
            className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-100 transition hover:border-white/20 hover:bg-white/15"
            onClick={onExportCSVAction}
          >
            Export CSV
          </button>
        ) : null}
      </div>
      {showVirtual ? (
        <VirtualList
          items={data}
          height={360}
          itemHeight={32}
          keyExtractor={(item) => `${item.source}-${item.campaign}`}
          renderItem={(entry) => (
            <div className={rowClass}>
              <span className="truncate font-semibold text-white">
                {entry.source} · {entry.campaign}
              </span>
              <span className="text-slate-400">{entry.count}</span>
            </div>
          )}
        />
      ) : (
        <div className="space-y-2 text-xs text-slate-200 sm:text-sm">
          {data.slice(0, 20).map((entry) => (
            <div key={`${entry.source}-${entry.campaign}`} className={rowClass}>
              <span className="truncate font-semibold text-white">
                {entry.source} · {entry.campaign}
              </span>
              <span className="text-slate-400">{entry.count}</span>
            </div>
          ))}
        </div>
      )}
    </Tile>
  );
}
