"use client";

import type { ReactNode, ButtonHTMLAttributes } from "react";
import { cn } from "@shared/lib/cn";
import Badge from "./Badge";

type TagProps = {
  active?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function Tag({ active, leading, trailing, className, children, type = "button", ...rest }: TagProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex w-full items-center justify-between gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
        active
          ? "border-primary/70 bg-primary/10 text-primary shadow-[var(--elevation-1)]"
          : "border-border/60 bg-card text-muted hover:border-border hover:text-fg hover:shadow-[var(--elevation-1)]",
        className,
      )}
      aria-pressed={active}
      {...rest}
    >
      <span className="inline-flex items-center gap-2 truncate">
        {leading}
        <span className="truncate text-left">{children}</span>
      </span>
      {typeof trailing === "number" ? <Badge tone="muted">{trailing}</Badge> : trailing}
    </button>
  );
}

export default Tag;
