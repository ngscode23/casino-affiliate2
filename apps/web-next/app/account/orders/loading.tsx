"use client";

import Skeleton from "@ui/components/common/skeleton";

export default function AccountOrdersLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6 lg:px-8" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48 rounded-lg" />
        <Skeleton className="h-4 w-64 rounded" />
      </div>
      <div className="space-y-3 rounded-2xl border border-border/40 bg-card/70 p-4 sm:p-6">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="space-y-2 rounded-xl border border-border/30 bg-card/80 p-4">
            <Skeleton className="h-4 w-40 rounded" />
            <Skeleton className="h-3 w-24 rounded" />
            <Skeleton className="h-3 w-32 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

