"use client";

import Card from "@ui/components/common/card";
import VirtualList from "./VirtualList";

type TopSource = { source: string; count: number };

export default function TopSources({
  data,
  onExportCSV,
  onExportJSON,
  useVirtualization = false,
}: {
  data: TopSource[];
  onExportCSV?: () => void;
  onExportJSON?: () => void;
  useVirtualization?: boolean;
}) {
  const showVirtual = useVirtualization && data.length > 80;

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Top sources</h2>
        <div className="flex gap-2">
          {onExportCSV ? (
            <button
              type="button"
              className="rounded-md border border-white/15 px-2 py-1 text-xs text-white transition hover:bg-white/10"
              onClick={onExportCSV}
            >
              Export CSV
            </button>
          ) : null}
          {onExportJSON ? (
            <button
              type="button"
              className="rounded-md border border-white/15 px-2 py-1 text-xs text-white transition hover:bg-white/10"
              onClick={onExportJSON}
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
          itemHeight={28}
          keyExtractor={(item) => item.source}
          renderItem={(entry) => (
            <div className="flex items-center justify-between gap-3 text-sm text-white/80">
              <span className="truncate">{entry.source}</span>
              <span className="text-white/70">{entry.count}</span>
            </div>
          )}
        />
      ) : (
        <div className="space-y-1 text-sm text-white/80">
          {data.map((entry) => (
            <div key={entry.source} className="flex justify-between gap-3">
              <span className="truncate">{entry.source}</span>
              <span className="text-white/70">{entry.count}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

