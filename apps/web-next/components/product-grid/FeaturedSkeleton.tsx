"use client";

import { cn } from "@shared/lib/cn";
import { ProductSkeleton, PRODUCT_GRID_LAYOUTS } from "@/components/ProductGrid";
import gridStyles from "@/components/ProductGrid/ProductGrid.module.css";

export function FeaturedSkeleton() {
  const layoutClass = PRODUCT_GRID_LAYOUTS.grid;
  return (
    <section className="mx-auto w-full max-w-screen-xl space-y-8 px-6 py-12 sm:px-8 lg:px-10">
      <div className="space-y-3">
        <div className="h-3 w-28 rounded-full bg-border/60 animate-pulse" />
        <div className="h-8 w-2/3 rounded-lg bg-border/50 animate-pulse" />
        <div className="h-4 w-1/2 rounded-lg bg-border/50 animate-pulse" />
      </div>

      <div className="mx-auto w-full max-w-[1260px] rounded-[30px] border border-border/30 bg-card/80 px-6 py-8 shadow-[0_24px_80px_-52px_rgba(16,24,40,0.45)] sm:px-8 sm:py-10">
        <div className={cn(gridStyles.vcGridBase, layoutClass)} aria-hidden="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`featured-skeleton-${index}`} className={gridStyles.vcGridItem}>
              <ProductSkeleton />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
