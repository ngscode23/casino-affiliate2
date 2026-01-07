"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { ProductGridItem } from "@/components/ProductGrid";

import { useProductsSearchState } from "@/lib/hooks/useProductsSearchState";

import { type FilterSidebarProps, type TaxonomyOption } from "./FilterSidebar";
import { ProductsAnalytics } from "./ProductsAnalytics";
import { ProductsLayout } from "./ProductsLayout";
import { DATASET_LABELS, DatasetType, SortMode } from "./filter-config";
import { serializeFilterState } from "./filter-schema";
import { useProductsData } from "./hooks/useProductsData";
import type { CategorySummary } from "./data";
import type { Product } from "./types";
import type { LayoutMode, ThemeMode } from "./types.shared";
import { formatPrice } from "./utils";
import { brandLabelFromSlug, normalizeBrandSlug } from "./taxonomy";

const MIN_SKELETON_ITEMS = 8; // fewer above-the-fold placeholders for faster LCP on mobile
const PAGE_SIZE = 24;
const CAROUSEL_MAX_ITEMS = 16;

function datasetLabel(dataset: DatasetType | Product["dataset"]): string {
  if (dataset && dataset in DATASET_LABELS) {
    return DATASET_LABELS[dataset as DatasetType];
  }
  return "All products";
}

