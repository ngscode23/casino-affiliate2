import Link from "next/link";

import RevealOnScroll from "@/components/animation/RevealOnScroll";
import CatalogProductCarousel from "@/components/CatalogProductCarousel";
import type { ProductGridItem } from "@/components/ProductGrid";

import FilterSidebar, { type FilterSidebarProps } from "./FilterSidebar";
import type { CategorySummary } from "./data";
import { ProductListShell } from "./ProductListShell";
import type { ProductsPaginationProps } from "./ProductsPagination";
import { ProductsPagination } from "./ProductsPagination";
import type { ProductsGridProps } from "./ProductsGrid";
import { ProductsGrid } from "./ProductsGrid";
import type { ProductsToolbarProps } from "./ProductsToolbar";
import { ProductsToolbar } from "./ProductsToolbar";
import type { ThemeMode } from "./types.shared";

type ProductsLayoutProps = {
  theme: ThemeMode;
  catalogName: string;
  datasetLabelText: string;
  totalCount: number;
  activeFiltersCount: number;
  topCategoryLinks: CategorySummary[];
  carousel: {
    items: ProductGridItem[];
    heading: string;
    caption: string | null;
    eyebrow: string | null;
  };
  filterSidebarProps: FilterSidebarProps;
  toolbarProps: ProductsToolbarProps;
  gridProps: ProductsGridProps;
  paginationProps: ProductsPaginationProps;
  isFilterOpen: boolean;
  onCloseFilters: () => void;
  onToggleFilters: () => void;
};

export function ProductsLayout({
  theme,
  catalogName,
  datasetLabelText,
  totalCount,
  activeFiltersCount,
  topCategoryLinks,
  carousel,
  filterSidebarProps,
  toolbarProps,
  gridProps,
  paginationProps,
  isFilterOpen,
  onCloseFilters,
  onToggleFilters,
}: ProductsLayoutProps) {
  return (
    <ProductListShell
      theme={theme}
      isFilterOpen={isFilterOpen}
      onCloseFilters={onCloseFilters}
      renderFilterSidebar={({ variant }) => (
        <FilterSidebar {...filterSidebarProps} isOpen={filterSidebarProps.isOpen} />
      )}
      toolbar={<ProductsToolbar {...toolbarProps} onToggleFilters={onToggleFilters} />}
    >
      <RevealOnScroll
        className={
          theme === "dark"
            ? "w-full min-w-0 relative overflow-hidden rounded-[36px] border border-white/12 bg-white/5 px-6 py-10 text-center shadow-[0_30px_110px_-60px_rgba(0,0,0,0.55)] backdrop-blur-xl lg:px-10 lg:py-12 lg:text-left"
            : "w-full min-w-0 rounded-[36px] border border-gray-200 bg-gray-50/80 px-6 py-10 text-center shadow-[0_24px_70px_-50px_rgba(15,23,42,0.45)] lg:px-10 lg:py-12 lg:text-left"
        }
        startY={32}
        startOpacity={0}
        threshold={0.2}
      >
        {theme === "dark" ? (
          <div className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(circle_at_15%_20%,rgba(94,234,212,0.14),transparent_32%),radial-gradient(circle_at_85%_10%,rgba(129,140,248,0.2),transparent_30%)]" />
        ) : null}
        <div className={theme === "dark" ? "relative" : ""}>
          <p
            className={
              theme === "dark"
                ? "text-sm font-semibold uppercase tracking-wide text-emerald-200/80"
                : "text-sm font-semibold uppercase tracking-wide text-gray-500"
            }
          >
            Product catalog
          </p>
          <h2
            className={
              theme === "dark"
                ? "mt-3 text-3xl font-semibold text-white sm:text-4xl"
                : "mt-3 text-3xl font-semibold text-gray-900 sm:text-4xl"
            }
          >
            {catalogName}
          </h2>
          <p
            className={
              theme === "dark"
                ? "mt-4 text-base text-slate-200/80 lg:max-w-3xl"
                : "mt-4 text-base text-gray-600 lg:max-w-3xl"
            }
          >
            Browse featured drops, compare performance stats, and blend Neon Shop with archived datasets to find the perfect fit for your workflow.
          </p>
          <div
            className={
              theme === "dark"
                ? "mt-6 flex flex-wrap gap-3 text-sm text-slate-200/90"
                : "mt-6 flex flex-wrap gap-3 text-sm text-gray-700"
            }
          >
            <span
              className={
                theme === "dark"
                  ? "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2"
                  : "inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2"
              }
            >
              <span className={theme === "dark" ? "h-2 w-2 rounded-full bg-emerald-400" : "h-2 w-2 rounded-full bg-green-500"} />
              Live catalog Ł {totalCount} items
            </span>
            <span
              className={
                theme === "dark"
                  ? "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2"
                  : "inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2"
              }
            >
              <span className={theme === "dark" ? "h-2 w-2 rounded-full bg-sky-400" : "h-2 w-2 rounded-full bg-blue-500"} />
              {datasetLabelText}
            </span>
            {activeFiltersCount ? (
              <span
                className={
                  theme === "dark"
                    ? "inline-flex items-center gap-2 rounded-full border border-amber-300/60 bg-amber-400/10 px-4 py-2 text-amber-100"
                    : "inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-amber-700"
                }
              >
                <span className={theme === "dark" ? "h-2 w-2 rounded-full bg-amber-300" : "h-2 w-2 rounded-full bg-amber-500"} />
                {activeFiltersCount} filter{activeFiltersCount > 1 ? "s" : ""} applied
              </span>
            ) : null}
          </div>
        </div>
      </RevealOnScroll>

      {topCategoryLinks.length ? (
        <RevealOnScroll startY={18} startOpacity={0} duration={0.5} threshold={0.15}>
          <nav
            aria-label="Popular categories"
            className={
              theme === "dark"
                ? "flex flex-wrap items-center gap-2 text-sm text-slate-200/80"
                : "flex flex-wrap items-center gap-2 text-sm text-gray-600"
            }
          >
            <span className={theme === "dark" ? "font-semibold text-white" : "font-semibold text-gray-800"}>Popular categories:</span>
            {topCategoryLinks.map((category) => (
              <Link
                key={category.slug}
                href={`/products?category=${encodeURIComponent(category.slug)}`}
                className={
                  theme === "dark"
                    ? "inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/5 px-3 py-1.5 font-medium text-slate-100 transition hover:border-white/40 hover:bg-white/10"
                    : "inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 font-medium text-gray-700 transition hover:border-gray-900 hover:text-gray-900"
                }
              >
                {category.label}
                <span className={theme === "dark" ? "text-xs text-slate-400" : "text-xs text-gray-500"}>({category.count})</span>
              </Link>
            ))}
          </nav>
        </RevealOnScroll>
      ) : null}

      {carousel.items.length ? (
        <RevealOnScroll className="mt-6 w-full min-w-0" startY={18} startOpacity={0} duration={0.45} threshold={0.12}>
          <CatalogProductCarousel heading={carousel.heading} eyebrow={carousel.eyebrow} caption={carousel.caption} products={carousel.items} />
        </RevealOnScroll>
      ) : null}

      <ProductsGrid {...gridProps} />
      <ProductsPagination {...paginationProps} />
    </ProductListShell>
  );
}
