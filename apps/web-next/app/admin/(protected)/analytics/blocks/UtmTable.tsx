"use client";

import Card from "@ui/components/common/card";
import VirtualList from "./VirtualList";

type UtmRow = { source: string; campaign: string; count: number };

export default function UtmTable({
  data,
  onExportCSV,
  useVirtualization = false,
}: {
  data: UtmRow[];
  onExportCSV?: () => void;
  useVirtualization?: boolean;
}) {
  const showVirtual = useVirtualization && data.length > 100;

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">UTM source/campaign</h2>
        {onExportCSV ? (
          <button
            type="button"
            className="rounded-md border border-white/15 px-2 py-1 text-xs text-white transition hover:bg-white/10"
            onClick={onExportCSV}
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
            <div className="flex items-center justify-between gap-3 text-xs text-white/80">
              <span className="truncate">{entry.source} · {entry.campaign}</span>
              <span>{entry.count}</span>
            </div>
          )}
        />
      ) : (
        <div className="space-y-1 text-xs text-white/80">
          {data.slice(0, 20).map((entry) => (
            <div key={`${entry.source}-${entry.campaign}`} className="flex justify-between gap-3">
              <span className="truncate">{entry.source} · {entry.campaign}</span>
              <span>{entry.count}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

