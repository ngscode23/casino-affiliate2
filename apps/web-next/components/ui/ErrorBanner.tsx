"use client";

import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@shared/lib/cn";

type ErrorBannerProps = {
  title?: string;
  description?: ReactNode;
  retryLabel?: string;
  onRetry?: () => void;
  className?: string;
};

export function ErrorBanner({
  title = "?? ??????? ??????? ?????????? ?????.",
  description = "????????? ????? ????????. ?????????? ?????? ??? ?????? ???????.",
  retryLabel = "?????????? ??????",
  onRetry,
  className,
}: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-50 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-rose-500/20 text-rose-100">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <p className="font-medium leading-snug">{title}</p>
          {description ? (
            <p className="text-xs text-rose-100/90 sm:text-[13px]">{description}</p>
          ) : null}
        </div>
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-9 items-center justify-center rounded-full bg-rose-500 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-400"
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}

export default ErrorBanner;

