"use client";

import { useEffect, useState } from "react";

import { cn } from "@shared/lib/cn";
import gridStyles from "./ProductGrid.module.css";
import {
  ProductGrid,
  PRODUCT_GRID_LAYOUTS,
  ProductSkeleton,
  type ProductGridItem,
} from "../ProductGrid";

type HydratedProductGridProps = {
  items: ProductGridItem[];
  layout?: "single" | "grid" | "masonry";
  showAddToCart?: boolean;
  addLabel?: string;
  wrapWithContainer?: boolean;
  containerClassName?: string;
  skeletonCount?: number;
};

export function HydratedProductGrid({
  items,
  layout = "grid",
  showAddToCart = true,
  addLabel,
  wrapWithContainer = true,
  containerClassName,
  skeletonCount,
}: HydratedProductGridProps) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) {
    const count = skeletonCount ?? Math.max(items.length, 4);
    const gridLayout = PRODUCT_GRID_LAYOUTS[layout] ?? PRODUCT_GRID_LAYOUTS.grid;
    const skeletonGrid = (
      <div className={cn(gridStyles.vcGridBase, gridLayout)} role="status" aria-live="polite">
        {Array.from({ length: count }).map((_, index) => (
          <div key={`skeleton-${index}`} className={gridStyles.vcGridItem} aria-hidden="true">
            <ProductSkeleton />
          </div>
        ))}
      </div>
    );

    if (!wrapWithContainer) {
      return skeletonGrid;
    }

    return <div className={cn(gridStyles.vcContainer, containerClassName)}>{skeletonGrid}</div>;
  }

  return (
    <ProductGrid
      items={items}
      layout={layout}
      showAddToCart={showAddToCart}
      addLabel={addLabel}
      wrapWithContainer={wrapWithContainer}
      containerClassName={containerClassName}
    />
  );
}
