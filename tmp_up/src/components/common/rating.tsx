import * as React from "react";

export default function Rating({ value=0, max=5 }:{ value?: number; max?: number }) {
  const full = Math.round(Math.max(0, Math.min(value, max)));
  return (
    <div className="inline-flex items-center gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} aria-hidden style={{ lineHeight: 1, fontSize: "1.05rem" }}>
          {i < full ? "★" : "☆"}
        </span>
      ))}
      <span className="ml-1 text-[var(--text-dim)] text-sm">{value.toFixed?.(1) ?? value}</span>
    </div>
  );
}