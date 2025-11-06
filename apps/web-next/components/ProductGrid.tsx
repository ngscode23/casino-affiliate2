"use client";

import { type CSSProperties } from "react";

import { cn } from "@shared/lib/cn";
import { useT } from "@shared/lib/useT";
import ProductCard, { type ProductGridItem } from "./ProductCard";

export type { ProductGridItem } from "./ProductCard";

type LayoutMode = "single" | "grid" | "masonry";

type ProductGridProps = {
  items: ProductGridItem[];
  layout?: LayoutMode;
  showAddToCart?: boolean;
  addLabel?: string;
  containerClassName?: string;
  wrapWithContainer?: boolean;
};

export const PRODUCT_GRID_CONTAINER = "max-w-screen-xl mx-auto px-6 sm:px-8 lg:px-10";
const CONTAINER_BASE = PRODUCT_GRID_CONTAINER;

const gridStyle: CSSProperties & { contentVisibility?: string; containIntrinsicSize?: string } = {
  contentVisibility: "auto",
  containIntrinsicSize: "1200px",
};

export const PRODUCT_GRID_LAYOUTS: Record<LayoutMode, string> = {
  single: "grid grid-cols-1 gap-6 sm:gap-8 lg:gap-10",
  grid: "grid grid-cols-1 min-[360px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 xl:gap-8",
  masonry: "grid grid-cols-1 min-[340px]:grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5 xl:gap-7",
};

export function ProductGrid({
  items,
  layout = "grid",
  showAddToCart = true,
  addLabel,
  containerClassName,
  wrapWithContainer = true,
}: ProductGridProps) {
  const t = useT();
  const translate = (key: string, fallback: string) => {
    const value = t(key);
    return value && value !== key ? value : fallback;
  };
  const resolvedAddLabel = addLabel ?? translate("products.addToCart", "Add to cart");
  const noImageLabel = translate("products.noImage", "No image");

  const gridClasses = PRODUCT_GRID_LAYOUTS[layout] ?? PRODUCT_GRID_LAYOUTS.grid;
  const grid = (
    <div
      className={gridClasses}
      role="list"
      style={gridStyle}
    >
      {items.map((product, index) => (
        <div key={product.slug || product.id} className="h-full" role="listitem">
          <ProductCard
            product={product}
            index={index}
            href={`/products/${product.slug}`}
            showAddToCart={showAddToCart}
            addLabel={resolvedAddLabel}
            noImageLabel={noImageLabel}
            translate={translate}
          />
        </div>
      ))}
    </div>
  );

  if (!wrapWithContainer) {
    return grid;
  }

  return (
    <div className={cn(CONTAINER_BASE, containerClassName)}>
      {grid}
    </div>
  );
}

export function ProductSkeleton() {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-border/40 bg-card p-4 shadow-sm">
      <div className="aspect-[4/5] w-full rounded-lg bg-border/20" />
      <div className="mt-4 space-y-3">
        <div className="h-4 w-3/4 rounded-full bg-border/30" />
        <div className="h-3 w-1/2 rounded-full bg-border/20" />
      </div>
      <div className="mt-auto space-y-3 pt-4">
        <div className="h-4 w-20 rounded-full bg-border/25" />
        <div className="h-11 rounded-full bg-border/20" />
      </div>
    </article>
  );
}






