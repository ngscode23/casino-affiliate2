import Skeleton from "@ui/components/common/skeleton";

export default function ProductLoading() {
  return (
    <div className="bg-background" aria-busy="true" aria-live="polite">
      <div className="mx-auto max-w-screen-xl px-6 py-10 sm:px-8 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4 rounded-3xl border border-border/40 bg-card/80 p-4 shadow-[0_24px_60px_-48px_rgba(0,0,0,0.35)]">
            <Skeleton className="aspect-[4/5] w-full rounded-2xl" />
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, idx) => (
                <Skeleton key={`thumb-${idx}`} className="aspect-square rounded-xl" />
              ))}
            </div>
          </div>
          <div className="space-y-4 rounded-3xl border border-border/30 bg-card/80 p-6 shadow-[0_24px_60px_-48px_rgba(0,0,0,0.35)]">
            <div className="flex flex-col gap-3">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-9 w-3/4" />
              <Skeleton className="h-4 w-full max-w-xl" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-20" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, idx) => (
                <Skeleton key={`bullet-${idx}`} className="h-4 w-full" />
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <Skeleton className="h-11 w-40" />
              <Skeleton className="h-11 w-32" />
            </div>
          </div>
        </div>
        <div className="mt-12 space-y-4 rounded-3xl border border-border/30 bg-card/80 p-6 shadow-[0_24px_60px_-48px_rgba(0,0,0,0.35)]">
          <Skeleton className="h-6 w-48" />
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={`detail-${idx}`} className="space-y-2 rounded-2xl border border-border/20 bg-background/40 p-4">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
