"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Building2, Package, ChevronDown, Filter, LayoutGrid, Search, SlidersHorizontal, Star, Tag, X } from "lucide-react";

import { iconSm } from "@/styles/classnames";
import type { CategorySummary } from "./data";
import { DATASET_OPTIONS, DatasetType, SortMode, SORT_OPTIONS } from "./filter-config";

export type TaxonomyOption = {
  value: string;
  label: string;
  count: number;
};

type FilterSidebarProps = {
  isOpen: boolean;
  onCloseAction: () => void;
  activeQuery: string;
  onQueryChangeAction: (value: string) => void;
  activeCategory: string;
  categories: CategorySummary[];
  onCategoryChangeAction: (value: string) => void;
  brandOptions: TaxonomyOption[];
  modelOptions: TaxonomyOption[];
  brandEmptyMessage?: string;
  modelEmptyMessage?: string;
  activeBrand: string;
  onBrandChangeAction: (value: string) => void;
  activeModel: string;
  onModelChangeAction: (value: string) => void;
  activeDataset: DatasetType;
  onDatasetChangeAction: (value: DatasetType) => void;
  activeSort: SortMode;
  onSortChangeAction: (value: SortMode) => void;
  priceMin: number | null;
  priceMax: number | null;
  onPriceMinChangeAction: (value: number | null) => void;
  onPriceMaxChangeAction: (value: number | null) => void;
  minRating: number | null;
  onRatingChangeAction: (value: number | null) => void;
  onResetAction: () => void;
};

