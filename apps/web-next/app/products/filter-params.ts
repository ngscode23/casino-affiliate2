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

export function resolveFilterParams(
  searchParams?: Record<string, string | string[] | undefined>,
): ResolvedFilterParams {
  const dataset = parseDataset(searchParams);
  const sort = parseSort(searchParams);
  const query = parseQuery(searchParams);
  const category = parseCategory(searchParams);
  const brand = parseBrand(searchParams);
  const model = parseModel(searchParams);
  const priceMin = parseNumberParam(searchParams?.price_min);
  const priceMax = parseNumberParam(searchParams?.price_max);
  const minRating = normalizeRating(parseNumberParam(searchParams?.rating_min));

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

function toSingleValue(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length > 0) return value[0];
  return undefined;
}

function parseDataset(searchParams?: Record<string, string | string[] | undefined>): ProductFilters["dataset"] {
  const raw = toSingleValue(searchParams?.dataset);
  if (raw === "shop" || raw === "legacy") return raw;
  return "all";
}

function parseSort(searchParams?: Record<string, string | string[] | undefined>): SortOption {
  const raw = toSingleValue(searchParams?.sort);
  return isSortOption(raw) ? raw : "recent";
}

function parseQuery(searchParams?: Record<string, string | string[] | undefined>): string {
  return toSingleValue(searchParams?.q)?.trim() ?? "";
}

function parseCategory(searchParams?: Record<string, string | string[] | undefined>): string {
  const slug = toSingleValue(searchParams?.category)?.trim() ?? "";
  return slug || "all";
}

function parseBrand(searchParams?: Record<string, string | string[] | undefined>): string {
  const slug = toSingleValue(searchParams?.brand)?.trim()?.toLowerCase() ?? "";
  return slug || "all";
}

function parseModel(searchParams?: Record<string, string | string[] | undefined>): string {
  const slug = toSingleValue(searchParams?.model)?.trim()?.toLowerCase() ?? "";
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
