import { Moon, Search, Settings, Sun, X } from "lucide-react";
import type { ReactNode } from "react";

import { DATASET_OPTIONS, type DatasetType, type SortMode } from "./filter-config";
import { ProductSortBar } from "./ProductSortBar";

type Props = {
  theme: "light" | "dark";
  query: string;
  onQueryChange: (value: string) => void;
  onToggleFilters: () => void;
  onToggleTheme: () => void;
  activeFiltersCount: number;
  activeDataset: DatasetType;
  onDatasetChange: (value: DatasetType) => void;
  visibleCount: number;
  totalCount: number;
  activeSort: SortMode;
  onSortChange: (value: SortMode) => void;
  leading?: ReactNode;
};

export function ProductFilterToolbar({
  theme,
  query,
  onQueryChange,
  onToggleFilters,
  onToggleTheme,
  activeFiltersCount,
  activeDataset,
  onDatasetChange,
  visibleCount,
  totalCount,
  activeSort,
  onSortChange,
  leading,
}: Props) {
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 px-4 py-5 sm:px-8 lg:px-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        {leading}
        <button
          type="button"
          onClick={onToggleFilters}
          className={
            theme === "dark"
              ? "inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5 hover:border-white/35"
              : "inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 shadow-sm transition hover:-translate-y-0.5 hover:border-gray-900"
          }
        >
          <Settings className={theme === "dark" ? "h-4 w-4 text-slate-300" : "h-4 w-4 text-gray-500"} />
          <span>Filters</span>
          {activeFiltersCount ? (
            <span
              className={
                theme === "dark"
                  ? "flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-400 px-2 text-xs font-semibold text-black"
                  : "flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-900 px-2 text-xs font-semibold text-white"
              }
            >
              {activeFiltersCount}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          className={
            theme === "dark"
              ? "inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/30"
              : "inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition hover:border-gray-300"
          }
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          <span className="hidden sm:inline">{theme === "dark" ? "Light mode" : "Dark mode"}</span>
        </button>

        <div className="w-full flex-1">
          <div className="relative">
            <Search
              className={
                theme === "dark"
                  ? "pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  : "pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
              }
            />
            <input
              type="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search the catalog..."
              className={
                theme === "dark"
                  ? "h-12 w-full rounded-full border border-white/10 bg-white/5 pl-11 pr-11 text-sm font-medium text-slate-100 placeholder:text-slate-500 transition focus:border-emerald-400/70 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-300/30"
                  : "h-12 w-full rounded-full border border-gray-300 bg-gray-50 pl-11 pr-11 text-sm font-medium text-gray-900 placeholder:text-gray-500 transition focus:border-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-200"
              }
            />
            {query ? (
              <button
                type="button"
                onClick={() => onQueryChange("")}
                className={
                  theme === "dark"
                    ? "absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-white"
                    : "absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 transition hover:text-gray-900"
                }
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {DATASET_OPTIONS.map((option) => {
            const isActive = activeDataset === option.value;
            const activeClass =
              theme === "dark"
                ? "border-emerald-300/70 bg-emerald-400/10 text-emerald-100 shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
                : "border-gray-900 bg-white text-gray-900 shadow-[0_14px_34px_rgba(15,23,42,0.22)]";
            const idleClass =
              theme === "dark"
                ? "border-white/10 text-slate-300 hover:border-white/30 hover:text-white hover:shadow-[0_10px_26px_rgba(0,0,0,0.4)]"
                : "border-gray-200 text-gray-700 hover:border-gray-300 hover:text-gray-900 hover:shadow-[0_10px_26px_rgba(15,23,42,0.18)]";
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onDatasetChange(option.value)}
                className={`h-9 rounded-full border px-4 text-sm font-medium transform-gpu transition duration-170 ease-out hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${isActive ? activeClass : idleClass}`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span
            className={
              theme === "dark"
                ? "inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 shadow-inner shadow-black/20"
                : "inline-flex items-center rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700"
            }
          >
            {visibleCount} of {totalCount} products
          </span>
          <ProductSortBar theme={theme} activeSort={activeSort} onChange={onSortChange} />
        </div>
      </div>
    </div>
  );
}
