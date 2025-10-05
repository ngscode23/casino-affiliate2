"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition, useId } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
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

type SortComparator = (a: Product, b: Product) => number;

const CHUNK_SIZE = 14;

const DATASET_DESCRIPTORS: Record<FiltersState["dataset"], { label: string; icon: LucideIcon }> = {
  all: { label: "All products", icon: Sparkles },
  shop: { label: "Clothing", icon: Shirt },
  legacy: { label: "Gadgets", icon: Smartphone },
};

const LAYOUT_DESCRIPTORS: Record<LayoutMode, { label: string; icon: LucideIcon }> = {
  masonry: { label: "Masonry", icon: LayoutGrid },
  grid: { label: "Grid", icon: Grid3X3 },
  single: { label: "Single column", icon: AlignJustify },
};

const sortComparators: Record<FiltersState["sort"], SortComparator> = {
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
}: {
  products: Product[];
  initialLayout?: LayoutMode;
}) {
  const [filters, setFilters] = useState<FiltersState>({ query: "", dataset: "all", sort: "recent", layout: initialLayout });
  const [visible, setVisible] = useState(CHUNK_SIZE);
  const [hydrated, setHydrated] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);
  const sortTriggerRef = useRef<HTMLButtonElement | null>(null);
  const sortMenuRef = useRef<HTMLDivElement | null>(null);
  const [isSortMenuOpen, setSortMenuOpen] = useState(false);
  const [sortMenuActiveIndex, setSortMenuActiveIndex] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const sortSelectId = useId();

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

  const selectedSortOption = useMemo(() => sortOptions.find((option) => option.value === filters.sort) ?? sortOptions[0], [filters.sort, sortOptions]);
  const sortListboxId = sortSelectId + "-listbox";
  const activeSortOptionId =
    sortMenuActiveIndex != null && sortOptions[sortMenuActiveIndex]
      ? `${sortSelectId}-option-${sortOptions[sortMenuActiveIndex].value}`
      : undefined;

  const activeFilterPills = useMemo(() => {
    const pills: { key: string; label: string; Icon?: LucideIcon }[] = [];
    if (filters.dataset !== "all") {
      const descriptor = DATASET_DESCRIPTORS[filters.dataset] ?? {
        label: datasetLabel(filters.dataset),
        icon: Sparkles,
      };
      pills.push({ key: "dataset", label: descriptor.label, Icon: descriptor.icon });
    }
    const trimmedQuery = filters.query.trim();
    if (trimmedQuery) {
      pills.push({ key: "query", label: "" + trimmedQuery + "" });
    }
    return pills;
  }, [filters.dataset, filters.query]);

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
  }, [filters, products]);

  const totals = useMemo(() => {
    let clicks = 0;
    let impressions = 0;
    for (const product of products) {
      clicks += product.clicks || 0;
      impressions += product.impressions || 0;
    }
    return { clicks, impressions };
  }, [products]);

  useEffect(() => {
    if (!isSortMenuOpen) {
      setSortMenuActiveIndex(null);
      return;
    }
    const currentIndex = sortOptions.findIndex((option) => option.value === filters.sort);
    setSortMenuActiveIndex(currentIndex >= 0 ? currentIndex : 0);
    const frame = requestAnimationFrame(() => {
      sortMenuRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [filters.sort, isSortMenuOpen, sortOptions]);

  useEffect(() => {
    if (!isSortMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (sortMenuRef.current?.contains(target) || sortTriggerRef.current?.contains(target)) return;
      setSortMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSortMenuOpen(false);
        requestAnimationFrame(() => sortTriggerRef.current?.focus());
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSortMenuOpen]);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    setVisible(CHUNK_SIZE);
  }, [filters]);

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

  const handleQueryChange = useCallback(
    (value: string) => {
      updateFilters((prev) => ({ ...prev, query: value }));
    },
    [updateFilters],
  );

  const handleDatasetChange = useCallback(
    (value: FiltersState["dataset"]) => {
      scrollToTop();
      updateFilters((prev) => ({ ...prev, dataset: value }));
    },
    [updateFilters, scrollToTop],
  );

  const handleSortChange = useCallback(
    (value: FiltersState["sort"]) => {
      scrollToTop();
      updateFilters((prev) => ({ ...prev, sort: value }));
    },
    [updateFilters, scrollToTop],
  );

  const handleSortToggle = useCallback(() => {
    if (isPending) return;
    setSortMenuOpen((prev) => !prev);
  }, [isPending]);

  const handleSortTriggerKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
        event.preventDefault();
        setSortMenuOpen(true);
      } else if (event.key === "Escape") {
        event.preventDefault();
        setSortMenuOpen(false);
      }
    },
    [],
  );

  const handleSortOptionSelect = useCallback(
    (value: FiltersState["sort"]) => {
      handleSortChange(value);
      setSortMenuOpen(false);
      requestAnimationFrame(() => sortTriggerRef.current?.focus());
    },
    [handleSortChange],
  );

  const handleSortMenuKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (!isSortMenuOpen) return;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        setSortMenuActiveIndex((prev) => {
          const total = sortOptions.length;
          if (total === 0) return null;
          const current = prev != null ? prev : Math.max(0, sortOptions.findIndex((option) => option.value === filters.sort));
          const next = (current + direction + total) % total;
          return next;
        });
        return;
      }
      if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
        event.preventDefault();
        if (sortMenuActiveIndex != null) {
          const option = sortOptions[sortMenuActiveIndex];
          if (option) handleSortOptionSelect(option.value as FiltersState["sort"]);
        }
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setSortMenuOpen(false);
        requestAnimationFrame(() => sortTriggerRef.current?.focus());
      }
    },
    [filters.sort, handleSortOptionSelect, isSortMenuOpen, sortMenuActiveIndex, sortOptions],
  );

  const handleLayoutChange = useCallback(
    (value: LayoutMode) => {
      scrollToTop();
      updateFilters((prev) => ({ ...prev, layout: value }));
    },
    [updateFilters, scrollToTop],
  );

  const resetFilters = useCallback(() => {
    scrollToTop();
    updateFilters(() => ({ query: "", dataset: "all", sort: "recent", layout: initialLayout }));
  }, [updateFilters, initialLayout, scrollToTop]);

  const displayed = filtered.slice(0, visible);
  const hasMore = visible < filtered.length;

  const summary = useMemo(() => {
    const visibleCount = displayed.length;
    const totalProducts = products.length;
    const parts = [visibleCount + " of " + totalProducts + " products"];
    parts.push(numberFormatter.format(totals.clicks || 0) + " clicks");
    parts.push(numberFormatter.format(totals.impressions || 0) + " impressions");
    return parts.join(" • ");
  }, [displayed.length, numberFormatter, products.length, totals.clicks, totals.impressions]);

  // Скрываем внутренние метрики от обычных пользователей: оставляем только источник
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
          meta: metaParts.join(" • "),
        };
      }),
    [displayed],
  );

  const showSkeleton = !hydrated || isPending;
  const skeletonCount = showSkeleton ? Math.max(displayed.length, 8) : 0;
  const layoutMode: LayoutMode = filters.layout;

  return (
    <div ref={topRef} className="pb-10">
      <div className="grid grid-cols-1 gap-6 xl:[grid-template-columns:minmax(220px,260px)_minmax(0,1fr)] 2xl:[grid-template-columns:minmax(232px,280px)_minmax(0,1fr)]">
        <aside className="space-y-4 xl:sticky xl:top-16 xl:h-[calc(100vh-4rem)] xl:max-w-[260px] xl:justify-self-start xl:flex-shrink-0 2xl:max-w-[280px]">
          <section className="rounded-[26px] border border-border/40 bg-card/90 p-6 shadow-[0_22px_45px_-28px_rgba(15,15,15,0.12)] backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">Filters</h2>
              <label
                htmlFor={sortSelectId}
                className="inline-flex items-center gap-3 rounded-full border border-border/40 bg-card/80 px-4 py-2 text-sm text-muted-foreground shadow-[0_12px_32px_-24px_rgba(20,20,20,0.18)] transition focus-within:border-primary/60 focus-within:text-fg focus-within:ring-2 focus-within:ring-primary/60"
              >
                <span className="text-xs font-semibold uppercase tracking-[0.16em]">Sort by</span>
                <div className="relative flex items-center">
                  <select
                    id={sortSelectId}
                    value={filters.sort}
                    onChange={(e) => handleSortChange(e.currentTarget.value as FiltersState["sort"])}
                    className="appearance-none bg-transparent pr-6 text-sm font-medium text-fg outline-none disabled:opacity-40"
                    disabled={isPending}
                  >
                    {sortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                </div>
              </label>
            </div>
            <div className="mt-5 space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Categories</p>
                <div className="mt-3 flex flex-wrap gap-2.5">
                  {datasetChips.map(({ value, label, Icon }) => {
                    const isActive = filters.dataset === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleDatasetChange(value)}
                        className={
                          "group inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" +
                          (isActive
                            ? " border-primary/60 bg-primary text-primaryfg shadow-[0_14px_38px_-20px_rgba(28,28,28,0.35)]"
                            : " border-border/40 bg-card/60 text-muted-foreground hover:border-primary/40 hover:text-fg hover:shadow-[0_12px_30px_-24px_rgba(30,30,30,0.22)]")
                        }
                        disabled={isPending}
                      >
                        <Icon className="h-4 w-4 transition group-hover:scale-105" />
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Search</p>
                <label className="mt-3 flex items-center gap-2 rounded-full border border-border/50 bg-card/80 px-4 py-2 text-sm text-muted-foreground shadow-[0_10px_30px_-24px_rgba(20,20,20,0.25)] transition focus-within:border-primary/60 focus-within:text-fg focus-within:ring-2 focus-within:ring-primary/60">
                  <Search className="h-4 w-4 shrink-0" />
                  <input
                    value={filters.query}
                    onChange={(e) => handleQueryChange(e.currentTarget.value)}
                    placeholder="Search products..."
                    className="w-full bg-transparent text-sm text-fg placeholder:text-muted-foreground focus:outline-none"
                    disabled={isPending}
                  />
                </label>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Layout</p>
                <div className="mt-3 flex flex-wrap gap-2.5">
                  {layoutChips.map(({ value, label, Icon }) => {
                    const isActive = filters.layout === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleLayoutChange(value)}
                        className={
                          "group inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" +
                          (isActive
                            ? " border-primary/60 bg-primary text-primaryfg shadow-[0_14px_38px_-20px_rgba(28,28,28,0.35)]"
                            : " border-border/40 bg-card/60 text-muted-foreground hover:border-primary/40 hover:text-fg hover:shadow-[0_12px_30px_-24px_rgba(30,30,30,0.22)]")
                        }
                        disabled={isPending}
                      >
                        <Icon className="h-4 w-4 transition group-hover:scale-105" />
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {activeFilterPills.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Active filters</p>
                  <div className="mt-3 flex flex-wrap gap-2.5">
                    {activeFilterPills.map((pill) => {
                      const Icon = pill.Icon;
                      return (
                        <span
                          key={pill.key}
                          className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primaryfg shadow-[0_14px_38px_-20px_rgba(28,28,28,0.32)]"
                        >
                          {Icon ? <Icon className="h-4 w-4" /> : null}
                          <span>{pill.label}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border/40 bg-card/80 px-5 py-2.5 text-sm font-medium text-muted-foreground transition hover:border-primary/40 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-40"
                disabled={isPending}
              >
                <RotateCcw className="h-4 w-4" />
                Reset filters
              </button>
            </div>
          </section>
          <p className="text-xs text-muted-foreground">{summary}</p>
        </aside>

        <main className="flex-1 min-w-0">
          <div className="mx-auto w-full max-w-[1280px] 2xl:max-w-[1600px] 3xl:max-w-[1820px]">
            {showSkeleton ? (
              <div
                className={skeletonLayoutClass[layoutMode]}
              >
                {Array.from({ length: skeletonCount }).map((_, index) => (
                  <div
                    key={"skeleton-" + index}
                    className={skeletonItemWrapperClass[layoutMode]}
                  >
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
              <p className="py-4 text-center text-xs text-muted-foreground" role="status">
                Loading more products…
              </p>
            ) : null}
          </div>
        </main>
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
























