"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AlignJustify, ChevronDown, Grid3X3, LayoutGrid, Search, Shirt, Smartphone, Sparkles } from "lucide-react";
import dynamic from "next/dynamic";
import type { LucideIcon } from "lucide-react";

import { ProductGrid, ProductSkeleton, PRODUCT_GRID_LAYOUTS } from "@/components/ProductGrid";
import type { Product } from "./types";
import type { CategorySummary } from "./data";
import { formatPrice } from "./utils";
const DatasetPicker = dynamic(() => import("./filters/DatasetPicker"), { ssr: false });
const LayoutPicker = dynamic(() => import("./filters/LayoutPicker"), { ssr: false });

type LayoutMode = "grid" | "single" | "masonry";

type FiltersState = {
  query: string;
  dataset: "all" | "shop" | "legacy";
  sort: "recent" | "popular" | "price-asc" | "price-desc" | "impressions";
  layout: LayoutMode;
  category: string;
};

const CHUNK_SIZE = 8; // fewer above-the-fold items for faster LCP on mobile

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

export default function ProductsClient({
  products,
  categories,
  catalogName,
  initialLayout = "grid",
  initialQuery = "",
  initialCategory = "all",
}: {
  products: Product[];
  categories: CategorySummary[];
  catalogName: string;
  initialLayout?: LayoutMode;
  initialQuery?: string;
  initialCategory?: string;
}) {
  const normalizedInitialQuery = (initialQuery ?? "").trim();
  const normalizedInitialCategory = useMemo(() => {
    if (!initialCategory) return "all";
    return categories.some((category) => category.slug === initialCategory) ? initialCategory : "all";
  }, [categories, initialCategory]);

  const availabilityLabelMap = useMemo(
    () =>
      new Map<Product["availability"], string>([
        ["InStock", "In stock"],
        ["OutOfStock", "Out of stock"],
        ["PreOrder", "Pre-order"],
      ]),
    [],
  );

  const [filters, setFilters] = useState<FiltersState>({
    query: normalizedInitialQuery,
    dataset: "all",
    sort: "recent",
    layout: initialLayout,
    category: normalizedInitialCategory,
  });
  const [queryInput, setQueryInput] = useState(normalizedInitialQuery);
  const [visible, setVisible] = useState(CHUNK_SIZE);
  // Render real grid on SSR; skeleton only during transitions
  const [hydrated] = useState(true);
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
        icon: DATASET_DESCRIPTORS[value]?.icon ?? Sparkles,
      })),
    [datasetValues],
  );

  const categoryOptions = useMemo(() => {
    const options = categories.map((category) => ({
      value: category.slug,
      label: `${category.label} (${category.count})`,
      display: category.label,
    }));
    return [{ value: "all", label: "All categories", display: "All categories" }, ...options];
  }, [categories]);

  const categoryLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const option of categoryOptions) {
      map.set(option.value, option.display);
    }
    return map;
  }, [categoryOptions]);

  const topCategoryLinks = useMemo(() => categories.slice(0, 3), [categories]);

  const layoutOptions = useMemo(
    () =>
      (Object.entries(LAYOUT_DESCRIPTORS) as [LayoutMode, { label: string; icon: LucideIcon }][]).map(([value, descriptor]) => ({
        value,
        label: descriptor.label,
        icon: descriptor.icon,
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

    if (filters.category !== "all") {
      result = result.filter((product) => product.categorySlug === filters.category);
    }

    return [...result].sort(sortComparators[filters.sort]);
  }, [filters.category, filters.dataset, filters.query, filters.sort, products]);

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
    if (filters.category !== "all") {
      parts.push(categoryLabelMap.get(filters.category) ?? "Selected category");
    }
    if (totals.clicks > 0) {
      parts.push(numberFormatter.format(totals.clicks) + " clicks");
    }
    if (totals.impressions > 0) {
      parts.push(numberFormatter.format(totals.impressions) + " views");
    }
    return parts.join(" | ");
  }, [displayed.length, numberFormatter, products.length, totals.clicks, totals.impressions]);

  useEffect(() => {
    setQueryInput(normalizedInitialQuery);
    setFilters((prev) => {
      if (prev.query === normalizedInitialQuery) return prev;
      return { ...prev, query: normalizedInitialQuery };
    });
  }, [normalizedInitialQuery]);

  useEffect(() => {
    setFilters((prev) => {
      if (prev.category === normalizedInitialCategory) return prev;
      return { ...prev, category: normalizedInitialCategory };
    });
  }, [normalizedInitialCategory]);

  // no-op; hydrated starts as true to avoid SSR skeleton

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
    if (filters.category !== "all") {
      params.set("category", filters.category);
    } else {
      params.delete("category");
    }
    const hash = window.location.hash;
    const search = params.toString();
    const nextUrl = `${window.location.pathname}${search ? "?" + search : ""}${hash}`;
    window.history.replaceState(null, "", nextUrl);
  }, [filters.category]);

  useEffect(() => {
    if (queryInput === filters.query) return;
    const timeout = window.setTimeout(() => {
      updateFilters((prev) => {
        if (prev.query === queryInput) return prev;
        return { ...prev, query: queryInput };
      });
      updateUrlQuery(queryInput);
    }, 180);
    return () => window.clearTimeout(timeout);
  }, [filters.query, queryInput, updateFilters, updateUrlQuery]);

  const handleQueryChange = useCallback((value: string) => {
    setQueryInput(value);
  }, []);

  const handleDatasetChange = useCallback(
    (value: FiltersState["dataset"]) => {
      scrollToTop();
      updateFilters((prev) => ({ ...prev, dataset: value }));
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if (value && value !== "all") {
          params.set("dataset", value);
        } else {
          params.delete("dataset");
        }
        if (filters.category !== "all") {
          params.set("category", filters.category);
        }
        if (filters.query) {
          params.set("q", filters.query);
        }
        const hash = window.location.hash;
        const nextUrl = `${window.location.pathname}${params.toString() ? "?" + params.toString() : ""}${hash}`;
        window.history.replaceState(null, "", nextUrl);
      }
    },
    [filters.category, filters.query, scrollToTop, updateFilters],
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

  const handleCategoryChange = useCallback(
    (value: string) => {
      scrollToTop();
      updateFilters((prev) => ({ ...prev, category: value }));
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if (filters.query) {
          params.set("q", filters.query);
        }
        if (value && value !== "all") {
          params.set("category", value);
        } else {
          params.delete("category");
        }
        if (filters.dataset !== "all") {
          params.set("dataset", filters.dataset);
        } else {
          params.delete("dataset");
        }
        const hash = window.location.hash;
        const nextUrl = `${window.location.pathname}${params.toString() ? "?" + params.toString() : ""}${hash}`;
        window.history.replaceState(null, "", nextUrl);
      }
    },
    [filters.dataset, filters.query, scrollToTop, updateFilters],
  );

  const resetFilters = useCallback(() => {
    scrollToTop();
    setQueryInput("");
    updateFilters(() => ({ query: "", dataset: "all", sort: "recent", layout: initialLayout, category: "all" }));
  }, [initialLayout, scrollToTop, updateFilters]);

  const gridItems = useMemo(
    () =>
      displayed.map((product) => {
        const priceValue = Number(product.price ?? 0);
        const badge = product.isNew ? "New" : product.isTop ? "Popular" : null;
        const originalPrice = product.isTop && priceValue > 0 ? formatPrice(priceValue * 1.12, product.currency) : null;
        const availabilityLabel = availabilityLabelMap.get(product.availability) ?? null;
        const statsLabel =
          product.clicks || product.impressions
            ? numberFormatter.format(product.clicks || 0) + " clicks • " + numberFormatter.format(product.impressions || 0) + " views"
            : null;
        const categoryLabel = product.categorySlug ? humanize(product.categorySlug) : null;
        const metaParts = [availabilityLabel, categoryLabel, statsLabel].filter(Boolean);
        const meta = metaParts.length ? metaParts.join(" • ") : null;
        return {
          id: product.id,
          slug: product.slug,
          title: product.title,
          subtitle: product.description,
          image: product.mainImage,
          price: priceValue > 0 ? formatPrice(priceValue, product.currency) : null,
          originalPrice,
          badge,
          meta,
        };
      }),
    [availabilityLabelMap, displayed, numberFormatter],
  );

  const showSkeleton = isPending;
  const skeletonCount = showSkeleton ? Math.max(displayed.length, 8) : 0;
  const layoutMode: LayoutMode = filters.layout;
  const datasetLabelText = filters.dataset === "all" ? "All products" : datasetLabel(filters.dataset);
  const visibleCount = displayed.length;
  const totalCount = products.length;
  const activeCategoryLabel = categoryLabelMap.get(filters.category) ?? "All categories";

  return (
    <div
      ref={topRef}
      className="w-full pt-0 pb-12 sm:pb-14 lg:pb-16"
    >
      <div className="grid items-start gap-12 lg:grid-cols-[minmax(260px,320px)_1fr]">
        <aside className="flex flex-col gap-8 rounded-3xl bg-surface/5 p-6 shadow-md ring-1 ring-white/10 backdrop-blur self-start">
          <header className="space-y-1 text-fg">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Neon Shop</span>
            <h2 className="text-2xl font-semibold">Filters</h2>
            <p className="text-sm text-muted">
              Refine the catalog to match what you need.
            </p>
          </header>

          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-2">
              <label htmlFor="products-query" className="text-xs font-semibold uppercase tracking-wide text-muted">Search</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  id="products-query"
                  value={queryInput}
                  onChange={(event) => handleQueryChange(event.currentTarget.value)}
                  placeholder="Search products"
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 pl-12 pr-4 text-sm text-fg placeholder:text-muted shadow-sm transition focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:opacity-60"
                  disabled={isPending}
                />
              </div>
            </section>

            <DatasetPicker
              value={filters.dataset}
              options={datasetOptions}
              onChange={(v) => handleDatasetChange(v as FiltersState["dataset"])}
              isPending={isPending}
            />

            <LayoutPicker
              value={filters.layout}
              options={layoutOptions}
              onChange={(v) => handleLayoutChange(v as LayoutMode)}
              isPending={isPending}
            />

            {categoryOptions.length > 1 ? (
              <section className="flex flex-col gap-2">
                <label htmlFor="products-category" className="text-sm font-semibold text-fg">Category</label>
                <div className="relative">
                  <select
                    id="products-category"
                    value={filters.category}
                    onChange={(event) => handleCategoryChange(event.currentTarget.value)}
                    disabled={isPending}
                    className="h-12 w-full appearance-none rounded-2xl border border-white/10 bg-white/5 px-4 pr-10 text-sm font-medium text-fg shadow-sm transition focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:opacity-60"
                  >
                    {categoryOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                </div>
              </section>
            ) : null}

            <section className="flex flex-col gap-2">
              <label htmlFor="products-sort" className="text-sm font-semibold text-fg">Sort by</label>
              <div className="relative">
                <select
                  id="products-sort"
                  value={filters.sort}
                  onChange={(event) => handleSortChange(event.currentTarget.value as FiltersState["sort"])}
                  disabled={isPending}
                  className="h-12 w-full appearance-none rounded-2xl border border-white/10 bg-white/5 px-4 pr-10 text-sm font-medium text-fg shadow-sm transition focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:opacity-60"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-inner">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-primary/70">
                <span>{activeCategoryLabel}</span>
                <span>
                  {visibleCount} / {totalCount}
                </span>
              </div>
              <p className="mt-3 text-sm text-muted">{summary}</p>
            </section>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={resetFilters}
                disabled={isPending}
                className="flex-1 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25 disabled:opacity-60"
              >
                Reset filters
              </button>
              <button
                type="button"
                onClick={scrollToTop}
                className="flex-1 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-fg/90 transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
              >
                Back to top
              </button>
            </div>
          </div>
        </aside>

        <div className="space-y-8">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted">{datasetLabelText}</p>
              <h2 className="text-3xl font-semibold text-fg sm:text-4xl">{catalogName}</h2>
            </div>
            <span className="inline-flex items-center rounded-full bg-surface/10 px-4 py-2 text-sm font-medium text-muted">
              {visibleCount} of {totalCount} products
            </span>
          </header>

          {topCategoryLinks.length ? (
            <nav aria-label="Popular categories">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
                <span className="font-semibold text-fg/80">Popular categories:</span>
                {topCategoryLinks.map((category) => (
                  <Link
                    key={category.slug}
                    href={`/products?category=${encodeURIComponent(category.slug)}`}
                    className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-medium text-muted transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  >
                    {category.label}
                    <span className="text-xs text-muted">({category.count})</span>
                  </Link>
                ))}
              </div>
            </nav>
          ) : null}

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

function humanize(input: string): string {
  return input
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

