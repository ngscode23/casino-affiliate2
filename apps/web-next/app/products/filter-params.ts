import type { ProductFilters } from "./data";

export type SortOption = NonNullable<ProductFilters["sort"]>;

const SORT_OPTIONS: readonly SortOption[] = ["recent", "popular", "price-asc", "price-desc", "impressions"];

export type ResolvedFilterParams = {
  dataset: ProductFilters["dataset"];
  sort: SortOption;
  query: string;
  category: string;
  brand: string;
  model: string;
  priceMin: number | null;
  priceMax: number | null;
  minRating: number | null;
};

type SearchParamsLike = URLSearchParams | Record<string, string | string[] | undefined> | undefined;

export function resolveFilterParams(searchParams?: SearchParamsLike): ResolvedFilterParams {
  const dataset = parseDataset(searchParams);
  const sort = parseSort(searchParams);
  const query = parseQuery(searchParams);
  const category = parseCategory(searchParams);
  const brand = parseBrand(searchParams);
  const model = parseModel(searchParams);
  const priceMin = parseNumberParam(getParam(searchParams, "price_min"));
  const priceMax = parseNumberParam(getParam(searchParams, "price_max"));
  const minRating = normalizeRating(parseNumberParam(getParam(searchParams, "rating_min")));

  return {
    dataset,
    sort,
    query,
    category,
    brand,
    model,
    priceMin,
    priceMax,
    minRating,
  };
}

function getParam(searchParams: SearchParamsLike, key: string): string | string[] | undefined {
  if (!searchParams) return undefined;
  if (typeof URLSearchParams !== "undefined" && searchParams instanceof URLSearchParams) {
    const all = searchParams.getAll(key);
    if (all.length === 0) return undefined;
    return all.length === 1 ? all[0] : all;
  }
  if (isRecordParams(searchParams)) return searchParams[key];
  return undefined;
}

function isRecordParams(
  value: SearchParamsLike,
): value is Record<string, string | string[] | undefined> {
  if (!value) return false;
  if (typeof URLSearchParams !== "undefined" && value instanceof URLSearchParams) return false;
  return typeof value === "object";
}

function toSingleValue(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length > 0) return value[0];
  return undefined;
}

function parseDataset(searchParams?: SearchParamsLike): ProductFilters["dataset"] {
  const raw = toSingleValue(getParam(searchParams, "dataset"));
  if (raw === "shop") return "shop";
  return "all";
}

function parseSort(searchParams?: SearchParamsLike): SortOption {
  const raw = toSingleValue(getParam(searchParams, "sort"));
  return isSortOption(raw) ? raw : "recent";
}

function parseQuery(searchParams?: SearchParamsLike): string {
  return toSingleValue(getParam(searchParams, "q"))?.trim() ?? "";
}

function parseCategory(searchParams?: SearchParamsLike): string {
  const slug = toSingleValue(getParam(searchParams, "category"))?.trim() ?? "";
  return slug || "all";
}

function parseBrand(searchParams?: SearchParamsLike): string {
  const slug = toSingleValue(getParam(searchParams, "brand"))?.trim()?.toLowerCase() ?? "";
  return slug || "all";
}

function parseModel(searchParams?: SearchParamsLike): string {
  const slug = toSingleValue(getParam(searchParams, "model"))?.trim()?.toLowerCase() ?? "";
  return slug || "all";
}

function parseNumberParam(value: string | string[] | undefined): number | null {
  const raw = toSingleValue(value);
  if (typeof raw !== "string") return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeRating(value: number | null): number | null {
  if (value == null) return null;
  if (value >= 4.5) return 4.5;
  if (value >= 4) return 4;
  if (value >= 3) return 3;
  return null;
}

function isSortOption(value: unknown): value is SortOption {
  return typeof value === "string" && SORT_OPTIONS.includes(value as SortOption);
}
