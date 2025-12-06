import Skeleton from "@ui/components/common/skeleton";

export default function CatalogLoading() {
  return (
    <div className="bg-background" aria-busy="true" aria-live="polite">
      <section className="mx-auto max-w-screen-xl space-y-6 px-6 pt-12 pb-14 sm:px-8 sm:pt-14 lg:px-10 lg:pt-16">
        <div className="flex flex-col gap-3 text-center sm:text-left">
          <Skeleton className="inline-flex h-4 w-32 sm:w-28" />
          <Skeleton className="h-9 w-72 sm:w-80" />
          <Skeleton className="mt-1 h-5 w-full max-w-3xl" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, idx) => (
            <div
              key={`catalog-loading-${idx}`}
              className="overflow-hidden rounded-3xl border border-border/40 bg-card/80 p-4 shadow-[0_20px_60px_-45px_rgba(0,0,0,0.35)]"
            >
              <Skeleton className="aspect-[4/5] w-full rounded-2xl" />
              <div className="mt-4 space-y-2">
                <Skeleton className="h-4 w-3/4 rounded-full" />
                <Skeleton className="h-4 w-1/2 rounded-full" />
                <Skeleton className="h-10 w-full rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
