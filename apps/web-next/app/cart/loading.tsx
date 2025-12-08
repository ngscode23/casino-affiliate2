"use client";

import Skeleton from "@ui/components/common/skeleton";

export default function CartLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8" aria-busy="true">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32 rounded-lg" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-4 md:col-span-2">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={`cart-skeleton-${idx}`}
              className="flex items-center gap-4 rounded-2xl border border-border/40 bg-card/60 p-4"
            >
              <Skeleton className="h-20 w-24 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-3 w-1/3 rounded" />
              </div>
              <div className="flex flex-col items-end gap-2">
                <Skeleton className="h-9 w-16 rounded-md" />
                <Skeleton className="h-4 w-20 rounded" />
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3 rounded-2xl border border-border/40 bg-card/60 p-5">
          <Skeleton className="h-5 w-24 rounded" />
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-3 w-40 rounded" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

