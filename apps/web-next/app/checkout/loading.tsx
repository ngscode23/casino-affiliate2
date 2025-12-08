"use client";

import Skeleton from "@ui/components/common/skeleton";

export default function CheckoutLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6 lg:px-8" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40 rounded-lg" />
        <Skeleton className="h-4 w-64 rounded" />
      </div>
      <div className="space-y-4 rounded-2xl border border-border/40 bg-card/70 p-4 sm:p-6">
        <Skeleton className="h-5 w-32 rounded" />
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={idx} className="h-11 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-11 w-40 rounded-full" />
      </div>
      <div className="space-y-3 rounded-2xl border border-border/40 bg-card/70 p-4 sm:p-6">
        <Skeleton className="h-5 w-28 rounded" />
        <Skeleton className="h-4 w-32 rounded" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    </div>
  );
}

