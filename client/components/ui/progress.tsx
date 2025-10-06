import * as React from "react";

import { cn } from "../../lib/utils";

type ProgressProps = React.HTMLAttributes<HTMLDivElement> & {
  value?: number;
  max?: number;
};

const clamp = (value: number, max: number) => {
  if (!Number.isFinite(value)) return 0;
  if (!Number.isFinite(max) || max <= 0) return 0;
  const ratio = (value / max) * 100;
  return Math.min(100, Math.max(0, ratio));
};

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, ...props }, ref) => {
    const percent = clamp(value, max);
    const widthClass = `w-pct-${Math.round(percent)}` as const;

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.round(percent)}
        className={cn(
          "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
          className,
        )}
        {...props}
      >
        <div
          className={cn(
            "h-full rounded-full bg-primary transition-[width] duration-300 ease-out",
            widthClass,
          )}
        />
      </div>
    );
  },
);
Progress.displayName = "Progress";
