import { useCallback, useEffect, useMemo, useRef } from "react";

import { resolveFilterParams } from "@/app/products/filter-params";
import { DATASET_OPTIONS, DatasetType, SORT_OPTIONS, SortMode } from "@/app/products/filter-config";
import { useUrlSearchState } from "./useUrlSearchState";

export type ProductsSearchState = {
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

type UseProductsSearchStateOptions = {
  initialQuery?: string;
  initialDataset?: DatasetType;
  initialCategory?: string;
  initialBrand?: string;
  initialModel?: string;
  initialSort?: SortMode;
  initialPriceMin?: number | null;
  initialPriceMax?: number | null;
  initialMinRating?: number | null;
  storageKey?: string;
};

type ResetOptions = { method?: "push" | "replace" };

export type UseProductsSearchStateReturn = {
  state: ProductsSearchState;
  priceRange: { min: number | null; max: number | null };
  normalizedRating: number | null;
  filtersCount: number;
  queryKey: string;
  setQuery: (value: string) => void;
  setDataset: (value: DatasetType) => void;
  setCategory: (value: string) => void;
  setBrand: (value: string) => void;
  setModel: (value: string) => void;
  setSort: (value: SortMode) => void;
  setPriceRange: (value: { min: number | null; max: number | null }) => void;
  setMinRating: (value: number | null) => void;
  resetFilters: (options?: ResetOptions) => void;
};

const DEFAULT_STORAGE_KEY = "catalog:filters:v1";

function clampPrice(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return value;
}

function normalizeRating(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  if (value >= 4.5) return 4.5;
  if (value >= 4) return 4;
  if (value >= 3) return 3;
  return null;
}

function buildSearchParams(state: ProductsSearchState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.query.trim()) params.set("q", state.query.trim());
  if (state.dataset !== "all") params.set("dataset", state.dataset);
  if (state.category && state.category !== "all") params.set("category", state.category);
  if (state.brand && state.brand !== "all") params.set("brand", state.brand);
  if (state.model && state.model !== "all") params.set("model", state.model);
  if (state.sort && state.sort !== "recent") params.set("sort", state.sort);
  if (state.priceMin != null) params.set("price_min", String(state.priceMin));
  if (state.priceMax != null) params.set("price_max", String(state.priceMax));
  if (state.minRating != null) params.set("rating_min", String(state.minRating));
  return params;
}

function sanitizeState(state: ProductsSearchState): ProductsSearchState {
  const dataset = DATASET_OPTIONS.some((opt) => opt.value === state.dataset) ? state.dataset : "all";
  const sort = SORT_OPTIONS.some((opt) => opt.value === state.sort) ? state.sort : "recent";
  const priceMin = clampPrice(state.priceMin);
  const priceMax = clampPrice(state.priceMax);
  const normalizedMin = normalizeRating(state.minRating);

  const finalMin = priceMin;
  let finalMax = priceMax;
  if (finalMin != null && finalMax != null && finalMax < finalMin) {
    finalMax = finalMin;
  }

  return {
    query: state.query?.trim() ?? "",
    dataset,
    category: state.category || "all",
    brand: state.brand || "all",
    model: state.model || "all",
    sort,
    priceMin: finalMin,
    priceMax: finalMax,
    minRating: normalizedMin,
  };
}

