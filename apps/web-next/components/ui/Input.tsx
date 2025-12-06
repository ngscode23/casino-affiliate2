"use client";

import { forwardRef } from "react";
import { cn } from "@shared/lib/cn";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ className, type = "text", invalid, ...rest }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "w-full rounded-[var(--radius-md)] border bg-card/80 px-3 py-2.5 text-sm text-fg placeholder:text-muted",
          "border-border/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
          "focus-visible:outline-none focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/20",
          invalid && "border-destructive/60 bg-destructive/5 text-destructive",
          className,
        )}
        {...rest}
      />
    );
  },
);

Input.displayName = "Input";

export default Input;
