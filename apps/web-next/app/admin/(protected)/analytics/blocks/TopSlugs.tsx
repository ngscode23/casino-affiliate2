"use client";

import Card from "@ui/components/common/card";
import VirtualList from "./VirtualList";

type TopSlug = { slug: string; clicks: number; impressions: number; ctr: number };

export default function TopSlugs({
  data,
  onExportCSV,
  onExportJSON,
  useVirtualization = false,
}: {
  data: TopSlug[];
  onExportCSV?: () => void;
  onExportJSON?: () => void;
  useVirtualization?: boolean;
}) {
  const showVirtual = useVirtualization && data.length > 50;

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Top slugs</h2>
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
          height={360}
          itemHeight={36}
          keyExtractor={(item) => item.slug}
          renderItem={(entry) => (
            <div className="grid grid-cols-[minmax(0,1fr),auto,auto,auto] items-center gap-3 text-xs sm:text-sm">
              <span className="truncate font-medium text-white">{entry.slug}</span>
              <span className="text-right">{entry.clicks}</span>
              <span className="text-right">{entry.impressions}</span>
              <span className="text-right text-white/70">{(entry.ctr * 100).toFixed(1)}%</span>
            </div>
          )}
        />
      ) : (
        <div className="space-y-2 text-sm text-white/80">
          {data.slice(0, 10).map((entry) => (
            <div key={entry.slug} className="grid grid-cols-[minmax(0,1fr),auto,auto,auto] gap-3 text-xs sm:text-sm">
              <span className="truncate font-medium text-white">{entry.slug}</span>
              <span className="text-right">{entry.clicks}</span>
              <span className="text-right">{entry.impressions}</span>
              <span className="text-right text-white/70">{(entry.ctr * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

