"use client";

import { memo, useMemo, useState } from "react";

import type { BarPoint, LinePoint } from "@/lib/admin/metrics";

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "0";
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}м`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1)}к`;
  }
  return value.toFixed(value % 1 === 0 ? 0 : 1);
}

export const BarsChart = memo(function BarsChartComponent({ data }: { data: BarPoint[] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const { max, min } = useMemo(() => {
    if (!data?.length) return { max: 0, min: 0 };
    return data.reduce(
      (acc, point) => ({
        max: Math.max(acc.max, Number(point.value) || 0),
        min: Math.min(acc.min, Number(point.value) || 0),
      }),
      { max: Number.NEGATIVE_INFINITY, min: Number.POSITIVE_INFINITY }
    );
  }, [data]);

  const safeMax = max === Number.NEGATIVE_INFINITY ? 0 : max;
  const range = safeMax <= 0 ? 1 : safeMax;

  return (
    <div className="h-40">
      <div className="flex h-full w-full items-end gap-2 overflow-hidden rounded-xl bg-black/10 px-3 py-3">
        {data.map((point) => {
          const height = Math.max(0, Math.min(100, (Number(point.value) / range) * 100));
          const isActive = hovered === point.label;
          return (
            <button
              key={point.label}
              type="button"
              onMouseEnter={() => setHovered(point.label)}
              onMouseLeave={() => setHovered((prev) => (prev === point.label ? null : prev))}
              className="group flex h-full min-w-0 flex-1 flex-col items-center gap-2 focus-visible:outline-none"
              title={`${point.label}: ${formatNumber(Number(point.value) || 0)}`}
            >
              <div className="relative flex h-full w-full flex-1 items-end">
                <div
                  className="mx-auto w-full max-w-[14px] rounded-t-md bg-[var(--accent,#60a5fa)] transition-all duration-150 ease-out group-hover:bg-white"
                  style={{ height: `${height}%`, boxShadow: isActive ? "0 10px 30px rgba(96,165,250,0.35)" : undefined }}
                />
              </div>
              <span className="truncate text-[11px] uppercase tracking-[0.2em] text-slate-300">{point.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
});

export const LineMiniChart = memo(function LineMiniChartComponent({ data }: { data: LinePoint[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const { max, min } = useMemo(() => {
    if (!data?.length) return { max: 0, min: 0 };
    return data.reduce(
      (acc, point) => ({
        max: Math.max(acc.max, Number(point.value) || 0),
        min: Math.min(acc.min, Number(point.value) || 0),
      }),
      { max: Number.NEGATIVE_INFINITY, min: Number.POSITIVE_INFINITY }
    );
  }, [data]);

  const safeMax = max === Number.NEGATIVE_INFINITY ? 0 : max;
  const safeMin = min === Number.POSITIVE_INFINITY ? 0 : min;
  const range = safeMax - safeMin || 1;

  const path = useMemo(() => {
    if (!data?.length) return "";
    return data
      .map((point, index) => {
        const x = (index / Math.max(1, data.length - 1)) * 100;
        const normalized = (Number(point.value) - safeMin) / range;
        const y = 100 - Math.max(0, Math.min(1, normalized)) * 100;
        return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");
  }, [data, range, safeMin]);

  return (
    <div className="h-40">
      <div className="relative h-full w-full rounded-xl bg-black/10 px-3 py-3">
        <svg viewBox="0 0 100 100" className="h-full w-full text-[var(--accent,#60a5fa)]" preserveAspectRatio="none">
          <defs>
            <linearGradient id="line-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(96,165,250,0.35)" />
              <stop offset="100%" stopColor="rgba(96,165,250,0)" />
            </linearGradient>
          </defs>
          {path ? (
            <>
              <path d={`${path}`} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
              <path d={`${path} L 100 100 L 0 100 Z`} fill="url(#line-fill)" opacity={0.5} />
            </>
          ) : null}
          {data.map((point, index) => {
            const x = (index / Math.max(1, data.length - 1)) * 100;
            const normalized = (Number(point.value) - safeMin) / range;
            const y = 100 - Math.max(0, Math.min(1, normalized)) * 100;
            const active = hoveredIndex === index;

            return (
              <g key={point.label}>
                <circle
                  cx={x}
                  cy={y}
                  r={active ? 1.8 : 1.4}
                  fill="currentColor"
                  className="transition-all duration-150 ease-out"
                />
                <rect
                  x={Math.max(0, x - 3)}
                  y={0}
                  width={6}
                  height={100}
                  fill="transparent"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex((prev) => (prev === index ? null : prev))}
                >
                  <title>
                    {point.label}: {formatNumber(Number(point.value) || 0)}
                  </title>
                </rect>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
});

export const GoalPieChart = memo(function GoalPieChartComponent({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const gradient = `conic-gradient(var(--accent,#60a5fa) 0deg ${clamped * 3.6}deg, rgba(255,255,255,0.08) ${clamped * 3.6}deg 360deg)`;

  return (
    <div className="h-[140px]">
      <div className="flex h-full w-full items-center justify-center">
        <div
          className="relative flex h-32 w-32 items-center justify-center rounded-full transition-colors duration-300"
          style={{ backgroundImage: gradient }}
          role="img"
          aria-label={`Goal completion ${clamped}%`}
        >
          <div className="h-20 w-20 rounded-full bg-[rgba(12,16,22,0.96)] text-center text-sm font-semibold text-white/90">
            <div className="mt-6 leading-tight">{clamped.toFixed(0)}%</div>
          </div>
        </div>
      </div>
    </div>
  );
});