export default function ProductsClient({
  products: initialProducts,
  categories: initialCategories,
  catalogName,
  initialLayout = "grid",
  initialQuery = "",
  initialCategory = "all",
  initialBrandFacets = [],
  initialModelFacets = {},
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
  debug = null,
}: {
  products: Product[];
  categories: CategorySummary[];
  catalogName: string;
  debug?: Record<string, unknown> | null;
  initialLayout?: LayoutMode;
  initialQuery?: string;
  initialCategory?: string;
  initialBrandFacets?: TaxonomyOption[];
  initialModelFacets?: Record<string, TaxonomyOption[]>;
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
  const [hydrated, setHydrated] = useState(false);

  const numberFormatter = useMemo(() => new Intl.NumberFormat("en-US"), []);

  useEffect(() => {
    if (!debug) return;
    // Клиентский лог в браузер
    console.log("[catalog-debug-client]", { filters: { brand: initialBrand, model: initialModel }, ...debug });
  }, [debug, initialBrand, initialModel]);

  const buildQueryString = useCallback(
    (cursorValue: number) => {
      const params = serializeFilterState(filters);
      params.set("limit", String(PAGE_SIZE));
      params.set("cursor", String(Math.max(0, cursorValue)));
      return params.toString();
    },
    [filters],
  );
  const {
    items,
    categories: categoriesState,
    brandFacets,
    modelFacets,
    totalCount,
    hasMore,
    pageError,
    isFetchingPage,
    isFetchingMore,
    sentinelRef,
    loadMore,
    retry,
  } = useProductsData({
    initialItems: initialProducts,
    initialCategories,
    initialBrandFacets,
    initialModelFacets,
    initialNextCursor,
    initialTotalCount: totalAvailable ?? initialProducts.length,
    fetchError,
    queryKey,
    buildQueryString,
  });

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    console.log("[catalog-debug-client:queryKey]", { queryKey, filters });
  }, [filters, queryKey]);

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

  const categoriesForFilters: CategorySummary[] = useMemo(() => {
    if (categoriesState.length) return categoriesState;
    const counts = new Map<string, number>();
    for (const product of items) {
      const slug = product.categorySlug ?? product.category ?? null;
      if (!slug) continue;
      counts.set(slug, (counts.get(slug) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([slug, count]) => ({ slug, label: humanize(slug), count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [categoriesState, items]);

  const topCategoryLinks = useMemo(() => categoriesForFilters.slice(0, 3), [categoriesForFilters]);
  const datasetLabelText = activeDataset === "all" ? "All products" : datasetLabel(activeDataset);

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
    },
    [setQuery],
  );

  const handleDatasetChange = useCallback(
    (value: DatasetType) => {
      if (value === activeDataset) return;
      setDataset(value);
    },
    [activeDataset, setDataset],
  );

  const handleCategoryChange = useCallback(
    (value: string) => {
      setCategory(value);
    },
    [setCategory],
  );

  const handleBrandChange = useCallback(
    (value: string) => {
      setBrand(value);
      setModel("all");
    },
    [setBrand, setModel],
  );

  const handleModelChange = useCallback(
    (value: string) => {
      setModel(value);
    },
    [setModel],
  );

  const handleSortChange = useCallback(
    (value: SortMode) => {
      setSort(value);
    },
    [setSort],
  );

  const handlePriceMinChange = useCallback(
    (value: number | null) => {
      setPriceRange({ min: value, max: priceRange.max });
    },
    [priceRange.max, setPriceRange],
  );

  const handlePriceMaxChange = useCallback(
    (value: number | null) => {
      setPriceRange({ min: priceRange.min, max: value });
    },
    [priceRange.min, setPriceRange],
  );

  const handleRatingChange = useCallback(
    (value: number | null) => {
      setMinRating(value);
    },
    [setMinRating],
  );

  const handleResetFilters = useCallback(() => {
    resetFilters();
  }, [resetFilters]);

  const handleHardReset = useCallback(() => {
    resetFilters({ method: "push" });
    retry();
  }, [resetFilters, retry]);

  const displayed = items;
  const filtered = displayed;

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Показываем skeleton только при первой загрузке или если нет ни одного товара.
  const showSkeleton = (!hydrated || isFetchingPage) && displayed.length === 0;
  const skeletonCount = showSkeleton ? Math.max(displayed.length, MIN_SKELETON_ITEMS) : 0;
  const layoutMode: LayoutMode = initialLayout;
  const visibleCount = items.length;
  const hasError = Boolean(pageError);

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

  const focusSearch = useCallback(() => {
    setIsFilterOpen(true);
    setTimeout(() => {
      const searchInput = document.querySelector<HTMLInputElement>("aside input[type='search']");
      searchInput?.focus();
    }, 60);
  }, []);

  const hasCatalogLinks = useMemo(() => items.some((p) => Boolean(p.catalogProductId)), [items]);

  const brandOptions = useMemo<TaxonomyOption[]>(() => {
    if (brandFacets?.length) return brandFacets;
    const counts = new Map<string, { count: number; label: string }>();
    const accumulate = (source: Product[]) => {
      for (const product of source) {
        const key = normalizeBrandSlug(product.brandSlug ?? product.brand ?? product.brandName) ?? "unbranded";
        const label =
          key === "unbranded"
            ? "Unbranded"
            : brandLabelFromSlug(key, product.brandName ?? product.brand);
        const existing = counts.get(key);
        counts.set(key, {
          count: (existing?.count ?? 0) + 1,
          label: existing?.label ?? label,
        });
      }
    };

    // сначала считаем бренды внутри выбранной категории
    const categoryFiltered = items.filter((product) => productMatchesCategory(product, activeCategory));
    accumulate(categoryFiltered);

    // если внутри категории брендов не осталось (или данные пришли без брендов), показываем общий список
    if (counts.size === 0) {
      accumulate(items);
    }

    return Array.from(counts.entries())
      .map(([value, entry]) => ({
        value,
        count: entry.count,
        label: entry.label || taxonomyLabelFromValue(value),
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [activeCategory, brandFacets, items]);

  const modelOptions = useMemo<TaxonomyOption[]>(() => {
    const normalizedBrand = normalizeBrandSlug(activeBrand) ?? "all";
    if (normalizedBrand !== "all" && modelFacets[normalizedBrand]?.length) {
      return modelFacets[normalizedBrand];
    }
    if (normalizedBrand === "all") return [];
    const counts = new Map<string, { count: number; label: string }>();
    for (const product of items) {
      if (!productMatchesCategory(product, activeCategory)) continue;
      if (!matchesBrand(product, normalizedBrand)) continue;
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
  }, [activeBrand, activeCategory, items, modelFacets]);

  useEffect(() => {
    // Не сбрасываем бренд, пока данные догружаются, чтобы выбор не «откатывался»
    if (isFetchingPage || isFetchingMore) return;
    if (activeBrand === "all") return;
    if (!brandOptions.length) return;
    const exists = brandOptions.some((option) => option.value === activeBrand);
    if (!exists) {
      setBrand("all");
      setModel("all");
    }
  }, [activeBrand, brandOptions, isFetchingMore, isFetchingPage, setBrand, setModel]);

  useEffect(() => {
    if (activeModel === "all") return;
    const exists = modelOptions.some((option) => option.value === activeModel);
    if (!exists) {
      setModel("all");
    }
  }, [activeModel, modelOptions, setModel]);

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
          ? numberFormatter.format(product.clicks || 0) + " clicks  " + numberFormatter.format(product.impressions || 0) + " views"
          : null;
      const categoryLabel = product.categorySlug ? humanize(product.categorySlug) : null;
      const metaParts = [categoryLabel, statsLabel].filter(Boolean);
      const meta = metaParts.length ? metaParts.join("  ") : null;
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

  const filterSidebarProps: FilterSidebarProps = {
    isOpen: isFilterOpen,
    onCloseAction: () => setIsFilterOpen(false),
    activeQuery,
    onQueryChangeAction: handleQueryChange,
    activeCategory,
    categories: categoriesForFilters,
    onCategoryChangeAction: handleCategoryChange,
    brandOptions,
    modelOptions,
    activeBrand,
    onBrandChangeAction: handleBrandChange,
    activeModel,
    onModelChangeAction: handleModelChange,
    brandEmptyMessage: hasCatalogLinks
      ? "Бренды появятся после загрузки каталога или попробуйте другую категорию."
      : "Мы не нашли брендов в выбранной категории. Попробуйте изменить фильтры.",
    modelEmptyMessage: hasCatalogLinks
      ? "Модели станут доступны после выбора бренда."
      : "Укажите SKU или выберите бренд, чтобы увидеть модели.",
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

  const toolbarProps = {
    theme,
    query: activeQuery,
    onQueryChange: handleQueryChange,
    onToggleFilters: () => setIsFilterOpen((prev) => !prev),
    isLoading: isFetchingPage || isFetchingMore,
    onToggleTheme: toggleTheme,
    activeFiltersCount,
    activeDataset,
    onDatasetChange: handleDatasetChange,
    visibleCount,
    totalCount: totalCount ?? items.length,
    activeSort,
    onSortChange: handleSortChange,
  };

  const gridProps = {
    theme,
    layoutMode,
    gridItems,
    showSkeleton,
    skeletonCount,
    hasError,
    pageError,
    hasItems: displayed.length > 0,
    onHardReset: handleHardReset,
    onFocusSearch: focusSearch,
  };

  const paginationProps = {
    theme,
    sentinelRef,
    hasMore,
    isLoading: isFetchingMore || showSkeleton,
    onLoadMore: loadMore,
  };

  const analyticsDebugInfo = useMemo(
    () => ({
      activeCategory,
      activeBrand,
      activeModel,
      brandOptions,
      modelOptions,
      items,
    }),
    [activeBrand, activeCategory, activeModel, brandOptions, items, modelOptions],
  );

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
      const normalized = normalizeBrandSlug(activeBrand);
      const matching = matchesBrandSampleCount(items, activeBrand);
    const sample = items.slice(0, 8).map((p) => ({
      id: p.id,
      brand: p.brand,
      brandSlug: p.brandSlug,
      brandName: p.brandName,
      model: p.model ?? p.modelSlug ?? p.modelTitle,
      category: p.categorySlug ?? p.category,
    }));
    console.groupCollapsed(
      `[catalog-brand-debug] category=${activeCategory} brand=${activeBrand} options=${brandOptions.length} items=${items.length}`,
    );
    console.log({
      activeCategory,
      activeBrand,
      normalizedBrand: normalized,
      brandOptions,
      brandOptionsValues: brandOptions.map((o) => o.value),
      modelOptionsCount: modelOptions.length,
      matchingItems: matching,
      totalItems: items.length,
    });
    console.table(sample);
    console.groupEnd();
  }, [activeBrand, activeCategory, brandOptions, items, modelOptions]);

  useEffect(() => {
    if (!pageError) return;
    console.warn("[catalog-page-error]", pageError);
  }, [pageError]);

  return (
    <>
      <ProductsAnalytics
        filters={{
          dataset: activeDataset,
          category: activeCategory,
          brand: activeBrand,
          model: activeModel,
          sort: activeSort,
          priceMin: priceRange.min,
          priceMax: priceRange.max,
          rating: normalizedRating,
          query: activeQuery,
          filtersCount: activeFiltersCount,
        }}
        productById={productById}
        recMetaById={recMetaById}
        resolvePriceCents={resolvePriceCents}
        displayedDeps={[displayed]}
        debugInfo={analyticsDebugInfo}
      />
      <ProductsLayout
        theme={theme}
        catalogName={catalogName}
        datasetLabelText={datasetLabelText}
        totalCount={totalCount ?? items.length}
        activeFiltersCount={activeFiltersCount}
        topCategoryLinks={topCategoryLinks}
        carousel={{
          items: carouselItems,
          heading: carouselHeading,
          caption: carouselCaption,
          eyebrow: carouselEyebrow,
        }}
        filterSidebarProps={filterSidebarProps}
        toolbarProps={toolbarProps}
        gridProps={gridProps}
        paginationProps={paginationProps}
        isFilterOpen={isFilterOpen}
        onCloseFilters={() => setIsFilterOpen(false)}
        onToggleFilters={() => setIsFilterOpen((prev) => !prev)}
      />
    </>
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
  const normalizedSelection = category.trim().toLowerCase();
  if (!normalizedSelection) return true;

  const productCategory = normalizeTaxonomyValue(product.categorySlug ?? product.category);
  if (!productCategory) return false;

  // Совпадение точного слага или дочерних ("phones/android" должно матчить "phones")
  if (productCategory === normalizedSelection) return true;
  if (productCategory.startsWith(`${normalizedSelection}/`)) return true;
  return false;
}

function matchesBrand(product: Product, selection: string): boolean {
  if (!selection || selection === "all") return true;
  const normalizedSelection = normalizeBrandSlug(selection);
  if (!normalizedSelection) return selection === "unbranded";
  const candidates = [
    product.brand,
    product.brandSlug,
    product.brandName,
  ]
    .map((value) => normalizeBrandSlug(value))
    .filter(Boolean) as string[];
  if (normalizedSelection === "unbranded") {
    return candidates.length === 0;
  }
  return candidates.includes(normalizedSelection);
}

function matchesBrandSampleCount(products: Product[], selection: string): number {
  if (!selection || selection === "all") return products.length;
  return products.filter((p) => matchesBrand(p, selection)).length;
}


