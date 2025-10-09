"use client";

import Card from "@ui/components/common/card";
import type { AnalyticsDayPoint } from "@/lib/admin/analytics";
import { Spark } from "./Spark";

export default function SlugSparklines({ items }: { items: Array<{ slug: string; data: AnalyticsDayPoint[] }> }) {
  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Slug sparklines</h2>
        <span className="text-xs text-white/50">Top {items.length}</span>
      </div>
      <div className="space-y-2 text-sm text-white/80">
        {items.length === 0 ? (
          <div className="text-xs text-white/50">No data</div>
        ) : (
          items.map((entry) => (
            <div key={entry.slug} className="flex items-center justify-between gap-3">
              <span className="truncate text-xs text-white/70">{entry.slug}</span>
              <Spark data={entry.data} />
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

