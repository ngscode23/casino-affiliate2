"use client";

import type { ReactNode } from "react";

import { Skeleton } from "./Skeleton";

type Status = "idle" | "loading" | "error" | "success";

type Props = {
  status: Status;
  children: ReactNode;
  skeleton?: ReactNode;
  errorFallback?: ReactNode;
};

function DefaultErrorBanner() {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
    >
      Не удалось загрузить данные. Попробуйте позже.
    </div>
  );
}

function DefaultSkeleton() {
  return <Skeleton className="h-16 w-full rounded-2xl border border-border/40 bg-border/30" aria-busy="true" />;
}

export function AsyncSection({ status, children, skeleton, errorFallback }: Props) {
  if (status === "loading") {
    return <>{skeleton ?? <DefaultSkeleton />}</>;
  }

  if (status === "error") {
    return <>{errorFallback ?? <DefaultErrorBanner />}</>;
  }

  return <>{children}</>;
}
