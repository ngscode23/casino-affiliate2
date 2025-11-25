"use client";

export function FeaturedSkeleton() {
  return (
    <section className="mx-auto w-full max-w-screen-xl space-y-8 px-6 py-12 sm:px-8 lg:px-10">
      <div className="space-y-3">
        <div className="h-3 w-28 rounded-full bg-border/60 animate-pulse" />
        <div className="h-8 w-2/3 rounded-lg bg-border/50 animate-pulse" />
        <div className="h-4 w-1/2 rounded-lg bg-border/50 animate-pulse" />
      </div>

      <div className="mx-auto w-full max-w-[1260px] rounded-[30px] border border-border/30 bg-card/80 px-6 py-8 shadow-[0_24px_80px_-52px_rgba(16,24,40,0.45)] sm:px-8 sm:py-10">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <article
              key={i}
              className="flex flex-col gap-4 rounded-2xl border border-border/40 bg-card/90 p-4 shadow-soft"
              aria-hidden="true"
            >
              <div className="aspect-square w-full overflow-hidden rounded-xl bg-border/50 animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 w-3/4 rounded bg-border/60 animate-pulse" />
                <div className="h-4 w-1/2 rounded bg-border/50 animate-pulse" />
                <div className="h-4 w-2/3 rounded bg-border/50 animate-pulse" />
              </div>
              <div className="h-10 w-full rounded-full bg-border/60 animate-pulse" />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
