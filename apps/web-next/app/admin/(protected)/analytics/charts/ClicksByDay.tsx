"use client";

import Card from "@ui/components/common/card";
import type { AnalyticsDayPoint } from "@/lib/admin/analytics";
import { Spark } from "./Spark";

export default function ClicksByDay({ data, label }: { data: AnalyticsDayPoint[]; label: string }) {
  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Clicks by day</h2>
        <span className="text-xs text-white/50">{label}</span>
      </div>
      <Spark data={data} />
      <div className="grid grid-cols-2 gap-2 text-xs text-white/60">
        {data.slice(-10).map((point) => (
          <div key={point.date} className="flex justify-between">
            <span>{point.date}</span>
            <span>{point.count}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

