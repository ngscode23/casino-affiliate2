import * as React from "react";

export function Pill({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "rating" | "ok" | "warn" }) {
  const base = "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs border border-white/10 bg-white/5";
  const toneCls =
    tone === "rating"
      ? "font-semibold"
      : tone === "ok"
      ? "text-emerald-300 border-emerald-500/20 bg-emerald-500/10"
      : tone === "warn"
      ? "text-amber-300 border-amber-500/20 bg-amber-500/10"
      : "";
  return <span className={[base, toneCls].filter(Boolean).join(" ")}>{children}</span>;
}

export default Pill;


