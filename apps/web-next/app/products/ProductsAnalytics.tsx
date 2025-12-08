import { useEffect, useRef } from "react";

import { track } from "@shared/lib/analytics";

import { logRecEvent } from "@/lib/recs-events";

import type { DatasetType, SortMode } from "./filter-config";
import type { Product } from "./types";

type FiltersAnalytics = {
  dataset: DatasetType;
  category: string;
  brand: string;
  model: string;
  sort: SortMode;
  priceMin: number | null;
  priceMax: number | null;
  rating: number | null;
  query: string;
  filtersCount: number;
};

type ProductsAnalyticsProps = {
  filters: FiltersAnalytics;
  productById: Map<string, Product>;
  recMetaById: Map<string, Product["recMeta"]>;
  resolvePriceCents: (productId: string | undefined) => number | undefined;
  displayedDeps: unknown[];
  debugInfo?: {
    activeCategory: string;
    activeBrand: string;
    activeModel: string;
    brandOptions: Array<{ value: string; count: number; label: string }>;
    modelOptions: Array<{ value: string; count: number; label: string }>;
    items: Product[];
  };
};

export function ProductsAnalytics({
  filters,
  productById,
  recMetaById,
  resolvePriceCents,
  displayedDeps,
  debugInfo,
}: ProductsAnalyticsProps) {
  const hasTrackedFiltersRef = useRef(false);
  const impressionLogged = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!hasTrackedFiltersRef.current) {
      hasTrackedFiltersRef.current = true;
      return;
    }
    track("filters:changed", {
      dataset: filters.dataset,
      category: filters.category,
      brand: filters.brand,
      model: filters.model,
      sort: filters.sort,
      priceMin: filters.priceMin,
      priceMax: filters.priceMax,
      rating: filters.rating,
      query: filters.query.trim() || undefined,
      filtersCount: filters.filtersCount,
    });
  }, [
    filters.brand,
    filters.category,
    filters.dataset,
    filters.filtersCount,
    filters.model,
    filters.priceMax,
    filters.priceMin,
    filters.query,
    filters.rating,
    filters.sort,
  ]);

  useEffect(() => {
    const gridEl = document.querySelector("[data-product-grid=\"catalog\"]");
    if (!gridEl || !recMetaById.size) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const target = entry.target as HTMLElement;
          const productId = target.dataset.productId;
          if (!productId) {
            observer.unobserve(target);
            return;
          }
          const meta = recMetaById.get(productId);
          if (!meta) {
            observer.unobserve(target);
            return;
          }
          const key = `${productId}:${meta.treatment ?? "control"}:${meta.rank ?? "na"}`;
          if (impressionLogged.current.has(key)) {
            observer.unobserve(target);
            return;
          }
          impressionLogged.current.add(key);
          const product = productById.get(productId);
          void logRecEvent({
            event: "impression",
            productId,
            category: product?.categorySlug ?? undefined,
            priceCents: resolvePriceCents(productId),
            metadata: {
              placement: "catalog",
              source: "catalog_mix",
              treatment: meta.treatment ?? "control",
              rank: meta.rank ?? null,
              reason: meta.reason ?? null,
              adjusted_score: meta.adjusted_score ?? null,
              bandit_from: meta.bandit_from ?? null,
              rollout: meta.rollout ?? null,
            },
          });
        });
      },
      { rootMargin: "120px 0px 120px 0px", threshold: 0.35 },
    );

    const elements = Array.from(gridEl.querySelectorAll<HTMLElement>("[data-product-id]"));
    elements.forEach((el) => {
      const productId = el.dataset.productId;
      if (productId && recMetaById.has(productId)) {
        observer.observe(el);
      }
    });

    return () => observer.disconnect();
  }, [displayedDeps, productById, recMetaById, resolvePriceCents]);

  useEffect(() => {
    const gridEl = document.querySelector("[data-product-grid=\"catalog\"]");
    if (!gridEl || !recMetaById.size) return;

    const handleClick = (event: Event) => {
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-product-id]");
      if (!target) return;
      const productId = target.dataset.productId;
      if (!productId) return;
      const meta = recMetaById.get(productId);
      if (!meta) return;
      const product = productById.get(productId);
      void logRecEvent({
        event: "click",
        productId,
        category: product?.categorySlug ?? undefined,
        priceCents: resolvePriceCents(productId),
        metadata: {
          placement: "catalog",
          source: "catalog_mix",
          treatment: meta.treatment ?? "control",
          rank: meta.rank ?? null,
          reason: meta.reason ?? null,
          adjusted_score: meta.adjusted_score ?? null,
          bandit_from: meta.bandit_from ?? null,
          rollout: meta.rollout ?? null,
        },
      });
    };

    gridEl.addEventListener("click", handleClick, true);
    return () => gridEl.removeEventListener("click", handleClick, true);
  }, [productById, recMetaById, resolvePriceCents]);

  useEffect(() => {
    if (!debugInfo || process.env.NODE_ENV === "production") return;
    console.log("[filters-debug]", {
      activeCategory: debugInfo.activeCategory,
      activeBrand: debugInfo.activeBrand,
      activeModel: debugInfo.activeModel,
      brandOptionsCount: debugInfo.brandOptions.length,
      modelOptionsCount: debugInfo.modelOptions.length,
      brandSample: debugInfo.brandOptions.slice(0, 3),
      modelSample: debugInfo.modelOptions.slice(0, 3),
      firstProduct: debugInfo.items[0]
        ? {
            id: debugInfo.items[0].id,
            brand: debugInfo.items[0].brand,
            brandSlug: debugInfo.items[0].brandSlug,
            brandName: debugInfo.items[0].brandName,
            model: debugInfo.items[0].model,
            modelSlug: debugInfo.items[0].modelSlug,
            modelTitle: debugInfo.items[0].modelTitle,
            catalogProductId: debugInfo.items[0].catalogProductId,
          }
        : null,
    });
  }, [debugInfo]);

  return null;
}
