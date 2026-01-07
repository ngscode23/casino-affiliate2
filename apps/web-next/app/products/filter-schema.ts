import { sanitizeSearchParam } from "@shared/lib/sanitize";
import { normalizeBrandSlug } from "./taxonomy";

export type DatasetType = "all" | "shop";
export type SortMode = "recent" | "popular" | "price-asc" | "price-desc" | "impressions";

export const DATASET_VALUES: readonly DatasetType[] = ["all", "shop"];
export const SORT_VALUES: readonly SortMode[] = [
  "recent",
  "popular",
  "price-asc",
  "price-desc",
  "impressions",
];

export type ProductFilterState = {
  query: string;
  dataset: DatasetType;
  category: string;
  brand: string;
  model: string;
  sort: SortMode;
  priceMin: number | null;
  priceMax: number | null;
  minRating: number | null;
};

export type ProductFilters = {
  query?: string;
  category?: string;
  dataset?: DatasetType;
  brand?: string;
  model?: string;
  priceMin?: number | null;
  priceMax?: number | null;
  minRating?: number | null;
  sort?: SortMode;
};

export const DEFAULT_FILTER_STATE: ProductFilterState = {
  query: "",
  dataset: "all",
  category: "all",
  brand: "all",
  model: "all",
  sort: "recent",
  priceMin: null,
  priceMax: null,
  minRating: null,
};

export const DATASET_LABELS: Record<DatasetType, string> = {
  all: "All products",
  shop: "Neon shop",
};

export const DATASET_OPTIONS: { value: DatasetType; label: string }[] = [
  { value: "all", label: DATASET_LABELS.all },
  { value: "shop", label: DATASET_LABELS.shop },
];

export const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "recent", label: "Newest first" },
  { value: "popular", label: "Popular" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "impressions", label: "Trending" },
];

const FILTER_PARAM_KEYS = [
  "q",
  "dataset",
  "category",
  "brand",
  "model",
  "sort",
  "price_min",
  "price_max",
  "rating_min",
] as const;

type SearchParamsLike =
  | { getAll: (name: string) => string[] }
  | Record<string, string | string[] | undefined>
  | undefined;

function getParam(searchParams: SearchParamsLike, key: string): string | string[] | undefined {
  if (!searchParams) return undefined;
  if (isURLSearchParamsLike(searchParams)) {
    const all = searchParams.getAll(key);
    if (all.length === 0) return undefined;
    return all.length === 1 ? all[0] : all;
  }
  if (isRecordParams(searchParams)) return searchParams[key];
  return undefined;
}

function isURLSearchParamsLike(
  value: SearchParamsLike,
): value is { getAll: (name: string) => string[] } {
  return Boolean(value && typeof (value as { getAll?: unknown }).getAll === "function");
}

function isRecordParams(
  value: SearchParamsLike,
): value is Record<string, string | string[] | undefined> {
  if (!value) return false;
  if (isURLSearchParamsLike(value)) return false;
  return typeof value === "object";
}

function toSingleValue(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length > 0) return value[0];
  return undefined;
}

function clampPrice(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100) / 100;
}

function normalizeRating(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  if (value >= 4.5) return 4.5;
  if (value >= 4) return 4;
  if (value >= 3) return 3;
  return null;
}