export default function FilterSidebar({
  isOpen,
  onCloseAction,
  activeQuery,
  onQueryChangeAction,
  activeCategory,
  categories,
  onCategoryChangeAction,
  brandOptions,
  modelOptions,
  brandEmptyMessage,
  modelEmptyMessage,
  activeBrand,
  onBrandChangeAction,
  activeModel,
  onModelChangeAction,
  activeDataset,
  onDatasetChangeAction,
  activeSort,
  onSortChangeAction,
  priceMin,
  priceMax,
  onPriceMinChangeAction,
  onPriceMaxChangeAction,
  minRating,
  onRatingChangeAction,
  onResetAction,
}: FilterSidebarProps) {
  const ratingOptions: { value: number | null; label: string }[] = [
    { value: null, label: "Any rating" },
    { value: 4.5, label: "4.5+" },
    { value: 4, label: "4.0+" },
    { value: 3, label: "3.0+" },
  ];

  const [hasEntered, setHasEntered] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setHasEntered(true));
    return () => {
      cancelAnimationFrame(frame);
      setHasEntered(false);
    };
  }, []);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    search: true,
    category: true,
    brand: false,
    model: false,
    dataset: false,
    price: false,
    rating: false,
    sort: false,
  });
  const toggleSection = (id: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <aside
      className={`lg:sticky lg:top-24 lg:min-h-[calc(100vh-96px)] flex h-full min-h-screen w-[280px] shrink-0 flex-col overflow-hidden rounded-4xl border border-border/30 bg-white/90 px-4 py-5 shadow-[0_25px_65px_rgba(15,23,42,0.15)] backdrop-blur-3xl transition-[transform,opacity] duration-500 ease-[0.22,1,0.36,1] will-change-transform dark:border-white/10 dark:bg-white/5 dark:shadow-[0_24px_70px_-48px_rgba(0,0,0,0.6)] ${
        hasEntered ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0"
      }`}
      aria-label="Product filters"
      aria-hidden={!isOpen}
      style={{ willChange: "transform, opacity" }}
    >
      <div className="flex items-center justify-between gap-3 pb-3">
        <div className="inline-flex items-center gap-2 text-lg font-semibold text-fg">
          <Filter className="h-5 w-5 text-primary" />
          <span>Filters</span>
        </div>
        <button
          type="button"
          className="rounded-full p-2 text-muted transition hover:bg-surface/40 hover:text-fg lg:hidden"
          onClick={onCloseAction}
          aria-label="Close filters"
        >
          <X className={iconSm} />
        </button>
      </div>
      <p className="text-xs uppercase tracking-[0.3em] text-muted/80">Fine-tune view</p>
      <div className="mt-4 space-y-3 overflow-y-auto pb-8 pr-2 filters-scroll">
        <FilterSection
          id="search"
          title="Search"
          icon={<Search className="h-4 w-4 text-muted" />}
          isOpen={openSections.search}
          onToggle={() => toggleSection("search")}
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={activeQuery}
              onChange={(event) => onQueryChangeAction(event.target.value)}
              placeholder="Find a product..."
              className="w-full rounded-xl border border-border/50 bg-surface/60 py-2.5 pl-10 pr-3 text-sm text-fg placeholder:text-muted shadow-inner outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </FilterSection>

        <FilterSection
          id="brand"
          title="Brand"
          icon={<Building2 className="h-4 w-4 text-muted" />}
          isOpen={openSections.brand}
          onToggle={() => toggleSection("brand")}
        >
          {brandOptions.length > 0 ? (
            <div className="flex flex-col gap-2">
              <FilterPill
                active={activeBrand === "all"}
                label="All brands"
                onClick={() => onBrandChangeAction("all")}
                badge={brandOptions.reduce((total, option) => total + option.count, 0)}
              />
              {brandOptions.map((option) => (
                <FilterPill
                  key={option.value}
                  active={activeBrand === option.value}
                  label={option.label}
                  onClick={() => onBrandChangeAction(option.value)}
                  badge={option.count}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">
              {brandEmptyMessage || "Choose a category to see available brands."}
            </p>
          )}
        </FilterSection>

        <FilterSection
          id="model"
          title="Model"
          icon={<Package className="h-4 w-4 text-muted" />}
          isOpen={openSections.model}
          onToggle={() => toggleSection("model")}
        >
          {activeBrand === "all" || modelOptions.length === 0 ? (
            <p className="text-sm text-muted">
              {activeBrand === "all"
                ? "Select a brand to see models."
                : modelEmptyMessage || "No models found for this brand yet."}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <FilterPill
                active={activeModel === "all"}
                label="All models"
                onClick={() => onModelChangeAction("all")}
                badge={modelOptions.reduce((total, option) => total + option.count, 0)}
              />
              {modelOptions.map((option) => (
                <FilterPill
                  key={option.value}
                  active={activeModel === option.value}
                  label={option.label}
                  onClick={() => onModelChangeAction(option.value)}
                  badge={option.count}
                />
              ))}
            </div>
          )}
        </FilterSection>

        <FilterSection
          id="category"
          title="Category"
          icon={<LayoutGrid className="h-4 w-4 text-muted" />}
          isOpen={openSections.category}
          onToggle={() => toggleSection("category")}
        >
          <div className="flex flex-col gap-2">
            <FilterPill
              active={activeCategory === "all"}
              label="All categories"
            onClick={() => onCategoryChangeAction("all")}
              badge={categories.reduce((total, item) => total + (item.count || 0), 0)}
            />
            {categories.map((category) => (
              <FilterPill
                key={category.slug}
                active={activeCategory === category.slug}
                label={category.label}
                onClick={() => onCategoryChangeAction(category.slug)}
                badge={category.count}
              />
            ))}
          </div>
        </FilterSection>

        <FilterSection
          id="dataset"
          title="Dataset"
          icon={<SlidersHorizontal className="h-4 w-4 text-muted" />}
          isOpen={openSections.dataset}
          onToggle={() => toggleSection("dataset")}
        >
          <div className="flex flex-col gap-2">
            {DATASET_OPTIONS.map((option) => (
              <FilterPill
                key={option.value}
                active={activeDataset === option.value}
                label={option.label}
                onClick={() => onDatasetChangeAction(option.value)}
              />
            ))}
          </div>
        </FilterSection>

        <FilterSection
          id="price"
          title="Price range"
          icon={<Tag className="h-4 w-4 text-muted" />}
          isOpen={openSections.price}
          onToggle={() => toggleSection("price")}
        >
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted">
                <span>Min</span>
                <span className="text-fg">{priceMin ?? 0}</span>
              </div>
              <input
                type="range"
                min={0}
                max={5000}
                step={50}
                value={priceMin ?? 0}
                onChange={(e) => onPriceMinChangeAction(Number(e.target.value))}
                className="slider"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted">
                <span>Max</span>
                <span className="text-fg">{priceMax ?? 5000}</span>
              </div>
              <input
                type="range"
                min={priceMin ?? 0}
                max={5000}
                step={50}
                value={priceMax ?? 5000}
                onChange={(e) => onPriceMaxChangeAction(Number(e.target.value))}
                className="slider"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumberInput
                label="Min"
                value={priceMin}
                onChange={onPriceMinChangeAction}
                placeholder="0"
              />
              <NumberInput
                label="Max"
                value={priceMax}
                onChange={onPriceMaxChangeAction}
                placeholder="5000"
              />
            </div>
          </div>
        </FilterSection>

        <FilterSection
          id="rating"
          title="Minimum rating"
          icon={<Star className="h-4 w-4 text-muted" />}
          isOpen={openSections.rating}
          onToggle={() => toggleSection("rating")}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted">
              <span>From</span>
              <span className="text-fg">{minRating ?? "Any"}</span>
            </div>
            <input
              type="range"
              min={0}
              max={5}
              step={0.5}
              value={minRating ?? 0}
              onChange={(e) => onRatingChangeAction(Number(e.target.value) || null)}
              className="slider"
            />
            <div className="grid grid-cols-2 gap-2">
              {ratingOptions.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => onRatingChangeAction(option.value)}
                  className={`rounded-2xl border px-3 py-2 text-sm font-semibold transition ${
                    minRating === option.value
                      ? "border-primary/60 bg-primary/10 text-primary shadow-sm"
                      : "border-border/60 bg-white text-muted hover:border-gray-300 hover:text-gray-900 dark:bg-white/5 dark:text-slate-200 dark:border-white/15 dark:hover:border-white/25"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </FilterSection>

        <FilterSection
          id="sort"
          title="Sort by"
          icon={<SlidersHorizontal className="h-4 w-4 text-muted" />}
          isOpen={openSections.sort}
          onToggle={() => toggleSection("sort")}
        >
          <div className="flex flex-col gap-2">
            {SORT_OPTIONS.map((option) => (
              <FilterPill
                key={option.value}
                active={activeSort === option.value}
                label={option.label}
                onClick={() => onSortChangeAction(option.value)}
              />
            ))}
          </div>
        </FilterSection>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onResetAction}
            className="flex-1 rounded-xl border border-border/70 bg-white px-4 py-2 text-sm font-semibold text-muted transition hover:border-gray-400 hover:text-gray-900"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onCloseAction}
            className="flex-1 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
          >
            Show results
          </button>
        </div>
      </div>
      <style jsx>{`
        .filters-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(148, 163, 184, 0.5) transparent;
        }
        .filters-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .filters-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .filters-scroll::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, rgba(148, 163, 184, 0.7), rgba(94, 234, 212, 0.8));
          border-radius: 999px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }
        .filters-scroll::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, rgba(226, 232, 240, 0.9), rgba(56, 189, 248, 0.9));
        }
        .slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 6px;
          border-radius: 999px;
          background: linear-gradient(90deg, rgba(94, 234, 212, 0.8), rgba(56, 189, 248, 0.8));
          outline: none;
        }
        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #fff;
          border: 2px solid #38bdf8;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
          cursor: pointer;
        }
        .slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #fff;
          border: 2px solid #38bdf8;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
          cursor: pointer;
        }
      `}</style>
    </aside>
  );
}

type FilterSectionProps = {
  id: string;
  title: string;
  icon?: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
};

function FilterSection({ id, title, icon, isOpen, onToggle, children }: FilterSectionProps) {
  return (
    <section
      aria-labelledby={`${id}-label`}
      className="rounded-2xl border border-border/30 bg-white/60 p-3 shadow-[0_20px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm transition duration-150 ease-out hover:border-border/60 hover:-translate-y-[1px]"
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-1 py-2 text-sm font-semibold text-gray-700 transition duration-150 ease-out hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
        aria-expanded={isOpen}
        aria-controls={`${id}-panel`}
      >
        <span className="flex items-center gap-2">
          {icon}
          <span id={`${id}-label`}>{title}</span>
        </span>
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {isOpen ? (
        <div id={`${id}-panel`} className="mt-2 space-y-3 px-1 pb-3 pt-2">
          {children}
        </div>
      ) : null}
    </section>
  );
}

function FilterPill({
  active,
  label,
  onClick,
  badge,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between rounded-2xl border px-3 py-2 text-sm font-semibold transform-gpu transition duration-170 ease-out hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
        active
          ? "border-primary/70 bg-linear-to-r from-primary/10 to-primary/5 text-primary shadow-[0_16px_40px_rgba(15,23,42,0.26)]"
          : "border-border/60 bg-white text-muted hover:border-gray-300 hover:text-gray-900 hover:shadow-[0_10px_26px_rgba(15,23,42,0.16)]"
      }`}
    >
      <span className="truncate text-left">{label}</span>
      {typeof badge === "number" ? (
        <span className="ml-3 rounded-full bg-surface/70 px-2 text-xs text-muted">{badge}</span>
      ) : null}
    </button>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
}) {
  return (
    <label className="space-y-1 text-sm text-muted">
      <span className="block text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(event) => {
          const next = event.target.value === "" ? null : Number(event.target.value);
          if (next === null || Number.isFinite(next)) {
            onChange(next);
          }
        }}
        className="w-full rounded-lg border border-border/60 bg-surface/60 px-3 py-2 text-sm text-fg outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}

export type { FilterSidebarProps };
