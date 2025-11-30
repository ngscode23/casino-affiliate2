"use client";;
import { headingLgOnDark, overlineLight } from "@/styles/classnames";

import type { AnalyticsDayPoint } from "@/lib/admin/analytics";
import { AnalyticsTile as Tile } from "../tiles";
import { Spark } from "./Spark";

export default function SlugSparklines({ items }: { items: Array<{ slug: string; data: AnalyticsDayPoint[] }> }) {
  return (
    <Tile tone="muted" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className={headingLgOnDark}>Slug sparklines</h2>
        <span className={overlineLight}>Top {items.length}</span>
      </div>
      <div className="space-y-3 text-sm text-slate-200">
        {items.length === 0 ? (
          <div className={overlineLight}>No data</div>
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
