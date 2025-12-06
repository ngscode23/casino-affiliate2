"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sanitizeSearchParam } from "@shared/lib/sanitize";
import { track } from "@shared/lib/analytics";

export type SearchSuggestion = {
  id: string;
  label: string;
  href: string;
  description?: string | null;
};

export type SearchSuggestItemDto = {
  id?: string | null;
  slug?: string | null;
  label?: string | null;
  name?: string | null;
  category?: string | null;
  category_slug?: string | null;
};

type SearchSuggestResponseDto = {
  items?: SearchSuggestItemDto[] | null;
};

type Options = {
  debounceMs?: number;
  minLength?: number;
};

export function mapSuggestDtoToSuggestion(dto: SearchSuggestItemDto): SearchSuggestion {
  const slug = typeof dto.slug === "string" ? dto.slug : "";
  const title =
    typeof dto.label === "string"
      ? dto.label
      : typeof dto.name === "string"
        ? dto.name
        : slug || "Product";
  const id =
    typeof dto.id === "string" && dto.id
      ? dto.id
      : slug || title || Math.random().toString(36).slice(2);
  const description =
    typeof dto.category === "string"
      ? dto.category
      : typeof dto.category_slug === "string"
        ? dto.category_slug
        : null;

  return {
    id,
    label: title,
    href: slug ? `/products/${encodeURIComponent(slug)}` : "/products",
    description,
  };
}

/**
 * Хук для подсказок поиска с дебаунсом и отменой запросов.
 * Возвращает список подсказок, состояние загрузки и выделенный элемент для клавиатурной навигации.
 */
export function useSearchSuggestions(query: string, options: Options = {}) {
  const debounceMs = options.debounceMs ?? 200;
  const minLength = options.minLength ?? 2;

  const normalizedQuery = useMemo(() => sanitizeSearchParam(query)?.trim() ?? "", [query]);

  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);
  const lastNoResultsQuery = useRef<string | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setSuggestions([]);
    setHighlightedIndex(-1);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (normalizedQuery.length < minLength) {
      reset();
      return;
    }

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    timerRef.current = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: normalizedQuery, limit: "5" });
        const response = await fetch(`/api/catalog/search-suggest?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`suggestions: ${response.status}`);
        }
        const payload = (await response.json()) as SearchSuggestResponseDto;
        const items = Array.isArray(payload?.items) ? payload.items : [];

        const mapped: SearchSuggestion[] = items.slice(0, 6).map(mapSuggestDtoToSuggestion);

        const isEmpty = mapped.length === 0;
        setSuggestions(mapped);
        setHighlightedIndex(mapped.length ? 0 : -1);
        if (isEmpty && normalizedQuery) {
          if (lastNoResultsQuery.current !== normalizedQuery) {
            track("search:no_results", { query: normalizedQuery });
            lastNoResultsQuery.current = normalizedQuery;
          }
        } else if (mapped.length) {
          lastNoResultsQuery.current = null;
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.warn("useSearchSuggestions: failed", error);
          setSuggestions([]);
          setHighlightedIndex(-1);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, debounceMs);

    return () => {
      controller.abort();
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [normalizedQuery, debounceMs, minLength, reset]);

  const moveHighlight = useCallback(
    (delta: 1 | -1) => {
      setHighlightedIndex((prev) => {
        const count = suggestions.length;
        if (count === 0) return -1;
        const next = prev === -1 ? (delta === 1 ? 0 : count - 1) : (prev + delta + count) % count;
        return next;
      });
    },
    [suggestions.length],
  );

  const activeId =
    highlightedIndex >= 0 && highlightedIndex < suggestions.length
      ? `search-suggestion-${suggestions[highlightedIndex].id}`
      : undefined;

  return {
    suggestions,
    isLoading,
    highlightedIndex,
    activeId,
    setHighlightedIndex,
    moveHighlight,
    reset,
  };
}

export default useSearchSuggestions;