function parseNumberParam(value: string | string[] | undefined): number | null {
  const raw = toSingleValue(value);
  if (typeof raw !== "string") return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeTextParam(raw: string | undefined, max = 120): string {
  const sanitized = sanitizeSearchParam(raw ?? "");
  const trimmed = sanitized.trim();
  if (!trimmed) return "";
  return trimmed.slice(0, max);
}

function isDataset(value: unknown): value is DatasetType {
  return typeof value === "string" && DATASET_VALUES.includes(value as DatasetType);
}

function isSort(value: unknown): value is SortMode {
  return typeof value === "string" && SORT_VALUES.includes(value as SortMode);
}

export function normalizeFilterState(input: Partial<ProductFilterState>): ProductFilterState {
  const query = typeof input.query === "string" ? input.query.trim() : DEFAULT_FILTER_STATE.query;
  const dataset = isDataset(input.dataset) ? input.dataset : DEFAULT_FILTER_STATE.dataset;
  const categoryRaw = typeof input.category === "string" ? input.category.trim().toLowerCase() : "";
  const category = categoryRaw || DEFAULT_FILTER_STATE.category;
  const brandRaw = typeof input.brand === "string" ? input.brand.trim() : "";
  const brand =
    brandRaw && brandRaw !== "all"
      ? normalizeBrandSlug(brandRaw) ?? DEFAULT_FILTER_STATE.brand
      : DEFAULT_FILTER_STATE.brand;
  const modelRaw = typeof input.model === "string" ? input.model.trim().toLowerCase() : "";
  const model = modelRaw || DEFAULT_FILTER_STATE.model;
  const sort = isSort(input.sort) ? input.sort : DEFAULT_FILTER_STATE.sort;
  const priceMin = clampPrice(input.priceMin);
  let priceMax = clampPrice(input.priceMax);
  if (priceMin != null && priceMax != null && priceMax < priceMin) priceMax = priceMin;
  const minRating = normalizeRating(input.minRating);

  return {
    query,
    dataset,
    category,
    brand,
    model,
    sort,
    priceMin,
    priceMax,
    minRating,
  };
}

export function parseFilterState(
  searchParams?: SearchParamsLike,
  fallback: ProductFilterState = DEFAULT_FILTER_STATE,
): ProductFilterState {
  const datasetRaw = toSingleValue(getParam(searchParams, "dataset"));
  const sortRaw = toSingleValue(getParam(searchParams, "sort"));
  const queryRaw = toSingleValue(getParam(searchParams, "q"));
  const categoryRaw = toSingleValue(getParam(searchParams, "category"));
  const brandRaw = toSingleValue(getParam(searchParams, "brand"));
  const modelRaw = toSingleValue(getParam(searchParams, "model"));
  const priceMinRaw = parseNumberParam(getParam(searchParams, "price_min"));
  const priceMaxRaw = parseNumberParam(getParam(searchParams, "price_max"));
  const ratingRaw = parseNumberParam(getParam(searchParams, "rating_min"));

  const query = queryRaw === undefined ? fallback.query : normalizeTextParam(queryRaw, 120);
  const dataset = datasetRaw === undefined ? fallback.dataset : (datasetRaw === "shop" ? "shop" : "all");
  const sort = sortRaw === undefined ? fallback.sort : (isSort(sortRaw) ? sortRaw : DEFAULT_FILTER_STATE.sort);

  const categoryValue =
    categoryRaw === undefined
      ? fallback.category
      : normalizeTextParam(categoryRaw, 80).toLowerCase() || DEFAULT_FILTER_STATE.category;

  const brandValue =
    brandRaw === undefined
      ? fallback.brand
      : normalizeBrandSlug(normalizeTextParam(brandRaw, 80)) ?? DEFAULT_FILTER_STATE.brand;

  const modelValue =
    modelRaw === undefined
      ? fallback.model
      : normalizeTextParam(modelRaw, 80).toLowerCase() || DEFAULT_FILTER_STATE.model;

  const next = normalizeFilterState({
    query,
    dataset,
    category: categoryValue,
    brand: brandValue,
    model: modelValue,
    sort,
    priceMin: priceMinRaw == null ? fallback.priceMin : priceMinRaw,
    priceMax: priceMaxRaw == null ? fallback.priceMax : priceMaxRaw,
    minRating: ratingRaw == null ? fallback.minRating : ratingRaw,
  });

  return next;
}

export function serializeFilterState(state: ProductFilterState): URLSearchParams {
  const normalized = normalizeFilterState(state);
  const params = new URLSearchParams();
  if (normalized.query.trim()) params.set("q", normalized.query.trim());
  if (normalized.dataset !== DEFAULT_FILTER_STATE.dataset) params.set("dataset", normalized.dataset);
  if (normalized.category && normalized.category !== DEFAULT_FILTER_STATE.category) {
    params.set("category", normalized.category);
  }
  if (normalized.brand && normalized.brand !== DEFAULT_FILTER_STATE.brand) {
    params.set("brand", normalized.brand);
  }
  if (normalized.model && normalized.model !== DEFAULT_FILTER_STATE.model) {
    params.set("model", normalized.model);
  }
  if (normalized.sort !== DEFAULT_FILTER_STATE.sort) params.set("sort", normalized.sort);
  if (normalized.priceMin != null) params.set("price_min", String(normalized.priceMin));
  if (normalized.priceMax != null) params.set("price_max", String(normalized.priceMax));
  if (normalized.minRating != null) params.set("rating_min", String(normalized.minRating));
  return params;
}

export function toProductFilters(state: ProductFilterState): ProductFilters {
  const normalized = normalizeFilterState(state);
  const filters: ProductFilters = {
    dataset: normalized.dataset,
    sort: normalized.sort,
  };

  if (normalized.query.trim()) filters.query = normalized.query.trim();
  if (normalized.category && normalized.category !== DEFAULT_FILTER_STATE.category) {
    filters.category = normalized.category;
  }
  if (normalized.brand && normalized.brand !== DEFAULT_FILTER_STATE.brand) {
    filters.brand = normalized.brand;
  }
  if (normalized.model && normalized.model !== DEFAULT_FILTER_STATE.model) {
    filters.model = normalized.model;
  }
  if (normalized.priceMin != null) filters.priceMin = normalized.priceMin;
  if (normalized.priceMax != null) filters.priceMax = normalized.priceMax;
  if (normalized.minRating != null) filters.minRating = normalized.minRating;

  return filters;
}

export function parseFiltersFromSearchParams(
  searchParams?: SearchParamsLike,
  fallback: ProductFilterState = DEFAULT_FILTER_STATE,
): ProductFilters {
  const state = parseFilterState(searchParams, fallback);
  return toProductFilters(state);
}

export function normalizeProductFilters(filters: ProductFilters = {}): ProductFilters {
  const query = typeof filters.query === "string" ? normalizeTextParam(filters.query, 120) : DEFAULT_FILTER_STATE.query;
  const categoryRaw = typeof filters.category === "string" ? normalizeTextParam(filters.category, 80) : "";
  const brandRaw = typeof filters.brand === "string" ? normalizeTextParam(filters.brand, 80) : "";
  const modelRaw = typeof filters.model === "string" ? normalizeTextParam(filters.model, 80) : "";

  const state = normalizeFilterState({
    ...DEFAULT_FILTER_STATE,
    query,
    dataset: filters.dataset ?? DEFAULT_FILTER_STATE.dataset,
    category: categoryRaw.toLowerCase() || DEFAULT_FILTER_STATE.category,
    brand: brandRaw || DEFAULT_FILTER_STATE.brand,
    model: modelRaw.toLowerCase() || DEFAULT_FILTER_STATE.model,
    sort: filters.sort ?? DEFAULT_FILTER_STATE.sort,
    priceMin: filters.priceMin ?? DEFAULT_FILTER_STATE.priceMin,
    priceMax: filters.priceMax ?? DEFAULT_FILTER_STATE.priceMax,
    minRating: filters.minRating ?? DEFAULT_FILTER_STATE.minRating,
  });

  return toProductFilters(state);
}

export function isDefaultFilterState(state: ProductFilterState): boolean {
  const normalized = normalizeFilterState(state);
  return (
    normalized.query === DEFAULT_FILTER_STATE.query &&
    normalized.dataset === DEFAULT_FILTER_STATE.dataset &&
    normalized.category === DEFAULT_FILTER_STATE.category &&
    normalized.brand === DEFAULT_FILTER_STATE.brand &&
    normalized.model === DEFAULT_FILTER_STATE.model &&
    normalized.sort === DEFAULT_FILTER_STATE.sort &&
    normalized.priceMin === DEFAULT_FILTER_STATE.priceMin &&
    normalized.priceMax === DEFAULT_FILTER_STATE.priceMax &&
    normalized.minRating === DEFAULT_FILTER_STATE.minRating
  );
}

export function hasFilterParams(searchParams?: SearchParamsLike): boolean {
  if (!searchParams) return false;
  if (isURLSearchParamsLike(searchParams)) {
    return FILTER_PARAM_KEYS.some((key) => searchParams.getAll(key).length > 0);
  }
  if (isRecordParams(searchParams)) {
    return FILTER_PARAM_KEYS.some((key) => searchParams[key] !== undefined);
  }
  return false;
}
