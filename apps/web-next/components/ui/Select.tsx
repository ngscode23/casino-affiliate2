"use client";

import type { SelectHTMLAttributes } from "react";
import { forwardRef } from "react";
import { cn } from "@shared/lib/cn";

type Props = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, Props>(({ className, children, ...rest }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        "w-full rounded-[var(--radius-md)] border border-border/50 bg-card/80 px-3 py-2.5 text-sm text-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
        "focus-visible:outline-none focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/20",
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
});

Select.displayName = "Select";

export default Select;
