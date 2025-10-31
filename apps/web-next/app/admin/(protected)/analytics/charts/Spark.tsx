"use client";

import type { AnalyticsDayPoint } from "@/lib/admin/analytics";

export function Spark({ data, width = 240, height = 40, padding = 4 }: {
  data: AnalyticsDayPoint[];
  width?: number;
  height?: number;
  padding?: number;
}) {
  if (!data?.length) {
    return <div className="h-10 w-full rounded bg-slate-200 dark:bg-white/5" aria-hidden />;
  }
  const max = Math.max(1, ...data.map((p) => p.count));
  const step = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0;
  const d = data
    .map((p, i) => {
      const cmd = i === 0 ? "M" : "L";
      const x = padding + i * step;
      const y = height - padding - (p.count / max) * (height - padding * 2);
      return `${cmd} ${x} ${y}`;
    })
    .join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth={2} strokeOpacity={0.85} />
    </svg>
  );
}
