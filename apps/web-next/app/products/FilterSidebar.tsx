
"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  Building2,
  Package,
  ChevronDown,
  Filter,
  LayoutGrid,
  Search,
  SlidersHorizontal,
  Star,
  Tag as TagIcon,
  X,
} from "lucide-react";

import { Badge, Button, Card, Input } from "@/components/ui";

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

  const categoryItems = buildCategoryItems(categories);
  const brandItems = buildFacetItems(brandOptions, "All brands");
  const modelItems = buildFacetItems(modelOptions, "All models");
  const datasetItems = DATASET_OPTIONS.map((option) => ({ value: option.value, label: option.label }));
  const sortItems = SORT_OPTIONS.map((option) => ({ value: option.value, label: option.label }));

  return (
    <aside
      className={`pointer-events-auto lg:pointer-events-auto lg:sticky lg:top-24 lg:min-h-[calc(100vh-96px)] flex h-full min-h-screen w-[280px] shrink-0 flex-col overflow-hidden rounded-[var(--radius-xl)] border border-border/30 bg-card/90 px-4 py-5 shadow-[var(--elevation-2)] backdrop-blur-2xl transition-[transform,opacity] duration-500 ease-[0.22,1,0.36,1] will-change-transform dark:border-white/10 ${
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
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="lg:hidden rounded-full p-2 text-muted"
          onClick={onCloseAction}
          aria-label="Close filters"
        >
          <X className={iconSm} />
        </Button>
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
            <Input
              type="search"
              value={activeQuery}
              onChange={(event) => onQueryChangeAction(event.target.value)}
              placeholder="Find a product..."
              className="pl-10"
            />
          </div>
        </FilterSection>

        <FilterSection
          id="category"
          title="Category"
          icon={<LayoutGrid className="h-4 w-4 text-muted" />}
          isOpen={openSections.category}
          onToggle={() => toggleSection("category")}
        >
          <CategoryFilter
            items={categoryItems}
            selected={activeCategory}
            onSelect={onCategoryChangeAction}
          />
        </FilterSection>

        <FilterSection
          id="brand"
          title="Brand"
          icon={<Building2 className="h-4 w-4 text-muted" />}
          isOpen={openSections.brand}
          onToggle={() => toggleSection("brand")}
        >
          <BrandFilter
            items={brandItems}
            selected={activeBrand}
            onSelect={onBrandChangeAction}
            emptyMessage={brandEmptyMessage}
          />
        </FilterSection>

        <FilterSection
          id="model"
          title="Model"
          icon={<Package className="h-4 w-4 text-muted" />}
          isOpen={openSections.model}
          onToggle={() => toggleSection("model")}
        >
          <ModelFilter
            items={modelItems}
            selected={activeModel}
            onSelect={onModelChangeAction}
            disabled={activeBrand === "all"}
            emptyMessage={modelEmptyMessage}
          />
        </FilterSection>

        <FilterSection
          id="dataset"
          title="Dataset"
          icon={<TagIcon className="h-4 w-4 text-muted" />}
          isOpen={openSections.dataset}
          onToggle={() => toggleSection("dataset")}
        >
          <FacetCheckboxList
            items={datasetItems}
            selected={activeDataset}
            onToggle={(value) => onDatasetChangeAction(value as DatasetType)}
          />
        </FilterSection>

        <FilterSection
          id="price"
          title="Price"
          icon={<LayoutGrid className="h-4 w-4 text-muted" />}
          isOpen={openSections.price}
          onToggle={() => toggleSection("price")}
        >
          <PriceFilter
            min={priceMin}
            max={priceMax}
            onMinChange={onPriceMinChangeAction}
            onMaxChange={onPriceMaxChangeAction}
          />
        </FilterSection>

        <FilterSection
          id="rating"
          title="Rating"
          icon={<Star className="h-4 w-4 text-muted" />}
          isOpen={openSections.rating}
          onToggle={() => toggleSection("rating")}
        >
          <RatingFilter
            value={minRating}
            options={ratingOptions}
            onChange={onRatingChangeAction}
          />
        </FilterSection>

        <FilterSection
          id="sort"
          title="Sort by"
          icon={<SlidersHorizontal className="h-4 w-4 text-muted" />}
          isOpen={openSections.sort}
          onToggle={() => toggleSection("sort")}
        >
          <FacetCheckboxList
            items={sortItems}
            selected={activeSort}
            onToggle={(value) => onSortChangeAction(value as SortMode)}
          />
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
    <Card
      as="section"
      aria-labelledby={`${id}-label`}
      className="p-3 shadow-[var(--elevation-1)] backdrop-blur-sm transition duration-150 ease-out hover:border-border/60 hover:-translate-y-[1px]"
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-1 py-2 text-sm font-semibold text-fg transition duration-150 ease-out hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
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
    </Card>
  );
}

type FacetOption = { value: string; label: string; count?: number | null; disabled?: boolean };

type FacetCheckboxListProps = {
  items: FacetOption[];
  selected: string;
  onToggle: (value: string) => void;
  emptyMessage?: string;
};

function FacetCheckboxList({ items, selected, onToggle, emptyMessage }: FacetCheckboxListProps) {
  if (!items.length) {
    return <p className="text-sm text-muted">{emptyMessage || "No options available."}</p>;
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const isSelected = selected === item.value;
        const baseClass = isSelected
          ? "border-primary/60 bg-primary/10 text-primary shadow-sm"
          : "border-border/60 bg-white text-muted hover:border-gray-300 hover:text-gray-900 dark:bg-white/5 dark:text-slate-200 dark:border-white/15 dark:hover:border-white/25";
        return (
          <button
            key={item.value}
            type="button"
            disabled={item.disabled}
            onClick={() => onToggle(item.value)}
            className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
              item.disabled ? "opacity-60" : baseClass
            }`}
          >
            <span className="flex items-center gap-2">
              <span
                className={`h-4 w-4 rounded border ${
                  isSelected ? "border-primary bg-primary/90" : "border-border/70 bg-white dark:bg-white/5"
                }`}
                aria-hidden
              />
              <span>{item.label}</span>
            </span>
            {typeof item.count === "number" ? <Badge tone="muted">{item.count}</Badge> : null}
          </button>
        );
      })}
    </div>
  );
}

