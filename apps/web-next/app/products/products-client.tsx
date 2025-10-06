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
  all: { label: "Gallery", icon: Sparkles },
  shop: { label: "Clothing", icon: Shirt },
  legacy: { label: "Gadgets", icon: Smartphone },
};

const LAYOUT_DESCRIPTORS: Record<LayoutMode, { label: string; icon: LucideIcon }> = {
  masonry: { label: "Masonry", icon: LayoutGrid },
  grid: { label: "Grid", icon: Grid3X3 },
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
  single: "grid grid-cols-1 gap-6",
  masonry:
    "grid [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))] grid-flow-row-dense auto-rows-[minmax(320px,auto)] gap-4 sm:gap-5 md:gap-6 xl:gap-8 3xl:gap-10",
  grid:
    "grid [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))] gap-4 sm:gap-5 md:gap-6 xl:gap-8 3xl:gap-10",
};

const skeletonItemWrapperClass: Record<LayoutMode, string> = {
  single: "h-full",
  masonry: "h-full",
  grid: "h-full",
};

export default function ProductsClient({
  products,
  initialLayout = "masonry",
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

  const datasetChips = useMemo(
    () =>
      datasetValues.map((value) => {
        const descriptor = DATASET_DESCRIPTORS[value] ?? {
          label: datasetLabel(value),
          icon: Sparkles,
        };
        return {
          value,
          label: descriptor.label,
          Icon: descriptor.icon,
        };
      }),
    [datasetValues],
  );

  const layoutChips = useMemo(
    () =>
      (Object.entries(LAYOUT_DESCRIPTORS) as [LayoutMode, { label: string; icon: LucideIcon }][]).map(([value, descriptor]) => ({
        value,
        label: descriptor.label,
        Icon: descriptor.icon,
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
    parts.push(numberFormatter.format(totals.clicks || 0) + " clicks");
    parts.push(numberFormatter.format(totals.impressions || 0) + " impressions");
    return parts.join(" · ");
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
    const next = params.toString();
    const nextUrl = `${window.location.pathname}${next ? `?${next}` : ""}${hash ?? ""}`;
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

  const activeFilterPills = useMemo(() => {
    const pills: { key: string; label: string; Icon?: LucideIcon }[] = [];
    if (filters.dataset !== "all") {
      const descriptor = DATASET_DESCRIPTORS[filters.dataset] ?? { label: datasetLabel(filters.dataset), icon: Sparkles };
      pills.push({ key: "dataset", label: descriptor.label, Icon: descriptor.icon });
    }
    const trimmedQuery = filters.query.trim();
    if (trimmedQuery) {
      pills.push({ key: "query", label: trimmedQuery });
    }
    return pills;
  }, [filters.dataset, filters.query]);

  const gridItems = useMemo(
    () =>
      displayed.map((product) => {
        const metaParts: string[] = [];
        if (product.isNew) metaParts.push("New");
        if (product.isTop) metaParts.push("Top");
        metaParts.push(datasetLabel(product.dataset));
        return {
          id: product.id,
          slug: product.slug,
          title: product.title,
          subtitle: product.description,
          image: product.mainImage,
          price: formatPrice(product.price ?? 0),
          meta: metaParts.join(" · "),
        };
      }),
    [displayed],
  );

  const showSkeleton = !hydrated || isPending;
  const skeletonCount = showSkeleton ? Math.max(displayed.length, 8) : 0;
  const layoutMode: LayoutMode = filters.layout;
  const activeDatasetLabel = datasetLabel(filters.dataset);

  return (
    <div ref={topRef} className="pb-16 space-y-8">
      <div className="rounded-[36px] border border-border/40 bg-card/85 px-6 py-8 shadow-[0_24px_80px_-48px_rgba(153,126,92,0.32)] sm:px-8 lg:px-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-muted">Explore</p>
            <h1 className="text-3xl font-semibold text-fg sm:text-4xl">{activeDatasetLabel}</h1>
            <p className="max-w-xl text-sm text-muted">
              Curated catalog of affiliate-ready offers, updated continuously with live pricing, imagery, and performance stats.
            </p>
          </div>
          <label className="flex items-center gap-3 rounded-full border border-border/40 bg-card px-4 py-2 text-sm text-muted shadow-[0_18px_46px_-32px_rgba(153,126,92,0.35)]">
            <span className="text-xs font-semibold uppercase tracking-[0.18em]">Sort by</span>
            <div className="relative flex items-center">
              <select
                value={filters.sort}
                onChange={(event) => handleSortChange(event.currentTarget.value as FiltersState["sort"])}
                className="appearance-none bg-transparent pr-6 text-sm font-semibold text-fg outline-none disabled:opacity-40"
                disabled={isPending}
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            </div>
          </label>
        </div>

        <div className="mt-6 flex flex-wrap gap-2.5">
          {datasetChips.map(({ value, label, Icon }) => {
            const isActive = filters.dataset === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => handleDatasetChange(value)}
                className={[
                  "group inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                  isActive
                    ? "border-primary/60 bg-primary text-primaryfg shadow-[0_18px_44px_-30px_rgba(189,141,90,0.45)]"
                    : "border-border/35 bg-card/75 text-muted hover:border-primary/35 hover:text-fg",
                ].join(" ")}
                disabled={isPending}
              >
                <Icon className="h-4 w-4 transition group-hover:scale-105" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-[30px] border border-border/30 bg-card/80 px-5 py-6 shadow-[0_20px_68px_-48px_rgba(153,126,92,0.28)] sm:px-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <label className="flex flex-1 items-center gap-3 rounded-xl border border-border/40 bg-card px-4 py-3 text-sm text-muted transition focus-within:border-primary/50 focus-within:bg-card/90 focus-within:text-fg focus-within:ring-2 focus-within:ring-primary/25">
            <Search className="h-4 w-4 shrink-0 text-muted" />
            <input
              value={filters.query}
              onChange={(event) => handleQueryChange(event.currentTarget.value)}
              placeholder="Search products..."
              className="w-full bg-transparent text-sm text-fg placeholder:text-muted focus:outline-none"
              disabled={isPending}
            />
          </label>
          <div className="flex flex-wrap items-center gap-2.5">
            {layoutChips.map(({ value, label, Icon }) => {
              const isActive = filters.layout === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleLayoutChange(value)}
                  className={[
                    "group inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                    isActive
                      ? "border-primary/60 bg-primary text-primaryfg shadow-[0_16px_40px_-26px_rgba(189,141,90,0.42)]"
                      : "border-border/35 bg-card/75 text-muted hover:border-primary/35 hover:text-fg",
                  ].join(" ")}
                  disabled={isPending}
                >
                  <Icon className="h-4 w-4 transition group-hover:scale-110" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {activeFilterPills.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            {activeFilterPills.map((pill) => {
              const Icon = pill.Icon;
              return (
                <span
                  key={pill.key}
                  className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primaryfg shadow-[0_16px_40px_-28px_rgba(189,141,90,0.42)]"
                >
                  {Icon ? <Icon className="h-4 w-4" /> : null}
                  <span>{pill.label}</span>
                </span>
              );
            })}
          </div>
        ) : null}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted">{summary}</p>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-border/40 bg-card/80 px-5 py-2.5 text-sm font-medium text-muted transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:opacity-40"
            disabled={isPending}
          >
            <RotateCcw className="h-4 w-4" />
            Reset filters
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1280px]">
        {showSkeleton ? (
          <div className={skeletonLayoutClass[layoutMode]}>
            {Array.from({ length: skeletonCount }).map((_, index) => (
              <div key={"skeleton-" + index} className={skeletonItemWrapperClass[layoutMode]}>
                <ProductSkeleton />
              </div>
            ))}
          </div>
        ) : displayed.length > 0 ? (
          <ProductGrid items={gridItems} layout={layoutMode} />
        ) : (
          <EmptyState onReset={resetFilters} />
        )}

        <div ref={sentinelRef} aria-hidden />
        {hasMore && !showSkeleton ? (
          <p className="py-6 text-center text-xs text-muted" role="status">
            Loading more products…
          </p>
        ) : null}
      </div>
    </div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="surface-elevated flex flex-col items-center justify-center gap-4 rounded-2xl border border-border/40 p-12 text-center shadow-soft">
      <p className="text-sm text-muted-foreground">No products match the current filters.</p>
      <button
        type="button"
        onClick={onReset}
        className="inline-flex items-center gap-2 rounded-xl border border-border/50 bg-card/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground transition hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        Reset filters
      </button>
    </div>
  );
}

