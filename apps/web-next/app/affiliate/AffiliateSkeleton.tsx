"use client";

export function AffiliateSkeleton() {
  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-border/30 bg-card/70 p-8 shadow-card">
        <div className="grid items-start gap-8 md:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="h-4 w-28 rounded-full bg-border/60 animate-pulse" />
            <div className="h-10 w-3/4 rounded-lg bg-border/50 animate-pulse" />
            <div className="h-4 w-2/3 rounded-lg bg-border/50 animate-pulse" />
            <div className="flex gap-3 pt-2">
              <div className="h-11 w-28 rounded-full bg-border/60 animate-pulse" />
              <div className="h-11 w-28 rounded-full bg-border/50 animate-pulse" />
            </div>
          </div>
          <div className="rounded-2xl border border-border/40 bg-card/80 p-6 shadow-soft">
            <div className="h-4 w-32 rounded bg-border/60 animate-pulse mb-4" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 w-full rounded-lg bg-border/50 animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl border border-border/40 bg-card/70 p-5 shadow-soft">
            <div className="h-5 w-5 rounded-full bg-border/60 animate-pulse" />
            <div className="mt-3 h-5 w-2/3 rounded bg-border/60 animate-pulse" />
            <div className="mt-2 h-4 w-5/6 rounded bg-border/50 animate-pulse" />
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-border/40 bg-card/70 p-6 shadow-soft">
        <div className="mb-4 h-5 w-48 rounded bg-border/60 animate-pulse" />
        <div className="grid gap-3 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2 rounded-xl border border-border/30 bg-card/80 p-4">
              <div className="h-4 w-1/2 rounded bg-border/60 animate-pulse" />
              <div className="h-4 w-full rounded bg-border/50 animate-pulse" />
              <div className="h-4 w-5/6 rounded bg-border/50 animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
