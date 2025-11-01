"use client";

import clsx from "clsx";
import type { HTMLAttributes, ReactNode } from "react";

export const ANALYTICS_TILE_BASE =
  "relative overflow-hidden rounded-3xl border border-white/6 bg-[#0c141f]/85 p-6 shadow-[0_28px_55px_rgba(8,12,32,0.55)] backdrop-blur";
export const ANALYTICS_TILE_MUTED =
  "relative overflow-hidden rounded-3xl border border-white/5 bg-[#0a121f]/80 p-6 shadow-[0_22px_38px_rgba(8,12,32,0.45)] backdrop-blur";
export const ANALYTICS_TILE_ACCENT =
  "relative overflow-hidden rounded-3xl border border-sky-500/40 bg-gradient-to-br from-[#142742] via-[#101c2e] to-[#091321] p-6 shadow-[0_32px_55px_rgba(14,116,219,0.35)] backdrop-blur";
export const ANALYTICS_KPI_LABEL = "text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-400";

export type AnalyticsTileTone = "base" | "muted" | "accent";

export type AnalyticsTileProps = HTMLAttributes<HTMLDivElement> & {
  tone?: AnalyticsTileTone;
  children: ReactNode;
};

export function AnalyticsTile({ tone = "base", className, children, ...rest }: AnalyticsTileProps) {
  const toneClass =
    tone === "muted" ? ANALYTICS_TILE_MUTED : tone === "accent" ? ANALYTICS_TILE_ACCENT : ANALYTICS_TILE_BASE;
  return (
    <div {...rest} className={clsx(toneClass, className)}>
      {children}
    </div>
  );
}
