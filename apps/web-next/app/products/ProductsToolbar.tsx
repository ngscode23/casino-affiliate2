import { ProductFilterToolbar } from "./ProductFilterToolbar";
import type { DatasetType, SortMode } from "./filter-config";
import type { ThemeMode } from "./types.shared";

export type ProductsToolbarProps = {
  theme: ThemeMode;
  query: string;
  onQueryChange: (value: string) => void;
  onToggleFilters: () => void;
  isLoading: boolean;
  onToggleTheme: () => void;
  activeFiltersCount: number;
  activeDataset: DatasetType;
  onDatasetChange: (value: DatasetType) => void;
  visibleCount: number;
  totalCount: number;
  activeSort: SortMode;
  onSortChange: (value: SortMode) => void;
};

export function ProductsToolbar({
  theme,
  query,
  onQueryChange,
  onToggleFilters,
  isLoading,
  onToggleTheme,
  activeFiltersCount,
  activeDataset,
  onDatasetChange,
  visibleCount,
  totalCount,
  activeSort,
  onSortChange,
}: ProductsToolbarProps) {
  return (
    <ProductFilterToolbar
      theme={theme}
      query={query}
      onQueryChange={onQueryChange}
      onToggleFilters={onToggleFilters}
      onToggleTheme={onToggleTheme}
      activeFiltersCount={activeFiltersCount}
      activeDataset={activeDataset}
      onDatasetChange={onDatasetChange}
      visibleCount={visibleCount}
      totalCount={totalCount}
      isLoading={isLoading}
      activeSort={activeSort}
      onSortChange={onSortChange}
    />
  );
}
