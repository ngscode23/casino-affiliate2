"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AlignJustify, ChevronDown, Grid3X3, LayoutGrid, RotateCcw, Search, Shirt, Smartphone, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { ProductGrid, ProductSkeleton } from "@/components/ProductGrid";
import type { Product } from "./types";
import { formatPrice } from "./utils";

type LayoutMode = "grid" | "single" | "masonry";

type FiltersState = {
  query: string;
  dataset: "all" | "shop" | "legacy";
  sort: "recent" | "popular" | "price-asc" | "price-desc" | "impressions";
  layout: LayoutMode;
};

const CHUNK_SIZE = 14;

const DATASET_DESCRIPTORS: Record<FiltersState["dataset"], { label: string; icon: LucideIcon }> = {
  all: { label: "All products", icon: Sparkles },
  shop: { label: "Neon shop", icon: Shirt },
  legacy: { label: "Archive", icon: Smartphone },
};

const LAYOUT_DESCRIPTORS: Record<LayoutMode, { label: string; icon: LucideIcon }> = {
  masonry: { label: "Gallery masonry", icon: LayoutGrid },
  grid: { label: "Balanced grid", icon: Grid3X3 },
  single: { label: "Single column", icon: AlignJustify },
};

const sortComparators: Record<FiltersState["sort"], (a: Product, b: Product) => number> = {
  recent: (a, b) => a.order - b.order,
  popular: (a, b) => (b.clicks || 0) - (a.clicks || 0) || (b.impressions || 0) - (a.impressions || 0),
  "price-asc": (a, b) => a.price - b.price,
  "price-desc": (a, b) => b.price - a.price,
  impressions: (a, b) => (b.impressions || 0) - (a.impressions || 0),
};

function datasetLabel(dataset: FiltersState["dataset"] | Product["dataset"]): string {
  if (dataset in DATASET_DESCRIPTORS) {
    return DATASET_DESCRIPTORS[dataset as FiltersState["dataset"]].label;
  }
  return "All products";
}

const GRID_LAYOUT_DEFAULT = "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 lg:gap-8";

const skeletonLayoutClass: Record<LayoutMode, string> = {
  single: "grid grid-cols-1 gap-6 sm:gap-8 lg:gap-10",
  masonry: GRID_LAYOUT_DEFAULT,
  grid: GRID_LAYOUT_DEFAULT,
};

const skeletonItemWrapperClass: Record<LayoutMode, string> = {
  single: "h-full",
  masonry: "h-full",
  grid: "h-full",
};

