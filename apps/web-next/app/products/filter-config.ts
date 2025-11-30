export type DatasetType = "all" | "shop" | "legacy";

export const DATASET_LABELS: Record<DatasetType, string> = {
  all: "All products",
  shop: "Neon shop",
  legacy: "Archive",
};

export const DATASET_OPTIONS: { value: DatasetType; label: string }[] = [
  { value: "all", label: DATASET_LABELS.all },
  { value: "shop", label: DATASET_LABELS.shop },
  { value: "legacy", label: DATASET_LABELS.legacy },
];

export type SortMode = "recent" | "popular" | "price-asc" | "price-desc" | "impressions";

export const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "recent", label: "Newest first" },
  { value: "popular", label: "Popular" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "impressions", label: "Trending" },
];
