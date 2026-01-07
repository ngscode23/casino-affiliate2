import { useCallback, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";

import {
  DEFAULT_FILTER_STATE,
  type DatasetType,
  type SortMode,
  type ProductFilterState,
  hasFilterParams,
  isDefaultFilterState,
  normalizeFilterState,
  parseFilterState,
  serializeFilterState,
} from "@/app/products/filter-schema";
import { useUrlSearchState } from "./useUrlSearchState";

export type ProductsSearchState = ProductFilterState;

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

export function useProductsSearchState(options: UseProductsSearchStateOptions): UseProductsSearchStateReturn {
  const storageKey = options.storageKey ?? DEFAULT_STORAGE_KEY;
  const urlParams = useSearchParams();

  const defaultState = useMemo<ProductsSearchState>(
    () =>
      normalizeFilterState({
        ...DEFAULT_FILTER_STATE,
        query: options.initialQuery ?? DEFAULT_FILTER_STATE.query,
        dataset: options.initialDataset ?? DEFAULT_FILTER_STATE.dataset,
        category: options.initialCategory ?? DEFAULT_FILTER_STATE.category,
        brand: options.initialBrand ?? DEFAULT_FILTER_STATE.brand,
        model: options.initialModel ?? DEFAULT_FILTER_STATE.model,
        sort: options.initialSort ?? DEFAULT_FILTER_STATE.sort,
        priceMin: options.initialPriceMin ?? DEFAULT_FILTER_STATE.priceMin,
        priceMax: options.initialPriceMax ?? DEFAULT_FILTER_STATE.priceMax,
        minRating: options.initialMinRating ?? DEFAULT_FILTER_STATE.minRating,
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
    () => !isDefaultFilterState(defaultState),
    [defaultState],
  );

  const parseSearchParams = useCallback(
    (params: URLSearchParams) => {
      return parseFilterState(params, defaultState);
    },
    [defaultState],
  );

  const serializeState = useCallback(
    (value: ProductsSearchState) => serializeFilterState(normalizeFilterState(value)),
    [],
  );

  const { state, setState, update } = useUrlSearchState<ProductsSearchState>({
    initialState: defaultState,
    parse: parseSearchParams,
    serialize: serializeState,
    mode: "replace",
  });
  const restoredFromSession = useRef(false);
  const hasUrlFilters = useMemo(() => hasFilterParams(urlParams ?? undefined), [urlParams]);

  useEffect(() => {
    if (restoredFromSession.current) return;
    if (hasUrlFilters) return;
    if (hasExplicitInitialFilters) return;
    try {
      const raw = typeof window !== "undefined" ? window.sessionStorage.getItem(storageKey) : null;
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;
      const next = normalizeFilterState({
        ...state,
        ...parsed,
      });
      restoredFromSession.current = true;
      update(next, { mode: "replace" });
    } catch {
      /* ignore */
    }
  }, [hasExplicitInitialFilters, hasUrlFilters, state, storageKey, update]);

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
      const next = normalizeFilterState({
        ...prev,
        priceMin: value.min,
        priceMax: value.max,
      });
      return { ...prev, priceMin: next.priceMin, priceMax: next.priceMax };
    });
  }, [setState]);

  const setMinRating = useCallback((value: number | null) => {
    setState((prev) => ({
      ...prev,
      minRating: normalizeFilterState({ ...prev, minRating: value }).minRating,
    }));
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
    const normalized = normalizeFilterState(state);
    return { min: normalized.priceMin, max: normalized.priceMax };
  }, [state]);

  const normalizedRating = useMemo(
    () => normalizeFilterState(state).minRating,
    [state],
  );

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

