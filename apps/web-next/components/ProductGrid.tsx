"use client";

import { cn } from "@shared/lib/cn";
import { useT } from "@shared/lib/useT";
import ProductCard, { type ProductGridItem } from "./ProductCard";
import gridStyles from "./ProductGrid/ProductGrid.module.css";
import RevealOnScroll from "./animation/RevealOnScroll";

export type { ProductGridItem } from "./ProductCard";

type LayoutMode = "single" | "grid" | "masonry";

type ProductGridProps = {
  items: ProductGridItem[];
  layout?: LayoutMode;
  showAddToCart?: boolean;
  addLabel?: string;
  containerClassName?: string;
  wrapWithContainer?: boolean;
  gridId?: string;
};

export const PRODUCT_GRID_CONTAINER = gridStyles.vcContainer;
const CONTAINER_BASE = PRODUCT_GRID_CONTAINER;

export const PRODUCT_GRID_LAYOUTS: Record<LayoutMode, string> = {
  single: gridStyles.vcLayoutSingle,
  grid: gridStyles.vcLayoutGrid,
  masonry: gridStyles.vcLayoutMasonry,
};

export function ProductGrid({
  items,
  layout = "grid",
  showAddToCart = true,
  addLabel,
  containerClassName,
  wrapWithContainer = true,
  gridId = "default",
}: ProductGridProps) {
  const t = useT();
  const translate = (key: string, fallback: string) => {
    const value = t(key);
    return value && value !== key ? value : fallback;
  };
  const resolvedAddLabel = addLabel ?? translate("products.addToCart", "Add to cart");
  const noImageLabel = translate("products.noImage", "No image");

  const gridLayout = PRODUCT_GRID_LAYOUTS[layout] ?? PRODUCT_GRID_LAYOUTS.grid;
  const grid = (
    <div
      className={cn(gridStyles.vcGridBase, gridLayout)}
      role="list"
      data-product-grid={gridId}
    >
        {items.map((product, index) => {
          const recMeta = product.recMeta;
          return (
            <div
              key={product.slug || product.id}
              className={gridStyles.vcGridItem}
              role="listitem"
            data-product-id={product.id}
            data-product-slug={product.slug}
            data-product-rank={index + 1}
            data-rec-treatment={recMeta?.treatment ?? undefined}
            data-rec-rank={recMeta?.rank ?? undefined}
            data-rec-reason={recMeta?.reason ?? undefined}
            data-rec-source={recMeta?.source ?? undefined}
            data-rec-placement={recMeta?.placement ?? undefined}
          >
            <RevealOnScroll
              className={gridStyles.vcReveal}
              delay={Math.min(index * 0.04, 0.4)}
              threshold={0.15}
            >
              <ProductCard
                product={product}
                index={index}
                href={`/products/${product.slug}`}
                showAddToCart={showAddToCart}
                addLabel={resolvedAddLabel}
                noImageLabel={noImageLabel}
                translate={translate}
              />
            </RevealOnScroll>
          </div>
        );
      })}
    </div>
  );

  if (!wrapWithContainer) {
    return grid;
  }

  return <div className={cn(CONTAINER_BASE, containerClassName)}>{grid}</div>;
}

export function ProductSkeleton() {
  return (
    <article className={gridStyles.vcSkeletonCard} aria-hidden="true">
      <div className={gridStyles.vcSkeletonSurface}>
        <div className={gridStyles.vcSkeletonMedia} />
        <div className={gridStyles.vcSkeletonLines}>
          <div className={gridStyles.vcSkeletonLine} />
          <div className={cn(gridStyles.vcSkeletonLine, gridStyles.vcSkeletonLineShort)} />
        </div>
        <div className={gridStyles.vcSkeletonFooter}>
          <div className={gridStyles.vcSkeletonPrice} />
          <div className={gridStyles.vcSkeletonButton} />
        </div>
      </div>
    </article>
  );
}