type CategoryFilterProps = {
  items: FacetOption[];
  selected: string;
  onSelect: (value: string) => void;
};

function CategoryFilter({ items, selected, onSelect }: CategoryFilterProps) {
  return <FacetCheckboxList items={items} selected={selected} onToggle={onSelect} emptyMessage="No categories yet." />;
}

type BrandFilterProps = {
  items: FacetOption[];
  selected: string;
  onSelect: (value: string) => void;
  emptyMessage?: string;
};

function BrandFilter({ items, selected, onSelect, emptyMessage }: BrandFilterProps) {
  return <FacetCheckboxList items={items} selected={selected} onToggle={onSelect} emptyMessage={emptyMessage} />;
}

type ModelFilterProps = {
  items: FacetOption[];
  selected: string;
  onSelect: (value: string) => void;
  disabled?: boolean;
  emptyMessage?: string;
};

function ModelFilter({ items, selected, onSelect, disabled, emptyMessage }: ModelFilterProps) {
  if (disabled) {
    return <p className="text-sm text-muted">Select a brand to see models.</p>;
  }
  return <FacetCheckboxList items={items} selected={selected} onToggle={onSelect} emptyMessage={emptyMessage} />;
}

type PriceFilterProps = {
  min: number | null;
  max: number | null;
  onMinChange: (value: number | null) => void;
  onMaxChange: (value: number | null) => void;
};

function PriceFilter({ min, max, onMinChange, onMaxChange }: PriceFilterProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <NumberInput label="Min price" value={min} onChange={onMinChange} placeholder="0" />
      <NumberInput label="Max price" value={max} onChange={onMaxChange} placeholder="500" />
    </div>
  );
}

type RatingFilterProps = {
  value: number | null;
  options: { value: number | null; label: string }[];
  onChange: (value: number | null) => void;
};

function RatingFilter({ value, options, onChange }: RatingFilterProps) {
  return (
    <div className="space-y-3">
      <input
        type="range"
        min={0}
        max={5}
        step={0.5}
        value={value ?? 0}
        onChange={(e) => onChange(Number(e.target.value) || null)}
        className="slider"
      />
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-2xl border px-3 py-2 text-sm font-semibold transition ${
              value === option.value
                ? "border-primary/60 bg-primary/10 text-primary shadow-sm"
                : "border-border/60 bg-white text-muted hover:border-gray-300 hover:text-gray-900 dark:bg-white/5 dark:text-slate-200 dark:border-white/15 dark:hover:border-white/25"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
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
      <Input
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
      />
    </label>
  );
}

function buildCategoryItems(categories: CategorySummary[]): FacetOption[] {
  const total = categories.reduce((sum, category) => sum + (category.count ?? 0), 0);
  return [
    { value: "all", label: "All categories", count: total },
    ...categories.map((category) => ({ value: category.slug, label: category.label, count: category.count ?? 0 })),
  ];
}

function buildFacetItems(options: TaxonomyOption[], allLabel: string): FacetOption[] {
  if (!options.length) {
    return [];
  }
  const total = options.reduce((sum, option) => sum + (option.count ?? 0), 0);
  return [
    { value: "all", label: allLabel, count: total },
    ...options.map((option) => ({ value: option.value, label: option.label, count: option.count ?? 0 })),
  ];
}

export type { FilterSidebarProps };
