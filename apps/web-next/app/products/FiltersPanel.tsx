"use client";

import type { LucideIcon } from "lucide-react";
import { Search } from "lucide-react";
import { useMemo } from "react";

type DatasetValue = "all" | "shop" | "legacy";
type LayoutMode = "grid" | "single" | "masonry";
type SortValue = "recent" | "popular" | "price-asc" | "price-desc" | "impressions";

type Option<T extends string> = {
  value: T;
  label: string;
  icon?: LucideIcon;
};

type FiltersPanelProps = {
  query: string;
  dataset: DatasetValue;
  layout: LayoutMode;
  sort: SortValue;
  datasetOptions: Option<DatasetValue>[];
  layoutOptions: Option<LayoutMode>[];
  sortOptions: { value: SortValue; label: string }[];
  summary: string;
  visibleCount: number;
  totalCount: number;
  isPending: boolean;
  onQueryChange: (value: string) => void;
  onDatasetChange: (value: DatasetValue) => void;
  onLayoutChange: (value: LayoutMode) => void;
  onSortChange: (value: SortValue) => void;
  onReset: () => void;
  onBackToTop: () => void;
  onClose?: () => void;
  showCloseButton?: boolean;
};

export default function FiltersPanel(props: FiltersPanelProps) {
  const {
    query,
    dataset,
    layout,
    sort,
    datasetOptions,
    layoutOptions,
    sortOptions,
    summary,
    visibleCount,
    totalCount,
    isPending,
    onQueryChange,
    onDatasetChange,
    onLayoutChange,
    onSortChange,
    onReset,
    onBackToTop,
    onClose,
    showCloseButton = false,
  } = props;

  return (
    <aside className="flex flex-col gap-8 self-start rounded-3xl bg-surface/5 p-6 shadow-md ring-1 ring-white/10 backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <header className="space-y-1 text-fg">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Neon Shop</span>
          <h2 className="text-2xl font-semibold">Filters</h2>
          <p className="text-sm text-muted">Refine the catalog to match what you need.</p>
        </header>
        {showCloseButton ? (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-full border border-white/20 px-3 text-xs font-semibold text-muted transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            Close
          </button>
        ) : null}
      </div>

      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Search</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              id="filters-query"
              value={query}
              onChange={(event) => onQueryChange(event.currentTarget.value)}
              placeholder="Search products"
              disabled={isPending}
              className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 pl-12 pr-4 text-sm text-fg placeholder:text-muted shadow-sm transition focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:opacity-60"
            />
          </div>
        </section>

        <OptionList
          label="Category"
          value={dataset}
          options={datasetOptions}
          onChange={onDatasetChange}
          isPending={isPending}
        />

        <OptionList
          label="Layout"
          value={layout}
          options={layoutOptions}
          onChange={onLayoutChange}
          isPending={isPending}
        />

        <section className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-fg">Sort by</span>
          <div className="relative">
            <select
              id="filters-sort"
              value={sort}
              onChange={(event) => onSortChange(event.currentTarget.value as SortValue)}
              disabled={isPending}
              className="h-12 w-full appearance-none rounded-2xl border border-white/10 bg-white/5 px-4 pr-10 text-sm font-medium text-fg shadow-sm transition focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:opacity-60"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M7 10l5 5 5-5H7z" fill="currentColor" />
            </svg>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-inner">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-primary/70">
            <span>Summary</span>
            <span>
              {visibleCount} / {totalCount}
            </span>
          </div>
          <p className="mt-3 text-sm text-muted">{summary}</p>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onReset}
            disabled={isPending}
            className="flex-1 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25 disabled:opacity-60"
          >
            Reset filters
          </button>
          <button
            type="button"
            onClick={onBackToTop}
            className="flex-1 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-fg/90 transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
          >
            Back to top
          </button>
        </div>
      </div>
    </aside>
  );
}

function OptionList<T extends string>({
  label,
  value,
  options,
  onChange,
  isPending,
}: {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (next: T) => void;
  isPending: boolean;
}) {
  const normalized = useMemo(() => options ?? [], [options]);
  return (
    <section className="flex flex-col gap-3">
      <span className="text-sm font-semibold text-fg">{label}</span>
      <div className="grid gap-3">
        {normalized.map((option) => {
          const Icon = option.icon;
          const active = value === option.value;
          return (
            <button
              type="button"
              key={option.value}
              onClick={() => onChange(option.value)}
              disabled={isPending}
              className={[
                "group flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium transition",
                active
                  ? "border-primary/60 bg-primary/10 text-primary shadow-sm"
                  : "border-white/10 text-fg/80 hover:border-primary/40 hover:bg-white/10",
                isPending ? "opacity-60" : "",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-8 w-8 items-center justify-center rounded-full border transition",
                  active
                    ? "border-primary bg-primary text-white"
                    : "border-white/20 bg-white/10 text-muted group-hover:border-primary/40 group-hover:text-primary",
                ].join(" ")}
              >
                {Icon ? <Icon className="h-4 w-4" /> : null}
              </span>
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
