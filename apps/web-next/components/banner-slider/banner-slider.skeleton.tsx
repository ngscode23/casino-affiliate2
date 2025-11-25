"use client";

// Lightweight skeleton for banner slider while data/JS loads.

export function BannerSliderSkeleton() {
  return (
    <section className="mx-auto w-full max-w-screen-xl space-y-6 px-4 sm:px-6 lg:px-8">
      <div className="space-y-2">
        <div className="h-3 w-28 rounded-full bg-neutral-300/50 dark:bg-white/10 animate-pulse" />
        <div className="h-8 w-2/3 rounded-lg bg-neutral-300/60 dark:bg-white/10 animate-pulse" />
        <div className="h-4 w-1/2 rounded-lg bg-neutral-300/50 dark:bg-white/10 animate-pulse" />
      </div>
      <div className="relative">
        <div className="aspect-[16/7] w-full overflow-hidden rounded-[2.5rem] border border-border/40 bg-gradient-to-r from-neutral-200 via-neutral-300 to-neutral-200 dark:from-white/10 dark:via-white/5 dark:to-white/10 animate-pulse" />
      </div>
    </section>
  );
}
