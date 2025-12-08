import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";

import type { CategorySummary, ModelFacetMap, TaxonomyFacet } from "../data";
import type { Product } from "../types";

type CacheEntry = {
  items: Product[];
  categories: CategorySummary[];
  brandFacets: TaxonomyFacet[];
  modelFacets: ModelFacetMap;
  nextCursor: number | null;
  total: number;
};

type FetchArgs = { cursor?: number; append?: boolean; signal?: AbortSignal };

type Options = {
  initialItems: Product[];
  initialCategories: CategorySummary[];
  initialBrandFacets: TaxonomyFacet[];
  initialModelFacets: ModelFacetMap;
  initialNextCursor: number | null;
  initialTotalCount?: number | null;
  fetchError?: string | null;
  queryKey: string;
  buildQueryString: (cursor: number) => string;
};

export type UseProductsDataReturn = {
  items: Product[];
  categories: CategorySummary[];
  brandFacets: TaxonomyFacet[];
  modelFacets: ModelFacetMap;
  totalCount: number;
  nextCursor: number | null;
  hasMore: boolean;
  pageError: string | null;
  isFetchingPage: boolean;
  isFetchingMore: boolean;
  sentinelRef: RefObject<HTMLDivElement | null>;
  loadMore: () => void;
  retry: () => void;
};

function normalizeErrorMessage(error: unknown): string {
  const fallback = "Не удалось загрузить товары. Попробуйте обновить страницу.";
  let message =
    typeof error === "string"
      ? error
      : error instanceof Error && typeof error.message === "string"
        ? error.message
        : String(error ?? "");

  message = message.trim();

  if (/[<>]/.test(message)) {
    message = message
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " ");
  }

  const tokens = message.split(/\s+/);
  const classLike = tokens.filter((token) => /^[\w\-:[\]/.]+$/.test(token)).length;
  if (tokens.length > 8 && classLike / tokens.length > 0.6) {
    return fallback;
  }

  message = message.replace(/\\s+/g, " ").trim();
  if (!message) return fallback;
  return message.length > 220 ? `${message.slice(0, 220)}…` : message;
}

