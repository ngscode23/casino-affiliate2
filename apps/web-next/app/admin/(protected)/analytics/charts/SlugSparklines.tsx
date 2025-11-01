"use client";

import type { AnalyticsDayPoint } from "@/lib/admin/analytics";
import { AnalyticsTile as Tile } from "../tiles";
import { Spark } from "./Spark";

export default function SlugSparklines({ items }: { items: Array<{ slug: string; data: AnalyticsDayPoint[] }> }) {
  return (
    <Tile tone="muted" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Slug sparklines</h2>
        <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Top {items.length}</span>
      </div>
      <div className="space-y-3 text-sm text-slate-200">
        {items.length === 0 ? (
          <div className="text-xs uppercase tracking-[0.3em] text-slate-500">No data</div>
        ) : (
          items.map((entry) => (
            <div key={entry.slug} className="flex items-center justify-between gap-3">
              <span className="truncate text-xs uppercase tracking-[0.25em] text-slate-500">{entry.slug}</span>
              <Spark data={entry.data} />
            </div>
          ))
        )}
      </div>
    </Tile>
  );
}
