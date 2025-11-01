"use client";

import type { AnalyticsDayPoint } from "@/lib/admin/analytics";
import { AnalyticsTile as Tile } from "../tiles";
import { Spark } from "./Spark";

export default function ClicksByDay({ data, label }: { data: AnalyticsDayPoint[]; label: string }) {
  return (
    <Tile tone="muted" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">Clicks by day</h2>
        <span className="text-xs uppercase tracking-[0.3em] text-slate-500">{label}</span>
      </div>
      <Spark data={data} />
      <div className="grid grid-cols-2 gap-2 text-xs text-slate-200">
        {data.slice(-10).map((point) => (
          <div key={point.date} className="flex justify-between">
            <span className="text-slate-500">{point.date}</span>
            <span>{point.count}</span>
          </div>
        ))}
      </div>
    </Tile>
  );
}
