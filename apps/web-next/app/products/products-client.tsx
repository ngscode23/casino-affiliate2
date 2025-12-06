"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

import { ProductGrid, ProductSkeleton, PRODUCT_GRID_LAYOUTS } from "@/components/ProductGrid";
import type { ProductGridItem } from "@/components/ProductGrid";
import type { Product } from "./types";
import type { CategorySummary } from "./data";
import { formatPrice } from "./utils";
import { logRecEvent } from "@/lib/recs-events";
import FilterSidebar, { type FilterSidebarProps, type TaxonomyOption } from "./FilterSidebar";
import { DATASET_LABELS, DatasetType, SortMode } from "./filter-config";
import RevealOnScroll from "@/components/animation/RevealOnScroll";
import CatalogProductCarousel from "@/components/CatalogProductCarousel";
import { useProductsSearchState } from "./useProductsSearchState";
import { ProductFilterToolbar } from "./ProductFilterToolbar";
import { ProductListShell } from "./ProductListShell";
import { ProductPagination } from "./ProductPagination";

type LayoutMode = "grid" | "single" | "masonry";
const CHUNK_SIZE = 8; // fewer above-the-fold items for faster LCP on mobile
const PAGE_SIZE = 24;
const CAROUSEL_MAX_ITEMS = 16;
type ProductGridStyle = CSSProperties & {
  "--vc-grid-max-width"?: string;
  "--vc-grid-max-width-desktop"?: string;
  "--vc-card-min-width"?: string;
  "--vc-card-width"?: string;
  "--vc-grid-row-gap"?: string;
  "--vc-grid-column-gap"?: string;
};
const GRID_SURFACE_CLASS_LIGHT =
  "w-full min-w-0 rounded-[32px] border border-gray-200/80 bg-white/95 px-4 py-6 shadow-[0_32px_80px_-48px_rgba(15,23,42,0.35)] sm:px-8 sm:py-10";
const GRID_SURFACE_CLASS_DARK =
  "w-full min-w-0 rounded-[32px] border border-white/12 bg-white/5 px-4 py-6 shadow-[0_40px_120px_-60px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:px-8 sm:py-10";
const GRID_STYLE: ProductGridStyle = {
  "--vc-grid-max-width": "1480px",
  "--vc-grid-max-width-desktop": "1480px",
  "--vc-card-min-width": "260px",
  "--vc-card-width": "360px",
  "--vc-grid-row-gap": "36px",
  "--vc-grid-column-gap": "24px",
};

function priceValue(product: Product): number {
  if (typeof product.priceCents === "number" && Number.isFinite(product.priceCents)) {
    return product.priceCents;
  }
  if (typeof product.price === "number" && Number.isFinite(product.price)) {
    return Math.round(product.price * 100);
  }
  return 0;
}

const sortComparators: Record<SortMode, (a: Product, b: Product) => number> = {
  recent: (a, b) => a.order - b.order,
  popular: (a, b) => (b.clicks || 0) - (a.clicks || 0) || (b.impressions || 0) - (a.impressions || 0),
  "price-asc": (a, b) => priceValue(a) - priceValue(b),
  "price-desc": (a, b) => priceValue(b) - priceValue(a),
  impressions: (a, b) => (b.impressions || 0) - (a.impressions || 0),
};

function datasetLabel(dataset: DatasetType | Product["dataset"]): string {
  if (dataset && dataset in DATASET_LABELS) {
    return DATASET_LABELS[dataset as DatasetType];
  }
  return "All products";
}

const skeletonLayoutClass: Record<LayoutMode, string> = {
  single: PRODUCT_GRID_LAYOUTS.single,
  masonry: PRODUCT_GRID_LAYOUTS.masonry,
  grid: PRODUCT_GRID_LAYOUTS.grid,
};

const skeletonItemWrapperClass: Record<LayoutMode, string> = {
  single: "h-full",
  masonry: "h-full",
  grid: "h-full",
};

