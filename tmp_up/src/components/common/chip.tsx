// src/ui/Chip.tsx


import * as React from "react";
import cn from "@/lib/cn";

export default function Chip({ className, glow=false, ...rest }:{
  className?: string; glow?: boolean;
} & React.HTMLAttributes<HTMLSpanElement>) {
  return <span data-glow={glow || undefined} className={cn("neon-chip", className)} {...rest} />;
}



















