// src/components/common/pills.tsx
import * as React from "react";

type BasePillProps = React.HTMLAttributes<HTMLSpanElement> & {
  children: React.ReactNode;
  className?: string;
};

function BasePill({ children, className = "", ...rest }: BasePillProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        "border border-white/10",
        "bg-[linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02))]",
        "shadow-[0_6px_14px_rgba(0,0,0,.25)]",
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </span>
  );
}

/** Рейтинг: ★ 4.5 */
export function RatingPill({ value = 0 }: { value?: number }) {
  const v = Number.isFinite(value) ? value : 0;
  const tone =
    v >= 4.5 ? "text-emerald-300" : v >= 3.5 ? "text-yellow-300" : "text-red-300";

  return (
    <BasePill className={tone} aria-label={`Rating ${v.toFixed(1)}`}>
      <span aria-hidden>★</span> {v.toFixed(1)}
    </BasePill>
  );
}

/** Выплаты: ~2h (зелёным при ≤ 2ч) или — */
export function PayoutPill({ hours }: { hours?: number }) {
  const fast = typeof hours === "number" && Number.isFinite(hours) && hours <= 2;
  const tone = fast ? "text-emerald-300" : "text-[var(--text-dim)]";

  return (
    <BasePill
      className={tone}
      aria-label={hours ? `~${hours} hours` : "unknown payout time"}
    >
      {hours ? `~${hours}h` : "—"}
    </BasePill>
  );
}