export default function ProductsClient({
  products,
  initialLayout = "grid",
  initialQuery = "",
}: {
  products: Product[];
  initialLayout?: LayoutMode;
  initialQuery?: string;
}) {
  const normalizedInitialQuery = (initialQuery ?? "").trim();
  const [filters, setFilters] = useState<FiltersState>({
    query: normalizedInitialQuery,
    dataset: "all",
    sort: "recent",
    layout: initialLayout,
  });
  const [visible, setVisible] = useState(CHUNK_SIZE);
  const [hydrated, setHydrated] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);
  const [isPending, startTransition] = useTransition();

  const numberFormatter = useMemo(() => new Intl.NumberFormat("en-US"), []);

  const datasetValues = useMemo<FiltersState["dataset"][]>(() => {
    const values = new Set<Product["dataset"]>();
    for (const product of products) values.add(product.dataset);
    return ["all", ...Array.from(values)] as FiltersState["dataset"][];
  }, [products]);

  const datasetOptions = useMemo(
    () =>
      datasetValues.map((value) => ({
        value,
        label: DATASET_DESCRIPTORS[value]?.label ?? datasetLabel(value),
      })),
    [datasetValues],
  );

  const layoutOptions = useMemo(
    () =>
      (Object.entries(LAYOUT_DESCRIPTORS) as [LayoutMode, { label: string; icon: LucideIcon }][]).map(([value, descriptor]) => ({
        value,
        label: descriptor.label,
      })),
    [],
  );

  const sortOptions = useMemo<{ value: FiltersState["sort"]; label: string }[]>(
    () => [
      { value: "recent", label: "Newest first" },
      { value: "popular", label: "Most popular" },
      { value: "price-asc", label: "Price: low to high" },
      { value: "price-desc", label: "Price: high to low" },
      { value: "impressions", label: "Most impressions" },
    ],
    [],
  );

  const filtered = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    let result = products;

    if (query) {
      result = result.filter((product) => (product.title + " " + (product.description || "")).toLowerCase().includes(query));
    }

    if (filters.dataset !== "all") {
      result = result.filter((product) => product.dataset === filters.dataset);
    }

    return [...result].sort(sortComparators[filters.sort]);
  }, [filters.dataset, filters.query, filters.sort, products]);

  const totals = useMemo(() => {
    let clicks = 0;
    let impressions = 0;
    for (const product of products) {
      clicks += product.clicks || 0;
      impressions += product.impressions || 0;
    }
    return { clicks, impressions };
  }, [products]);

  const displayed = useMemo(() => filtered.slice(0, visible), [filtered, visible]);
  const hasMore = useMemo(() => visible < filtered.length, [filtered.length, visible]);

  const summary = useMemo(() => {
    const visibleCount = displayed.length;
    const totalProducts = products.length;
    const parts = [visibleCount + " of " + totalProducts + " products"];
    if (totals.clicks > 0) {
      parts.push(numberFormatter.format(totals.clicks) + " clicks");
    }
    if (totals.impressions > 0) {
      parts.push(numberFormatter.format(totals.impressions) + " views");
    }
    return parts.join(" | ");
  }, [displayed.length, numberFormatter, products.length, totals.clicks, totals.impressions]);

  useEffect(() => {
    setFilters((prev) => {
      if (prev.query === normalizedInitialQuery) return prev;
      return { ...prev, query: normalizedInitialQuery };
    });
  }, [normalizedInitialQuery]);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible((prev) => {
              if (prev >= filtered.length) return prev;
              return Math.min(filtered.length, prev + CHUNK_SIZE);
            });
          }
        });
      },
      { rootMargin: "160px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filtered.length]);

  const updateFilters = useCallback(
    (updater: (prev: FiltersState) => FiltersState) => {
      startTransition(() => {
        setFilters((prev) => updater(prev));
      });
    },
    [startTransition],
  );

  const scrollToTop = useCallback(() => {
    if (typeof window === "undefined") return;
    const target = topRef.current;
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const updateUrlQuery = useCallback((value: string) => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const trimmed = value.trim();
    if (trimmed) {
      params.set("q", trimmed);
    } else {
      params.delete("q");
    }
    const hash = window.location.hash;
    const search = params.toString();
    const nextUrl = `${window.location.pathname}${search ? "?" + search : ""}${hash}`;
    window.history.replaceState(null, "", nextUrl);
  }, []);

  const handleQueryChange = useCallback(
    (value: string) => {
      updateFilters((prev) => ({ ...prev, query: value }));
      updateUrlQuery(value);
    },
    [updateFilters, updateUrlQuery],
  );

  const handleDatasetChange = useCallback(
    (value: FiltersState["dataset"]) => {
      scrollToTop();
      updateFilters((prev) => ({ ...prev, dataset: value }));
    },
    [scrollToTop, updateFilters],
  );

  const handleSortChange = useCallback(
    (value: FiltersState["sort"]) => {
      scrollToTop();
      updateFilters((prev) => ({ ...prev, sort: value }));
    },
    [scrollToTop, updateFilters],
  );

  const handleLayoutChange = useCallback(
    (value: LayoutMode) => {
      scrollToTop();
      updateFilters((prev) => ({ ...prev, layout: value }));
    },
    [scrollToTop, updateFilters],
  );

  const resetFilters = useCallback(() => {
    scrollToTop();
    updateUrlQuery("");
    updateFilters(() => ({ query: "", dataset: "all", sort: "recent", layout: initialLayout }));
  }, [initialLayout, scrollToTop, updateFilters, updateUrlQuery]);

  const gridItems = useMemo(
    () =>
      displayed.map((product) => {
        const priceValue = Number(product.price ?? 0);
        const badge = product.isNew ? "New" : product.isTop ? "Popular" : null;
        const originalPrice = product.isTop && priceValue > 0 ? formatPrice(priceValue * 1.12) : null;
        const meta =
          product.clicks || product.impressions
            ? numberFormatter.format(product.clicks || 0) + " clicks | " + numberFormatter.format(product.impressions || 0) + " views"
            : null;
        return {
          id: product.id,
          slug: product.slug,
          title: product.title,
          subtitle: product.description,
          image: product.mainImage,
          price: priceValue > 0 ? formatPrice(priceValue) : null,
          originalPrice,
          badge,
          meta,
        };
      }),
    [displayed, numberFormatter],
  );

  const showSkeleton = !hydrated || isPending;
  const skeletonCount = showSkeleton ? Math.max(displayed.length, 8) : 0;
  const layoutMode: LayoutMode = filters.layout;
  const datasetLabelText = filters.dataset === "all" ? "All products" : datasetLabel(filters.dataset);
  const visibleCount = displayed.length;
  const totalCount = products.length;

  return (
    <div
      ref={topRef}
      className="w-full pt-0 pb-12 sm:pb-14 lg:pb-16"
    >
      <div className="grid gap-12 lg:grid-cols-[minmax(260px,320px)_1fr]">
        <aside className="flex flex-col gap-8 rounded-3xl bg-surface/5 p-6 shadow-md ring-1 ring-white/10 backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-fg">Filters</h2>
              <p className="text-sm text-muted">Refine the catalog to match what you need.</p>
            </div>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-2 rounded-full bg-surface/20 px-4 py-2 text-sm font-medium text-muted transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              disabled={isPending}
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="products-query" className="text-sm font-medium text-muted">
                Search
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  id="products-query"
                  value={filters.query}
                  onChange={(event) => handleQueryChange(event.currentTarget.value)}
                  placeholder="Search products"
                  className="h-12 w-full rounded-2xl border border-transparent bg-surface/10 pl-11 pr-4 text-sm text-fg placeholder:text-muted focus-visible:border-primary/40 focus-visible:bg-surface/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-70"
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="grid gap-4">
              <div className="space-y-2">
                <label htmlFor="products-dataset" className="text-sm font-medium text-muted">
                  Dataset
                </label>
                <div className="relative">
                  <select
                    id="products-dataset"
                    value={filters.dataset}
                    onChange={(event) => handleDatasetChange(event.currentTarget.value as FiltersState["dataset"])}
                    disabled={isPending}
                    className="h-12 w-full appearance-none rounded-2xl border border-transparent bg-surface/10 px-4 pr-10 text-sm font-medium text-fg focus-visible:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-70"
                  >
                    {datasetOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="products-layout" className="text-sm font-medium text-muted">
                  Layout
                </label>
                <div className="relative">
                  <select
                    id="products-layout"
                    value={filters.layout}
                    onChange={(event) => handleLayoutChange(event.currentTarget.value as LayoutMode)}
                    disabled={isPending}
                    className="h-12 w-full appearance-none rounded-2xl border border-transparent bg-surface/10 px-4 pr-10 text-sm font-medium text-fg focus-visible:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-70"
                  >
                    {layoutOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="products-sort" className="text-sm font-medium text-muted">
                  Sort by
                </label>
                <div className="relative">
                  <select
                    id="products-sort"
                    value={filters.sort}
                    onChange={(event) => handleSortChange(event.currentTarget.value as FiltersState["sort"])}
                    disabled={isPending}
                    className="h-12 w-full appearance-none rounded-2xl border border-transparent bg-surface/10 px-4 pr-10 text-sm font-medium text-fg focus-visible:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-70"
                  >
                    {sortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                </div>
              </div>
            </div>
          </div>

          <p className="text-sm text-muted">{summary}</p>
        </aside>

        <div className="space-y-8">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted">{datasetLabelText}</p>
              <h2 className="text-3xl font-semibold text-fg sm:text-4xl">Products</h2>
            </div>
            <span className="inline-flex items-center rounded-full bg-surface/10 px-4 py-2 text-sm font-medium text-muted">
              {visibleCount} of {totalCount} products
            </span>
          </header>

          <div className="space-y-6">
            {showSkeleton ? (
              <div className="py-6">
                <div className={skeletonLayoutClass[layoutMode]}>
                  {Array.from({ length: skeletonCount }).map((_, index) => (
                    <div key={"skeleton-" + index} className={skeletonItemWrapperClass[layoutMode]}>
                      <ProductSkeleton />
                    </div>
                  ))}
                </div>
              </div>
            ) : displayed.length > 0 ? (
              <div className="py-6">
                <ProductGrid items={gridItems} layout={layoutMode} showAddToCart wrapWithContainer={false} />
              </div>
            ) : (
              <div className="py-6">
                <EmptyState onReset={resetFilters} />
              </div>
            )}

            <div ref={sentinelRef} aria-hidden />
            {hasMore && !showSkeleton ? (
              <p className="py-6 text-center text-sm text-muted" role="status">
                Loading more products...
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border/20 bg-surface/10 p-12 text-center shadow-md">
      <p className="text-sm text-muted">No products match the current filters.</p>
      <button
        type="button"
        onClick={onReset}
        className="inline-flex items-center gap-2 rounded-full bg-surface/20 px-4 py-2 text-sm font-medium text-muted transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      >
        Reset filters
      </button>
    </div>
  );
}