export function useProductsData({
  initialItems,
  initialCategories,
  initialBrandFacets,
  initialModelFacets,
  initialNextCursor,
  initialTotalCount,
  fetchError = null,
  queryKey,
  buildQueryString,
}: Options): UseProductsDataReturn {
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const initialKeyRef = useRef(queryKey);
  const [items, setItems] = useState<Product[]>(initialItems);
  const [categories, setCategories] = useState<CategorySummary[]>(initialCategories);
  const [brandFacets, setBrandFacets] = useState<TaxonomyFacet[]>(initialBrandFacets);
  const [modelFacets, setModelFacets] = useState<ModelFacetMap>(initialModelFacets);
  const [nextCursor, setNextCursor] = useState<number | null>(initialNextCursor);
  const [totalCount, setTotalCount] = useState<number>(initialTotalCount ?? initialItems.length);
  const [pageError, setPageError] = useState<string | null>(fetchError ? normalizeErrorMessage(fetchError) : null);
  const [isFetchingPage, setIsFetchingPage] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    cacheRef.current.set(initialKeyRef.current, {
      items: initialItems,
      categories: initialCategories,
      brandFacets: initialBrandFacets,
      modelFacets: initialModelFacets,
      nextCursor: initialNextCursor,
      total: initialTotalCount ?? initialItems.length,
    });
  }, [initialBrandFacets, initialCategories, initialItems, initialModelFacets, initialNextCursor, initialTotalCount]);

  useEffect(() => () => loadControllerRef.current?.abort(), []);

  const fetchPageRemote = useCallback(
    async ({ cursor = 0, append = false, signal }: FetchArgs) => {
      const qs = buildQueryString(cursor);
      const response = await fetch(`/api/catalog/products?${qs}`, {
        cache: "no-store",
        signal,
      });
      if (!response.ok) {
        const message = await response.text().catch(() => null);
        throw new Error(normalizeErrorMessage(message || `Failed to load products (${response.status})`));
      }
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.toLowerCase().includes("application/json")) {
        const text = await response.text().catch(() => "");
        throw new Error(normalizeErrorMessage(text || "Unexpected response format"));
      }
      const payload = await response.json();
      const incomingItems: Product[] = Array.isArray(payload?.items) ? (payload.items as Product[]) : [];
      const incomingCategories: CategorySummary[] = Array.isArray(payload?.categories)
        ? (payload.categories as CategorySummary[])
        : initialCategories;
      const incomingBrandFacets: TaxonomyFacet[] = Array.isArray(payload?.brandFacets)
        ? (payload.brandFacets as TaxonomyFacet[])
        : initialBrandFacets;
      const incomingModelFacets: ModelFacetMap =
        payload?.modelFacets && typeof payload.modelFacets === "object"
          ? (payload.modelFacets as ModelFacetMap)
          : initialModelFacets;
      const payloadError: string | null = typeof payload?.error === "string" && payload.error.trim() ? payload.error : null;
      let next = payload?.nextCursor ?? null;
      if (typeof next === "number" && Number.isFinite(next)) {
        next = Number(next);
      } else {
        next = null;
      }

      let newItems: Product[] = [];
      setItems((prev) => {
        newItems = append ? [...prev, ...incomingItems] : incomingItems;
        return newItems;
      });

      const newTotal =
        typeof payload?.total === "number" && Number.isFinite(payload.total) ? Number(payload.total) : newItems.length;

      setCategories(incomingCategories);
      setBrandFacets(incomingBrandFacets);
      setModelFacets(incomingModelFacets);
      setNextCursor(next);
      setTotalCount(newTotal);
      setPageError(payloadError);

      cacheRef.current.set(queryKey, {
        items: newItems,
        categories: incomingCategories,
        brandFacets: incomingBrandFacets,
        modelFacets: incomingModelFacets,
        nextCursor: next,
        total: newTotal,
      });
    },
    [buildQueryString, initialBrandFacets, initialCategories, initialModelFacets, queryKey],
  );

  useEffect(() => {
    const cached = cacheRef.current.get(queryKey);
    if (cached) {
      setItems(cached.items);
      setCategories(cached.categories);
      setBrandFacets(cached.brandFacets);
      setModelFacets(cached.modelFacets);
      setNextCursor(cached.nextCursor);
      setTotalCount(cached.total);
      setPageError(null);
      return;
    }

    const controller = new AbortController();
    setIsFetchingPage(true);
    setPageError(null);

    fetchPageRemote({ cursor: 0, append: false, signal: controller.signal })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setPageError(normalizeErrorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsFetchingPage(false);
        }
      });

    return () => controller.abort();
  }, [fetchPageRemote, queryKey]);

  const hasMore = useMemo(() => nextCursor !== null, [nextCursor]);

  const loadMore = useCallback(() => {
    if (isFetchingMore || nextCursor == null) return;
    const controller = new AbortController();
    loadControllerRef.current?.abort();
    loadControllerRef.current = controller;
    setIsFetchingMore(true);
    fetchPageRemote({ cursor: nextCursor, append: true, signal: controller.signal })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setPageError(normalizeErrorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsFetchingMore(false);
        }
        loadControllerRef.current = null;
      });
  }, [fetchPageRemote, isFetchingMore, nextCursor]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          if (nextCursor != null) {
            loadMore();
          }
        });
      },
      { rootMargin: "160px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, nextCursor]);

  const retry = useCallback(() => {
    const controller = new AbortController();
    setIsFetchingPage(true);
    setPageError(null);
    fetchPageRemote({ cursor: 0, append: false, signal: controller.signal })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setPageError(normalizeErrorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsFetchingPage(false);
        }
      });
  }, [fetchPageRemote]);

  return {
    items,
    categories,
    brandFacets,
    modelFacets,
    totalCount,
    nextCursor,
    hasMore,
    pageError,
    isFetchingPage,
    isFetchingMore,
    sentinelRef,
    loadMore,
    retry,
  };
}
