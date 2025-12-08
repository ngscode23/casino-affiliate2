import type { CSSProperties } from "react";

import RevealOnScroll from "@/components/animation/RevealOnScroll";
import { ProductGrid, ProductSkeleton, PRODUCT_GRID_LAYOUTS } from "@/components/ProductGrid";
import type { ProductGridItem } from "@/components/ProductGrid";

import type { LayoutMode, ThemeMode } from "./types.shared";

export type ProductsGridProps = {
  theme: ThemeMode;
  layoutMode: LayoutMode;
  gridItems: ProductGridItem[];
  showSkeleton: boolean;
  skeletonCount: number;
  hasError: boolean;
  pageError?: string | null;
  hasItems: boolean;
  onHardReset: () => void;
  onFocusSearch: () => void;
  gridId?: string;
};

type ProductGridStyle = CSSProperties & {
  "--vc-grid-max-width"?: string;
  "--vc-grid-max-width-desktop"?: string;
  "--vc-card-min-width"?: string;
  "--vc-card-width"?: string;
  "--vc-grid-row-gap"?: string;
  "--vc-grid-column-gap"?: string;
};

const GRID_STYLE: ProductGridStyle = {
  "--vc-grid-max-width": "1480px",
  "--vc-grid-max-width-desktop": "1480px",
  "--vc-card-min-width": "260px",
  "--vc-card-width": "360px",
  "--vc-grid-row-gap": "36px",
  "--vc-grid-column-gap": "24px",
};

const GRID_SURFACE_CLASS_LIGHT =
  "w-full min-w-0 rounded-[32px] border border-gray-200/80 bg-white/95 px-4 py-6 shadow-[0_32px_80px_-48px_rgba(15,23,42,0.35)] sm:px-8 sm:py-10";
const GRID_SURFACE_CLASS_DARK =
  "w-full min-w-0 rounded-[32px] border border-white/12 bg-white/5 px-4 py-6 shadow-[0_40px_120px_-60px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:px-8 sm:py-10";

const skeletonLayoutClass: Record<LayoutMode, string> = {
  single: PRODUCT_GRID_LAYOUTS.single,
  masonry: PRODUCT_GRID_LAYOUTS.masonry,
  grid: PRODUCT_GRID_LAYOUTS.grid,
};

const skeletonItemWrapperClass: Record<LayoutMode, string> = {
  single: "h-full",
  masonry: "h-full",
  grid: "h-full",
};

export function ProductsGrid({
  theme,
  layoutMode,
  gridItems,
  showSkeleton,
  skeletonCount,
  hasError,
  pageError,
  hasItems,
  onHardReset,
  onFocusSearch,
  gridId = "catalog",
}: ProductsGridProps) {
  const gridSurfaceClass = theme === "dark" ? GRID_SURFACE_CLASS_DARK : GRID_SURFACE_CLASS_LIGHT;

  return (
    <RevealOnScroll
      className={gridSurfaceClass}
      style={GRID_STYLE}
      startY={24}
      startOpacity={0}
      threshold={0.12}
      aria-live="polite"
      role="region"
    >
      {showSkeleton ? (
        <div className={skeletonLayoutClass[layoutMode]} role="status" aria-busy="true" aria-label="Loading products">
          {Array.from({ length: skeletonCount }).map((_, index) => (
            <div key={`skeleton-${index}`} className={skeletonItemWrapperClass[layoutMode]}>
              <ProductSkeleton />
            </div>
          ))}
        </div>
      ) : hasError ? (
        <EmptyState
          theme={theme}
          isError
          message={pageError ?? "Не удалось загрузить список товаров. Попробуйте еще раз."}
          onReset={onHardReset}
          onSearch={onFocusSearch}
        />
      ) : hasItems ? (
        <ProductGrid items={gridItems} layout={layoutMode} showAddToCart wrapWithContainer={false} gridId={gridId} />
      ) : (
        <EmptyState
          theme={theme}
          message="Товары по заданным фильтрам не найдены."
          onReset={onHardReset}
          onSearch={onFocusSearch}
        />
      )}
    </RevealOnScroll>
  );
}

type EmptyStateProps = {
  theme: ThemeMode;
  isError?: boolean;
  message?: string;
  onReset?: () => void;
  onSearch?: () => void;
};

function EmptyState({ theme, isError = false, message, onReset, onSearch }: EmptyStateProps) {
  const wrapperClass =
    theme === "dark"
      ? "flex flex-col items-center justify-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-12 text-center shadow-md"
      : "flex flex-col items-center justify-center gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-12 text-center shadow-md";
  const textClass = theme === "dark" ? "text-sm text-slate-200/80" : "text-sm text-gray-600";
  return (
    <div className={wrapperClass} role="status" aria-live="polite">
      <p className={textClass}>
        {message ??
          (isError
            ? "Произошла ошибка при загрузке каталога. Попробуйте сбросить фильтры или перезагрузить страницу."
            : "Мы не нашли подходящих товаров. Измените фильтры или повторите поиск.")}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          className={
            theme === "dark"
              ? "rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-emerald-400/70 focus:ring-offset-2 focus:ring-offset-[#0b0f19]"
              : "rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white"
          }
          onClick={() => onReset?.()}
        >
          Сбросить фильтры
        </button>
        <button
          type="button"
          className={
            theme === "dark"
              ? "rounded-full border border-white/20 bg-transparent px-4 py-2 text-sm font-semibold text-slate-100 hover:border-white/40 focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:ring-offset-2 focus:ring-offset-[#0b0f19]"
              : "rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:border-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:ring-offset-2 focus:ring-offset-white"
          }
          onClick={() => onSearch?.()}
        >
          Перейти к поиску
        </button>
      </div>
    </div>
  );
}


