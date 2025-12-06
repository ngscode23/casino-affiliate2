"use client";

import clsx from "clsx";

export const TILE_BASE =
  "relative overflow-hidden rounded-3xl border border-white/6 bg-[#0c141f]/90 p-6 shadow-[0_28px_55px_rgba(8,12,32,0.55)] backdrop-blur";
export const TILE_MUTED =
  "relative overflow-hidden rounded-3xl border border-white/5 bg-[#0a121f]/85 p-6 shadow-[0_22px_38px_rgba(8,12,32,0.45)] backdrop-blur";
export const TILE_ACCENT =
  "relative overflow-hidden rounded-3xl border border-sky-500/40 bg-gradient-to-br from-[#142742] via-[#0f1d33] to-[#0a1425] p-6 shadow-[0_32px_55px_rgba(14,116,219,0.35)] backdrop-blur";
export const TITLE_LABEL_CLASS = "text-[11px] font-semibold uppercase tracking-[0.4em] text-slate-400";
export const METRIC_VALUE_CLASS = "mt-4 text-4xl font-semibold tracking-tight text-white";

export type TileTone = "base" | "muted" | "accent";

export type TileProps = React.HTMLAttributes<HTMLDivElement> & {
  tone?: TileTone;
};

export function Tile({ tone = "base", className, children, ...rest }: TileProps) {
  const toneClass = tone === "muted" ? TILE_MUTED : tone === "accent" ? TILE_ACCENT : TILE_BASE;
  return (
    <div {...rest} className={clsx(toneClass, className)}>
      {children}
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}

export function toCurrency(n: number) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return String(n);
  }
}
