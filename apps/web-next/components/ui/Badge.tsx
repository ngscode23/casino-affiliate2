"use client";

import type { HTMLAttributes } from "react";
import { cn } from "@shared/lib/cn";

type Props = HTMLAttributes<HTMLSpanElement> & {
  tone?: "default" | "muted" | "primary";
};

export function Badge({ className, tone = "default", children, ...rest }: Props) {
  const toneClass =
    tone === "primary"
      ? "bg-primary/15 text-primary"
      : tone === "muted"
        ? "bg-border/60 text-muted"
        : "bg-surface/70 text-fg";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
        toneClass,
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}

export default Badge;
