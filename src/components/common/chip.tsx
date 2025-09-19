// src/ui/Chip.tsx


import * as React from "react";
import cn from "@/lib/cn";

export default function Chip({ className, glow=false, ...rest }:{
  className?: string; glow?: boolean;
} & React.HTMLAttributes<HTMLSpanElement>) {
  const base = "inline-flex items-center rounded-xl border border-white/10 bg-[rgb(var(--bg-1))] px-2 py-0.5 text-sm";
  const fx = glow ? "shadow-[0_0_0_2px_rgba(59,130,246,.15)]" : "";
  return <span data-glow={glow || undefined} className={cn(base, fx, className)} {...rest} />;
}



