export function useProductsSearchState(options: UseProductsSearchStateOptions): UseProductsSearchStateReturn {
  const storageKey = options.storageKey ?? DEFAULT_STORAGE_KEY;

  const defaultState = useMemo<ProductsSearchState>(
    () =>
      sanitizeState({
        query: options.initialQuery ?? "",
        dataset: options.initialDataset ?? "all",
        category: options.initialCategory ?? "all",
        brand: options.initialBrand ?? "all",
        model: options.initialModel ?? "all",
        sort: options.initialSort ?? "recent",
        priceMin: clampPrice(options.initialPriceMin),
        priceMax: clampPrice(options.initialPriceMax),
        minRating: normalizeRating(options.initialMinRating),
      }),
    [
      options.initialBrand,
      options.initialCategory,
      options.initialDataset,
      options.initialMinRating,
      options.initialModel,
      options.initialPriceMax,
      options.initialPriceMin,
      options.initialQuery,
      options.initialSort,
    ],
  );

  const hasExplicitInitialFilters = useMemo(
    () =>
      Boolean(
        (options.initialQuery && options.initialQuery.trim()) ||
          (options.initialDataset && options.initialDataset !== "all") ||
          (options.initialCategory && options.initialCategory !== "all") ||
          (options.initialBrand && options.initialBrand !== "all") ||
          (options.initialModel && options.initialModel !== "all") ||
          (options.initialPriceMin != null && Number.isFinite(options.initialPriceMin)) ||
          (options.initialPriceMax != null && Number.isFinite(options.initialPriceMax)) ||
          (options.initialMinRating != null && Number.isFinite(options.initialMinRating)) ||
          (options.initialSort && options.initialSort !== "recent"),
      ),
    [
      options.initialBrand,
      options.initialCategory,
      options.initialDataset,
      options.initialMinRating,
      options.initialModel,
      options.initialPriceMax,
      options.initialPriceMin,
      options.initialQuery,
      options.initialSort,
    ],
  );

  const parseSearchParams = useCallback(
    (params: URLSearchParams) => {
      const parsed = resolveFilterParams(params);
      return sanitizeState({
        ...defaultState,
        ...parsed,
        dataset: parsed.dataset ?? defaultState.dataset,
      });
    },
    [defaultState],
  );

  const serializeState = useCallback(
    (value: ProductsSearchState) => buildSearchParams(sanitizeState(value)),
    [],
  );

  const { state, setState, update } = useUrlSearchState<ProductsSearchState>({
    initialState: defaultState,
    parse: parseSearchParams,
    serialize: serializeState,
    mode: "replace",
  });
  const restoredFromSession = useRef(false);

  useEffect(() => {
    if (restoredFromSession.current) return;
    if (hasExplicitInitialFilters) return; // при прямом заходе с фильтрами из URL не затираем их состоянием из сессии
    try {
      const raw = typeof window !== "undefined" ? window.sessionStorage.getItem(storageKey) : null;
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;
      const next = sanitizeState({
        ...state,
        ...parsed,
      });
      restoredFromSession.current = true;
      setState(next);
    } catch {
      /* ignore */
    }
  }, [hasExplicitInitialFilters, setState, state, storageKey]);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(storageKey, JSON.stringify(state));
      }
    } catch {
      /* noop */
    }
  }, [state, storageKey]);

  const setQuery = useCallback((value: string) => {
    setState((prev) => ({ ...prev, query: value }));
  }, [setState]);

  const setDataset = useCallback((value: DatasetType) => {
    setState((prev) => {
      if (prev.dataset === value) return prev;
      return { ...prev, dataset: value };
    });
  }, [setState]);

  const setCategory = useCallback((value: string) => {
    setState((prev) => ({
      ...prev,
      category: value || "all",
    }));
  }, [setState]);

  const setBrand = useCallback((value: string) => {
    setState((prev) => ({
      ...prev,
      brand: value || "all",
      model: "all",
    }));
  }, [setState]);

  const setModel = useCallback((value: string) => {
    setState((prev) => ({
      ...prev,
      model: value || "all",
    }));
  }, [setState]);

  const setSort = useCallback((value: SortMode) => {
    setState((prev) => ({ ...prev, sort: value }));
  }, [setState]);

  const setPriceRange = useCallback((value: { min: number | null; max: number | null }) => {
    setState((prev) => {
      const min = clampPrice(value.min);
      const max = clampPrice(value.max);
      let nextMax = max;
      if (min != null && nextMax != null && nextMax < min) {
        nextMax = min;
      }
      return { ...prev, priceMin: min, priceMax: nextMax };
    });
  }, [setState]);

  const setMinRating = useCallback((value: number | null) => {
    setState((prev) => ({ ...prev, minRating: normalizeRating(value) }));
  }, [setState]);

  const resetFilters = useCallback(
    (options?: ResetOptions) => {
      const method = options?.method ?? "replace";
      update(defaultState, { mode: method });
      try {
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem(storageKey);
        }
      } catch {
        /* ignore */
      }
    },
    [defaultState, update, storageKey],
  );

  const priceRange = useMemo(() => {
    const min = clampPrice(state.priceMin);
    const maxRaw = clampPrice(state.priceMax);
    const max = maxRaw != null && min != null && maxRaw < min ? min : maxRaw;
    return { min, max };
  }, [state.priceMax, state.priceMin]);

  const normalizedRating = useMemo(() => normalizeRating(state.minRating), [state.minRating]);

  const filtersCount = useMemo(() => {
    let count = 0;
    if (state.query.trim()) count += 1;
    if (state.dataset !== "all") count += 1;
    if (state.category !== "all") count += 1;
    if (state.brand !== "all") count += 1;
    if (state.model !== "all") count += 1;
    if (state.priceMin != null) count += 1;
    if (state.priceMax != null) count += 1;
    if (state.minRating != null) count += 1;
    if (state.sort !== "recent") count += 1;
    return count;
  }, [state]);

  const queryKey = useMemo(
    () =>
      JSON.stringify({
        q: state.query.trim(),
        dataset: state.dataset,
        category: state.category,
        brand: state.brand,
        model: state.model,
        sort: state.sort,
        priceMin: priceRange.min,
        priceMax: priceRange.max,
        rating: normalizedRating,
      }),
    [normalizedRating, priceRange.max, priceRange.min, state],
  );

  return {
    state,
    priceRange,
    normalizedRating,
    filtersCount,
    queryKey,
    setQuery,
    setDataset,
    setCategory,
    setBrand,
    setModel,
    setSort,
    setPriceRange,
    setMinRating,
    resetFilters,
  };
}