export default function ProductsClient({
  products: initialProducts,
  categories: initialCategories,
  catalogName,
  initialLayout = "grid",
  initialQuery = "",
  initialCategory = "all",
  initialDataset = "all",
  initialSort = "recent",
  initialPriceMin = null,
  initialPriceMax = null,
  initialMinRating = null,
  initialBrand = "all",
  initialModel = "all",
  totalAvailable,
  initialNextCursor = null,
  fetchError = null,
}: {
  products: Product[];
  categories: CategorySummary[];
  catalogName: string;
  initialLayout?: LayoutMode;
  initialQuery?: string;
  initialCategory?: string;
  initialDataset?: DatasetType;
  initialSort?: SortMode;
  initialPriceMin?: number | null;
  initialPriceMax?: number | null;
  initialMinRating?: number | null;
  initialBrand?: string;
  initialModel?: string;
  totalAvailable?: number | null;
  initialNextCursor?: number | null;
  fetchError?: string | null;
}) {
  const normalizedInitialQuery = (initialQuery ?? "").trim();
  const normalizedInitialCategory = useMemo(() => {
    if (!initialCategory) return "all";
    return initialCategories.some((category) => category.slug === initialCategory) ? initialCategory : "all";
  }, [initialCategories, initialCategory]);
  const normalizedInitialBrand = useMemo(() => {
    if (!initialBrand) return "all";
    return initialBrand.trim().toLowerCase() || "all";
  }, [initialBrand]);
  const normalizedInitialModel = useMemo(() => {
    if (!initialModel) return "all";
    return initialModel.trim().toLowerCase() || "all";
  }, [initialModel]);
  const normalizedInitialDataset: DatasetType = useMemo(() => {
    if (initialDataset === "shop") return "shop";
    return "all";
  }, [initialDataset]);

  const availabilityLabelMap = useMemo(
    () =>
      new Map<Product["availability"], string>([
        ["InStock", "In stock"],
        ["OutOfStock", "Out of stock"],
        ["PreOrder", "Pre-order"],
      ]),
    [],
  );

  const normalizedPriceMin =
    typeof initialPriceMin === "number" && Number.isFinite(initialPriceMin) && initialPriceMin >= 0 ? Number(initialPriceMin) : null;
  const normalizedPriceMax =
    typeof initialPriceMax === "number" && Number.isFinite(initialPriceMax) && initialPriceMax >= 0 ? Number(initialPriceMax) : null;
  const normalizedMinRating =
    typeof initialMinRating === "number" && Number.isFinite(initialMinRating) && initialMinRating > 0 ? Number(initialMinRating) : null;
  const {
    state: filters,
    priceRange,
    normalizedRating,
    queryKey,
    filtersCount: activeFiltersCount,
    setQuery,
    setDataset,
    setCategory,
    setBrand,
    setModel,
    setSort,
    setPriceRange,
    setMinRating,
    resetFilters,
  } = useProductsSearchState({
    initialQuery: normalizedInitialQuery,
    initialDataset: normalizedInitialDataset,
    initialCategory: normalizedInitialCategory,
    initialBrand: normalizedInitialBrand,
    initialModel: normalizedInitialModel,
    initialSort: initialSort,
    initialPriceMin: normalizedPriceMin,
    initialPriceMax: normalizedPriceMax,
    initialMinRating: normalizedMinRating,
  });
  const {
    query: activeQuery,
    dataset: activeDataset,
    category: activeCategory,
    brand: activeBrand,
    model: activeModel,
    sort: activeSort,
    priceMin,
    priceMax,
    minRating,
  } = filters;
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [items, setItems] = useState<Product[]>(initialProducts);
  const [categoriesState, setCategoriesState] = useState<CategorySummary[]>(initialCategories);
  const [nextCursor, setNextCursor] = useState<number | null>(initialNextCursor);
  const [totalCount, setTotalCount] = useState<number>(totalAvailable ?? initialProducts.length);
  const [pageError, setPageError] = useState<string | null>(fetchError ?? null);
  const [isFetchingPage, setIsFetchingPage] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const cacheRef = useRef<
    Map<
      string,
      { items: Product[]; nextCursor: number | null; total: number; categories: CategorySummary[] }
    >
  >(new Map());

  const [visible, setVisible] = useState(CHUNK_SIZE);
  const [hydrated, setHydrated] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const impressionLogged = useRef<Set<string>>(new Set());

  const numberFormatter = useMemo(() => new Intl.NumberFormat("en-US"), []);

  const buildQueryString = useCallback(
    (cursorValue: number) => {
      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      params.set("cursor", String(Math.max(0, cursorValue)));
      if (activeDataset !== "all") params.set("dataset", activeDataset);
      if (activeCategory !== "all") params.set("category", activeCategory);
      if (activeBrand !== "all") params.set("brand", activeBrand);
      if (activeModel !== "all") params.set("model", activeModel);
      if (activeSort !== "recent") params.set("sort", activeSort);
      if (priceRange.min != null) params.set("price_min", String(priceRange.min));
      if (priceRange.max != null) params.set("price_max", String(priceRange.max));
      if (normalizedRating != null) params.set("rating_min", String(normalizedRating));
      const trimmedQuery = activeQuery.trim();
      if (trimmedQuery) params.set("q", trimmedQuery);
      return params.toString();
    },
    [
      activeBrand,
      activeCategory,
      activeDataset,
      activeModel,
      activeQuery,
      activeSort,
      normalizedRating,
      priceRange.max,
      priceRange.min,
    ],
  );

  const fetchPageRemote = useCallback(
    async ({ cursor = 0, append = false, signal }: { cursor?: number; append?: boolean; signal?: AbortSignal }) => {
      const qs = buildQueryString(cursor);
      const response = await fetch(`/api/catalog/products?${qs}`, {
        cache: "no-store",
        signal,
      });
      if (!response.ok) {
        const message = await response.text().catch(() => null);
        throw new Error(message || `Failed to load products (${response.status})`);
      }
      const payload = await response.json();
      const incomingItems: Product[] = Array.isArray(payload?.items) ? (payload.items as Product[]) : [];
      const incomingCategories: CategorySummary[] = Array.isArray(payload?.categories)
        ? (payload.categories as CategorySummary[])
        : initialCategories;
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
      setTotalCount(newTotal);
      setCategoriesState(incomingCategories);
      setNextCursor(next);
      setPageError(null);
      cacheRef.current.set(queryKey, {
        items: newItems,
        nextCursor: next,
        total: newTotal,
        categories: incomingCategories,
      });
    },
    [buildQueryString, initialCategories, queryKey],
  );

  useEffect(() => {
    setVisible(CHUNK_SIZE);
    const cached = cacheRef.current.get(queryKey);
    if (cached) {
      setItems(cached.items);
      setNextCursor(cached.nextCursor);
      setTotalCount(cached.total);
      setCategoriesState(cached.categories);
      setPageError(null);
      return;
    }

    const controller = new AbortController();
    setIsFetchingPage(true);
    setPageError(null);

    fetchPageRemote({ cursor: 0, append: false, signal: controller.signal })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setPageError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsFetchingPage(false);
        }
      });

    return () => controller.abort();
  }, [fetchPageRemote, queryKey]);

  useEffect(() => {
    setVisible(items.length);
  }, [items.length]);

  const productById = useMemo(() => {
    const map = new Map<string, Product>();
    for (const product of items) {
      map.set(product.id, product);
    }
    return map;
  }, [items]);

  const recMetaById = useMemo(() => {
    const map = new Map<string, Product["recMeta"]>();
    for (const product of items) {
      if (product.recMeta) {
        map.set(product.id, product.recMeta);
      }
    }
    return map;
  }, [items]);

  const variantCountByCatalogId = useMemo(() => {
    const map = new Map<string, number>();
    for (const product of items) {
      if (product.catalogProductId) {
        const key = product.catalogProductId;
        map.set(key, (map.get(key) ?? 0) + 1);
      }
    }
    return map;
  }, [items]);

  const resolvePriceCents = useCallback(
    (productId: string | undefined) => {
      if (!productId) return undefined;
      const product = productById.get(productId);
      if (!product) return undefined;
      if (typeof product.priceCents === "number" && Number.isFinite(product.priceCents)) return product.priceCents;
      if (typeof product.price === "number" && Number.isFinite(product.price)) return Math.round(product.price * 100);
      return undefined;
    },
    [productById],
  );

  const topCategoryLinks = useMemo(() => categoriesState.slice(0, 3), [categoriesState]);
  const datasetLabelText = activeDataset === "all" ? "All products" : datasetLabel(activeDataset);

  const resetVisibleToFirstChunk = useCallback(() => {
    setVisible(CHUNK_SIZE);
  }, []);

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      resetVisibleToFirstChunk();
    },
    [resetVisibleToFirstChunk, setQuery],
  );

  const handleDatasetChange = useCallback(
    (value: DatasetType) => {
      if (value === activeDataset) return;
      setDataset(value);
      resetVisibleToFirstChunk();
    },
    [activeDataset, resetVisibleToFirstChunk, setDataset],
  );

  const handleCategoryChange = useCallback(
    (value: string) => {
      setCategory(value);
      setBrand("all");
      setModel("all");
      resetVisibleToFirstChunk();
    },
    [resetVisibleToFirstChunk, setBrand, setCategory, setModel],
  );

  const handleBrandChange = useCallback(
    (value: string) => {
      setBrand(value);
      setModel("all");
      resetVisibleToFirstChunk();
    },
    [resetVisibleToFirstChunk, setBrand, setModel],
  );

  const handleModelChange = useCallback(
    (value: string) => {
      setModel(value);
      resetVisibleToFirstChunk();
    },
    [resetVisibleToFirstChunk, setModel],
  );

  const handleSortChange = useCallback(
    (value: SortMode) => {
      setSort(value);
      resetVisibleToFirstChunk();
    },
    [resetVisibleToFirstChunk, setSort],
  );

  const handlePriceMinChange = useCallback(
    (value: number | null) => {
      setPriceRange({ min: value, max: priceRange.max });
      resetVisibleToFirstChunk();
    },
    [priceRange.max, resetVisibleToFirstChunk, setPriceRange],
  );

  const handlePriceMaxChange = useCallback(
    (value: number | null) => {
      setPriceRange({ min: priceRange.min, max: value });
      resetVisibleToFirstChunk();
    },
    [priceRange.min, resetVisibleToFirstChunk, setPriceRange],
  );

  const handleRatingChange = useCallback(
    (value: number | null) => {
      setMinRating(value);
      resetVisibleToFirstChunk();
    },
    [resetVisibleToFirstChunk, setMinRating],
  );

  const handleResetFilters = useCallback(() => {
    resetFilters();
    resetVisibleToFirstChunk();
  }, [resetFilters, resetVisibleToFirstChunk]);

  const handleHardReset = useCallback(() => {
    resetFilters({ method: "push" });
    setVisible(CHUNK_SIZE);
  }, [resetFilters]);

  const filtered = useMemo(() => items, [items]);
  const displayed = filtered;
  const hasMore = useMemo(() => nextCursor !== null, [nextCursor]);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const loadMore = useCallback(() => {
    if (isFetchingMore || nextCursor == null) return;
    const controller = new AbortController();
    setIsFetchingMore(true);
    fetchPageRemote({ cursor: nextCursor, append: true, signal: controller.signal })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setPageError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsFetchingMore(false);
        }
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

  const mapProductToGridItem = useCallback(
    (product: Product): ProductGridItem => {
      const priceValue = Number(product.price ?? 0);
      const badge = product.isNew ? "New" : product.isTop ? "Popular" : null;
      const rawDiscountPercent =
        typeof product.discountPercent === "number" && product.discountPercent > 0 ? product.discountPercent : null;
      const discountPercent =
        rawDiscountPercent != null && rawDiscountPercent > 0 ? Math.round(rawDiscountPercent) : null;
      let originalPrice: string | null = null;
      if (rawDiscountPercent && rawDiscountPercent > 0 && rawDiscountPercent < 100 && priceValue > 0) {
        const base = priceValue / (1 - rawDiscountPercent / 100);
        if (Number.isFinite(base) && base > priceValue) {
          originalPrice = formatPrice(base, product.currency);
        }
      }
      if (!originalPrice) {
        const rawOriginal = typeof product.originalPrice === "number" ? product.originalPrice : null;
        if (typeof rawOriginal === "number" && rawOriginal > priceValue) {
          originalPrice = formatPrice(rawOriginal, product.currency);
        }
        const rawOriginalCents = typeof product.originalPriceCents === "number" ? product.originalPriceCents : null;
        if (!originalPrice && typeof rawOriginalCents === "number" && rawOriginalCents > priceValue * 100) {
          originalPrice = formatPrice(rawOriginalCents / 100, product.currency);
        }
      }
      const availabilityLabel = availabilityLabelMap.get(product.availability) ?? null;
      const statsLabel =
        product.clicks || product.impressions
          ? numberFormatter.format(product.clicks || 0) + " clicks • " + numberFormatter.format(product.impressions || 0) + " views"
          : null;
      const categoryLabel = product.categorySlug ? humanize(product.categorySlug) : null;
      const metaParts = [categoryLabel, statsLabel].filter(Boolean);
      const meta = metaParts.length ? metaParts.join(" • ") : null;
      return {
        id: product.id,
        slug: product.slug,
        title: product.title,
        subtitle: product.description,
        image: product.mainImage,
        price: priceValue > 0 ? formatPrice(priceValue, product.currency) : null,
        originalPrice,
        badge,
        meta,
        availability: product.availability,
        availabilityLabel,
        variantCount:
          product.catalogProductId && variantCountByCatalogId.has(product.catalogProductId)
            ? variantCountByCatalogId.get(product.catalogProductId)
            : null,
        variantLabel: product.modelTitle ?? product.model ?? null,
        recMeta: product.recMeta,
      };
    },
    [availabilityLabelMap, numberFormatter, variantCountByCatalogId],
  );

  const gridItems = useMemo(() => displayed.map(mapProductToGridItem), [displayed, mapProductToGridItem]);

  const carouselItems = useMemo(
    () => filtered.slice(0, CAROUSEL_MAX_ITEMS).map(mapProductToGridItem),
    [filtered, mapProductToGridItem],
  );

  const carouselCaption = useMemo(() => {
    const total = filtered.length;
    if (!total) return null;
    return `${total} ${total === 1 ? "product" : "products"} in this selection`;
  }, [filtered.length]);

  const carouselHeading = useMemo(
    () => (filtered.length > 1 ? "Browse this selection" : "Selected product"),
    [filtered.length],
  );

  const carouselEyebrow = useMemo(
    () => (activeCategory !== "all" ? humanize(activeCategory) : datasetLabelText),
    [activeCategory, datasetLabelText],
  );

  const hasCatalogLinks = useMemo(() => items.some((p) => Boolean(p.catalogProductId)), [items]);

  const brandOptions = useMemo<TaxonomyOption[]>(() => {
    const counts = new Map<string, { count: number; label: string }>();
    for (const product of items) {
      if (!productMatchesCategory(product, activeCategory)) continue;
      const key = normalizeTaxonomyValue(product.brandSlug ?? product.brand ?? product.brandName);
      if (!key) continue;
      const label = product.brandName?.trim() || taxonomyLabelFromValue(key);
      const existing = counts.get(key);
      counts.set(key, {
        count: (existing?.count ?? 0) + 1,
        label: existing?.label ?? label,
      });
    }
    return Array.from(counts.entries())
      .map(([value, entry]) => ({
        value,
        count: entry.count,
        label: entry.label || taxonomyLabelFromValue(value),
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [activeCategory, items]);

  const modelOptions = useMemo<TaxonomyOption[]>(() => {
    if (activeBrand === "all") return [];
    const counts = new Map<string, { count: number; label: string }>();
    for (const product of items) {
      if (!productMatchesCategory(product, activeCategory)) continue;
      if (!matchesBrand(product, activeBrand)) continue;
      const key = normalizeTaxonomyValue(product.modelSlug ?? product.model ?? product.modelTitle);
      if (!key) continue;
      const label = product.modelTitle?.trim() || taxonomyLabelFromValue(key);
      const existing = counts.get(key);
      counts.set(key, {
        count: (existing?.count ?? 0) + 1,
        label: existing?.label ?? label,
      });
    }
    return Array.from(counts.entries())
      .map(([value, entry]) => ({
        value,
        count: entry.count,
        label: entry.label || taxonomyLabelFromValue(value),
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [activeBrand, activeCategory, items]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    console.log("[filters-debug]", {
      activeCategory,
      activeBrand,
      activeModel,
      brandOptionsCount: brandOptions.length,
      modelOptionsCount: modelOptions.length,
      brandSample: brandOptions.slice(0, 3),
      modelSample: modelOptions.slice(0, 3),
      firstProduct: items[0]
        ? {
            id: items[0].id,
            brand: items[0].brand,
            brandSlug: items[0].brandSlug,
            brandName: items[0].brandName,
            model: items[0].model,
            modelSlug: items[0].modelSlug,
            modelTitle: items[0].modelTitle,
            catalogProductId: items[0].catalogProductId,
          }
        : null,
    });
  }, [activeBrand, activeCategory, activeModel, brandOptions, modelOptions, items]);

  useEffect(() => {
    if (activeBrand === "all") return;
    const exists = brandOptions.some((option) => option.value === activeBrand);
    if (!exists) {
      setBrand("all");
      setModel("all");
    }
  }, [activeBrand, brandOptions, setBrand, setModel]);

  useEffect(() => {
    if (activeModel === "all") return;
    const exists = modelOptions.some((option) => option.value === activeModel);
    if (!exists) {
      setModel("all");
    }
  }, [activeModel, modelOptions, setModel]);

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
  }, [displayed, productById, recMetaById, resolvePriceCents]);

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

  const showSkeleton = !hydrated || isFetchingPage;
  const skeletonCount = showSkeleton ? Math.max(displayed.length, 8) : 0;
  const layoutMode: LayoutMode = initialLayout;
  const visibleCount = visible;
  const hasError = Boolean(pageError);

  type ThemeMode = "light" | "dark";
  const [theme, setTheme] = useState<ThemeMode>("dark");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("catalog-theme");
      if (stored === "light" || stored === "dark") {
        setTheme(stored);
        return;
      }
      const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(prefersDark ? "dark" : "light");
    } catch {
      setTheme("dark");
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: ThemeMode = prev === "dark" ? "light" : "dark";
      try {
        window.localStorage.setItem("catalog-theme", next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const gridSurfaceClass = theme === "dark" ? GRID_SURFACE_CLASS_DARK : GRID_SURFACE_CLASS_LIGHT;

  const focusSearch = useCallback(() => {
    setIsFilterOpen(true);
    setTimeout(() => {
      const searchInput = document.querySelector<HTMLInputElement>("aside input[type='search']");
      searchInput?.focus();
    }, 60);
  }, []);

  const filterSidebarProps: FilterSidebarProps = {
    isOpen: isFilterOpen,
    onCloseAction: () => setIsFilterOpen(false),
    activeQuery,
    onQueryChangeAction: handleQueryChange,
    activeCategory,
    categories: categoriesState,
    onCategoryChangeAction: handleCategoryChange,
    brandOptions,
    modelOptions,
    activeBrand,
    onBrandChangeAction: handleBrandChange,
    activeModel,
    onModelChangeAction: handleModelChange,
    brandEmptyMessage: hasCatalogLinks
      ? "Выберите категорию, чтобы увидеть бренды."
      : "Для этих товаров не настроена связь с каталогом. Задайте модель в админке, чтобы включить фильтр по бренду и моделям.",
    modelEmptyMessage: hasCatalogLinks
      ? "Для выбранного бренда нет моделей."
      : "Сначала свяжите SKU с моделью каталога, затем фильтр станет доступен.",
    activeDataset,
    onDatasetChangeAction: handleDatasetChange,
    activeSort,
    onSortChangeAction: handleSortChange,
    priceMin,
    priceMax,
    onPriceMinChangeAction: handlePriceMinChange,
    onPriceMaxChangeAction: handlePriceMaxChange,
    minRating,
    onRatingChangeAction: handleRatingChange,
    onResetAction: handleResetFilters,
  };

  return (
    <ProductListShell
      theme={theme}
      isFilterOpen={isFilterOpen}
      onCloseFilters={() => setIsFilterOpen(false)}
      filterSidebar={<FilterSidebar {...filterSidebarProps} />}
      toolbar={
        <ProductFilterToolbar
          theme={theme}
          query={activeQuery}
          onQueryChange={handleQueryChange}
          onToggleFilters={() => setIsFilterOpen((prev) => !prev)}
          onToggleTheme={toggleTheme}
          activeFiltersCount={activeFiltersCount}
          activeDataset={activeDataset}
          onDatasetChange={handleDatasetChange}
          visibleCount={visibleCount}
          totalCount={totalCount}
          activeSort={activeSort}
          onSortChange={handleSortChange}
        />
      }
    >
      <RevealOnScroll
        className={
          theme === "dark"
            ? "w-full min-w-0 relative overflow-hidden rounded-[36px] border border-white/12 bg-white/5 px-6 py-10 text-center shadow-[0_30px_110px_-60px_rgba(0,0,0,0.55)] backdrop-blur-xl lg:px-10 lg:py-12 lg:text-left"
            : "w-full min-w-0 rounded-[36px] border border-gray-200 bg-gray-50/80 px-6 py-10 text-center shadow-[0_24px_70px_-50px_rgba(15,23,42,0.45)] lg:px-10 lg:py-12 lg:text-left"
        }
        startY={32}
        startOpacity={0}
        threshold={0.2}
      >
        {theme === "dark" ? (
          <div className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(circle_at_15%_20%,rgba(94,234,212,0.14),transparent_32%),radial-gradient(circle_at_85%_10%,rgba(129,140,248,0.2),transparent_30%)]" />
        ) : null}
        <div className={theme === "dark" ? "relative" : ""}>
          <p
            className={
              theme === "dark"
                ? "text-sm font-semibold uppercase tracking-wide text-emerald-200/80"
                : "text-sm font-semibold uppercase tracking-wide text-gray-500"
            }
          >
            Product catalog
          </p>
          <h2
            className={
              theme === "dark"
                ? "mt-3 text-3xl font-semibold text-white sm:text-4xl"
                : "mt-3 text-3xl font-semibold text-gray-900 sm:text-4xl"
            }
          >
            {catalogName}
          </h2>
          <p
            className={
              theme === "dark"
                ? "mt-4 text-base text-slate-200/80 lg:max-w-3xl"
                : "mt-4 text-base text-gray-600 lg:max-w-3xl"
            }
          >
            Browse featured drops, compare performance stats, and blend Neon Shop with archived datasets to find the perfect fit for your workflow.
          </p>
          <div
            className={
              theme === "dark"
                ? "mt-6 flex flex-wrap gap-3 text-sm text-slate-200/90"
                : "mt-6 flex flex-wrap gap-3 text-sm text-gray-700"
            }
          >
            <span
              className={
                theme === "dark"
                  ? "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2"
                  : "inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2"
              }
            >
              <span className={theme === "dark" ? "h-2 w-2 rounded-full bg-emerald-400" : "h-2 w-2 rounded-full bg-green-500"} />
              Live catalog ú {totalCount} items
            </span>
            <span
              className={
                theme === "dark"
                  ? "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2"
                  : "inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2"
              }
            >
              <span className={theme === "dark" ? "h-2 w-2 rounded-full bg-sky-400" : "h-2 w-2 rounded-full bg-blue-500"} />
              {datasetLabelText}
            </span>
            {activeFiltersCount ? (
              <span
                className={
                  theme === "dark"
                    ? "inline-flex items-center gap-2 rounded-full border border-amber-300/60 bg-amber-400/10 px-4 py-2 text-amber-100"
                    : "inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-amber-700"
                }
              >
                <span className={theme === "dark" ? "h-2 w-2 rounded-full bg-amber-300" : "h-2 w-2 rounded-full bg-amber-500"} />
                {activeFiltersCount} filter{activeFiltersCount > 1 ? "s" : ""} applied
              </span>
            ) : null}
          </div>
        </div>
      </RevealOnScroll>

      {topCategoryLinks.length ? (
        <RevealOnScroll startY={18} startOpacity={0} duration={0.5} threshold={0.15}>
          <nav
            aria-label="Popular categories"
            className={
              theme === "dark"
                ? "flex flex-wrap items-center gap-2 text-sm text-slate-200/80"
                : "flex flex-wrap items-center gap-2 text-sm text-gray-600"
            }
          >
            <span className={theme === "dark" ? "font-semibold text-white" : "font-semibold text-gray-800"}>Popular categories:</span>
            {topCategoryLinks.map((category) => (
              <Link
                key={category.slug}
                href={`/products?category=${encodeURIComponent(category.slug)}`}
                className={
                  theme === "dark"
                    ? "inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/5 px-3 py-1.5 font-medium text-slate-100 transition hover:border-white/40 hover:bg-white/10"
                    : "inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 font-medium text-gray-700 transition hover:border-gray-900 hover:text-gray-900"
                }
              >
                {category.label}
                <span className={theme === "dark" ? "text-xs text-slate-400" : "text-xs text-gray-500"}>({category.count})</span>
              </Link>
            ))}
          </nav>
        </RevealOnScroll>
      ) : null}

      {carouselItems.length ? (
        <RevealOnScroll className="mt-6 w-full min-w-0" startY={18} startOpacity={0} duration={0.45} threshold={0.12}>
          <CatalogProductCarousel heading={carouselHeading} eyebrow={carouselEyebrow} caption={carouselCaption} products={carouselItems} />
        </RevealOnScroll>
      ) : null}

      <RevealOnScroll
        className={gridSurfaceClass}
        style={GRID_STYLE}
        startY={24}
        startOpacity={0}
        threshold={0.12}
        aria-live="polite"
        role="region"
      >
        {showSkeleton ? (
          <div className={skeletonLayoutClass[layoutMode]} role="status" aria-busy="true" aria-label="Loading products">
            {Array.from({ length: skeletonCount }).map((_, index) => (
              <div key={`skeleton-${index}`} className={skeletonItemWrapperClass[layoutMode]}>
                <ProductSkeleton />
              </div>
            ))}
          </div>
        ) : hasError ? (
          <EmptyState theme={theme} isError message={pageError ?? "?? ??????? ????????? ???????. ?????????? ??? ???."} onReset={handleHardReset} onSearch={focusSearch} />
        ) : displayed.length > 0 ? (
          <ProductGrid items={gridItems} layout={layoutMode} showAddToCart wrapWithContainer={false} gridId="catalog" />
        ) : (
          <EmptyState theme={theme} message="?????? ?? ??????? ?? ????????? ????????." onReset={handleHardReset} onSearch={focusSearch} />
        )}
      </RevealOnScroll>

      <div ref={sentinelRef} aria-hidden data-testid="catalog-sentinel" />
      <ProductPagination theme={theme} hasMore={hasMore} isLoading={isFetchingMore || showSkeleton} onLoadMore={loadMore} />
    </ProductListShell>
  );
}
/*
            className={
              theme === "dark"
                ? "w-full min-w-0 relative overflow-hidden rounded-[36px] border border-white/12 bg-white/5 px-6 py-10 text-center shadow-[0_30px_110px_-60px_rgba(0,0,0,0.55)] backdrop-blur-xl lg:px-10 lg:py-12 lg:text-left"
                : "w-full min-w-0 rounded-[36px] border border-gray-200 bg-gray-50/80 px-6 py-10 text-center shadow-[0_24px_70px_-50px_rgba(15,23,42,0.45)] lg:px-10 lg:py-12 lg:text-left"
            }
            startY={32}
            startOpacity={0}
            threshold={0.2}
          >
            {theme === "dark" ? (
              <div className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(circle_at_15%_20%,rgba(94,234,212,0.14),transparent_32%),radial-gradient(circle_at_85%_10%,rgba(129,140,248,0.2),transparent_30%)]" />
            ) : null}
            <div className={theme === "dark" ? "relative" : ""}>
              <p
                className={
                  theme === "dark"
                    ? "text-sm font-semibold uppercase tracking-wide text-emerald-200/80"
                    : "text-sm font-semibold uppercase tracking-wide text-gray-500"
                }
              >
                Product catalog
              </p>
              <h2
                className={
                  theme === "dark"
                    ? "mt-3 text-3xl font-semibold text-white sm:text-4xl"
                    : "mt-3 text-3xl font-semibold text-gray-900 sm:text-4xl"
                }
              >
                {catalogName}
              </h2>
              <p
                className={
                  theme === "dark"
                    ? "mt-4 text-base text-slate-200/80 lg:max-w-3xl"
                    : "mt-4 text-base text-gray-600 lg:max-w-3xl"
                }
              >
                Browse featured drops, compare performance stats, and blend Neon Shop with archived datasets to find the perfect fit for your workflow.
              </p>
              <div
                className={
                  theme === "dark"
                    ? "mt-6 flex flex-wrap gap-3 text-sm text-slate-200/90"
                    : "mt-6 flex flex-wrap gap-3 text-sm text-gray-700"
                }
              >
                <span
                  className={
                    theme === "dark"
                      ? "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2"
                      : "inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2"
                  }
                >
                  <span className={theme === "dark" ? "h-2 w-2 rounded-full bg-emerald-400" : "h-2 w-2 rounded-full bg-green-500"} />
                  Live catalog · {totalCount} items
                </span>
                <span
                  className={
                    theme === "dark"
                      ? "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2"
                      : "inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2"
                  }
                >
                  <span className={theme === "dark" ? "h-2 w-2 rounded-full bg-sky-400" : "h-2 w-2 rounded-full bg-blue-500"} />
                  {datasetLabelText}
                </span>
                {activeFiltersCount ? (
                  <span
                    className={
                      theme === "dark"
                        ? "inline-flex items-center gap-2 rounded-full border border-amber-300/60 bg-amber-400/10 px-4 py-2 text-amber-100"
                        : "inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-amber-700"
                    }
                  >
                    <span className={theme === "dark" ? "h-2 w-2 rounded-full bg-amber-300" : "h-2 w-2 rounded-full bg-amber-500"} />
                    {activeFiltersCount} filter{activeFiltersCount > 1 ? "s" : ""} applied
                  </span>
                ) : null}
              </div>
            </div>
          </RevealOnScroll>

          {topCategoryLinks.length ? (
            <RevealOnScroll
              startY={18}
              startOpacity={0}
              duration={0.5}
              threshold={0.15}
            >
              <nav
                aria-label="Popular categories"
                className={
                  theme === "dark"
                    ? "flex flex-wrap items-center gap-2 text-sm text-slate-200/80"
                    : "flex flex-wrap items-center gap-2 text-sm text-gray-600"
                }
              >
                <span className={theme === "dark" ? "font-semibold text-white" : "font-semibold text-gray-800"}>
                  Popular categories:
                </span>
                {topCategoryLinks.map((category) => (
                  <Link
                    key={category.slug}
                    href={`/products?category=${encodeURIComponent(category.slug)}`}
                    className={
                      theme === "dark"
                        ? "inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/5 px-3 py-1.5 font-medium text-slate-100 transition hover:border-white/40 hover:bg-white/10"
                        : "inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 font-medium text-gray-700 transition hover:border-gray-900 hover:text-gray-900"
                    }
                  >
                    {category.label}
                    <span className={theme === "dark" ? "text-xs text-slate-400" : "text-xs text-gray-500"}>
                      ({category.count})
                    </span>
                  </Link>
                ))}
              </nav>
            </RevealOnScroll>
          ) : null}

          {carouselItems.length ? (
            <RevealOnScroll
              className="mt-6 w-full min-w-0"
              startY={18}
              startOpacity={0}
              duration={0.45}
              threshold={0.12}
            >
              <CatalogProductCarousel
                heading={carouselHeading}
                eyebrow={carouselEyebrow}
                caption={carouselCaption}
                products={carouselItems}
              />
            </RevealOnScroll>
          ) : null}

          <RevealOnScroll
            className={gridSurfaceClass}
            style={GRID_STYLE}
            startY={24}
            startOpacity={0}
            threshold={0.12}
            aria-live="polite"
            role="region"
          >
            {showSkeleton ? (
              <div
                className={skeletonLayoutClass[layoutMode]}
                role="status"
                aria-busy="true"
                aria-label="Loading products"
              >
                {Array.from({ length: skeletonCount }).map((_, index) => (
                  <div key={`skeleton-${index}`} className={skeletonItemWrapperClass[layoutMode]}>
                    <ProductSkeleton />
                  </div>
                ))}
              </div>
            ) : hasError ? (
              <EmptyState
                theme={theme}
                isError
                message={pageError ?? "Не удалось загрузить каталог. Попробуйте еще раз."}
                onReset={handleHardReset}
                onSearch={focusSearch}
              />
            ) : displayed.length > 0 ? (
              <ProductGrid
                items={gridItems}
                layout={layoutMode}
                showAddToCart
                wrapWithContainer={false}
                gridId="catalog"
              />
            ) : (
              <EmptyState
                theme={theme}
                message="Ничего не найдено по выбранным фильтрам."
                onReset={handleHardReset}
                onSearch={focusSearch}
              />
            )}
          </RevealOnScroll>

          <div ref={sentinelRef} aria-hidden data-testid="catalog-sentinel" />
          {hasMore && !showSkeleton ? (
            <RevealOnScroll
              startY={10}
              startOpacity={0}
              duration={0.4}
            >
              <p className="py-6 text-center text-sm text-gray-500" role="status">
                Loading more products...
              </p>
            </RevealOnScroll>
          ) : null}
        </section>
      </div>

      {isFilterOpen ? (
        <div
          className="fixed inset-0 z-50 flex bg-black/40 backdrop-blur-sm lg:hidden"
          role="dialog"
          aria-modal="true"
        >
          <div className="h-full w-[85vw] max-w-xs bg-white shadow-2xl">
            <FilterSidebar {...filterSidebarProps} />
          </div>
          <button
            type="button"
            onClick={() => setIsFilterOpen(false)}
            className="h-full flex-1"
            aria-label="Close filters"
          />
        </div>
      ) : null}
    </div>
  );
}
*/

type EmptyStateProps = {
  theme: "light" | "dark";
  isError?: boolean;
  message?: string;
  onReset?: () => void;
  onSearch?: () => void;
};

function EmptyState({ theme, isError = false, message, onReset, onSearch }: EmptyStateProps) {
  const wrapperClass =
    theme === "dark"
      ? "flex flex-col items-center justify-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-12 text-center shadow-md"
      : "flex flex-col items-center justify-center gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-12 text-center shadow-md";
  const textClass = theme === "dark" ? "text-sm text-slate-200/80" : "text-sm text-gray-600";
  return (
    <div className={wrapperClass} role="status" aria-live="polite">
      <p className={textClass}>
        {message ??
          (isError
            ? "Произошла ошибка при загрузке каталога. Попробуйте снова или измените параметры."
            : "По выбранным фильтрам нет товаров. Попробуйте изменить поиск или сбросить фильтры.")}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          className={
            theme === "dark"
              ? "rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-emerald-400/70 focus:ring-offset-2 focus:ring-offset-[#0b0f19]"
              : "rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white"
          }
          onClick={() => onReset?.()}
        >
          Сбросить фильтры
        </button>
        <button
          type="button"
          className={
            theme === "dark"
              ? "rounded-full border border-white/20 bg-transparent px-4 py-2 text-sm font-semibold text-slate-100 hover:border-white/40 focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:ring-offset-2 focus:ring-offset-[#0b0f19]"
              : "rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:border-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:ring-offset-2 focus:ring-offset-white"
          }
          onClick={() => onSearch?.()}
        >
          Попробовать поиск
        </button>
      </div>
    </div>
  );
}

function humanize(input: string): string {
  return input
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeTaxonomyValue(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed || null;
}

function taxonomyLabelFromValue(value: string | null | undefined): string {
  if (!value) return "Unknown";
  return humanize(value.replace(/\//g, " "));
}

function productMatchesCategory(product: Product, category: string): boolean {
  if (!category || category === "all") return true;
  if (product.categorySlug && product.categorySlug === category) return true;
  const normalizedCategory = normalizeTaxonomyValue(category);
  const productCategory = normalizeTaxonomyValue(product.category);
  return productCategory === normalizedCategory;
}

function matchesBrand(product: Product, selection: string): boolean {
  if (!selection || selection === "all") return true;
  const normalizedSelection = normalizeTaxonomyValue(selection);
  if (!normalizedSelection) return true;
  const candidates = [
    product.brand,
    product.brandSlug,
    product.brandName,
  ]
    .map((value) => normalizeTaxonomyValue(value))
    .filter(Boolean);
  return candidates.includes(normalizedSelection);
}

function matchesModel(product: Product, selection: string): boolean {
  if (!selection || selection === "all") return true;
  const normalizedSelection = normalizeTaxonomyValue(selection);
  if (!normalizedSelection) return true;
  const candidates = [
    product.model,
    product.modelSlug,
    product.modelTitle ? product.modelTitle.toLowerCase().replace(/\s+/g, "-") : null,
  ]
    .map((value) => normalizeTaxonomyValue(value))
    .filter(Boolean);
  if (candidates.includes(normalizedSelection)) return true;
  if (product.catalogProductId && product.catalogProductId === selection) return true;
  return false;
}

