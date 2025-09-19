import * as React from "react";
import cn from "@/lib/cn";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: React.ElementType;
  kind?: "neon" | "flat";
}
export default function Card({ as:Comp="div", kind="neon", className, ...rest }: CardProps) {
  const base = "rounded-2xl border border-border bg-card p-4 md:p-6 shadow-sm dark:border-white/10 dark:bg-[rgb(var(--bg-1))]";
  const bg = kind === "neon" ? "" : "bg-white dark:bg-[rgb(var(--bg-0))]";
  return (
    <Comp className={cn(base, bg, className)} {...rest} />
  );
}
