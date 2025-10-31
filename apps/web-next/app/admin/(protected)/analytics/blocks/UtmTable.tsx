"use client";

import Card from "@ui/components/common/card";
import VirtualList from "./VirtualList";

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

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">UTM source/campaign</h2>
        {onExportCSVAction ? (
          <button
            type="button"
            className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs text-slate-700 shadow-sm transition hover:-translate-y-px hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent)/30 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
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
          itemHeight={28}
          keyExtractor={(item) => `${item.source}-${item.campaign}`}
          renderItem={(entry) => (
            <div className="flex items-center justify-between gap-3 text-xs text-slate-600 dark:text-white/80">
              <span className="truncate text-slate-900 dark:text-white">{entry.source} · {entry.campaign}</span>
              <span className="text-slate-500 dark:text-white/70">{entry.count}</span>
            </div>
          )}
        />
      ) : (
        <div className="space-y-1 text-xs text-slate-600 dark:text-white/80">
          {data.slice(0, 20).map((entry) => (
            <div key={`${entry.source}-${entry.campaign}`} className="flex justify-between gap-3">
              <span className="truncate text-slate-900 dark:text-white">{entry.source} · {entry.campaign}</span>
              <span className="text-slate-500 dark:text-white/70">{entry.count}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

