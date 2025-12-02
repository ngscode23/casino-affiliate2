"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { ChevronDown, Search, Settings, Sun, Moon, X } from "lucide-react";

import { ProductGrid, ProductSkeleton, PRODUCT_GRID_LAYOUTS } from "@/components/ProductGrid";
import type { ProductGridItem } from "@/components/ProductGrid";
import type { Product } from "./types";
import type { CategorySummary } from "./data";
import { formatPrice } from "./utils";
import { logRecEvent } from "@/lib/recs-events";
import FilterSidebar, { type FilterSidebarProps, type TaxonomyOption } from "./FilterSidebar";
import { DATASET_LABELS, DATASET_OPTIONS, DatasetType, SORT_OPTIONS, SortMode } from "./filter-config";
import RevealOnScroll from "@/components/animation/RevealOnScroll";
import CatalogProductCarousel from "@/components/CatalogProductCarousel";

type LayoutMode = "grid" | "single" | "masonry";
const CHUNK_SIZE = 8; // fewer above-the-fold items for faster LCP on mobile
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
  products,
  categories,
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
}) {
  const normalizedInitialQuery = (initialQuery ?? "").trim();
  const normalizedInitialCategory = useMemo(() => {
    if (!initialCategory) return "all";
    return categories.some((category) => category.slug === initialCategory) ? initialCategory : "all";
  }, [categories, initialCategory]);
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeDataset, setActiveDataset] = useState<DatasetType>(normalizedInitialDataset);
  const [activeSort, setActiveSort] = useState<SortMode>(initialSort);
  const [activeCategory, setActiveCategory] = useState(normalizedInitialCategory);
  const [activeQuery, setActiveQuery] = useState(normalizedInitialQuery);
  const [priceMin, setPriceMin] = useState<number | null>(normalizedPriceMin);
  const [priceMax, setPriceMax] = useState<number | null>(normalizedPriceMax);
  const [minRating, setMinRating] = useState<number | null>(normalizedMinRating);
  const [activeBrand, setActiveBrand] = useState<string>(normalizedInitialBrand);
  const [activeModel, setActiveModel] = useState<string>(normalizedInitialModel);
  const filterDefaultsRef = useRef({
    query: normalizedInitialQuery,
    dataset: normalizedInitialDataset,
    category: normalizedInitialCategory,
    brand: normalizedInitialBrand,
    model: normalizedInitialModel,
    sort: initialSort,
    priceMin: normalizedPriceMin,
    priceMax: normalizedPriceMax,
    minRating: normalizedMinRating,
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [visible, setVisible] = useState(CHUNK_SIZE);
  const [hydrated, setHydrated] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const sortMenuRef = useRef<HTMLDivElement | null>(null);
  const impressionLogged = useRef<Set<string>>(new Set());

  const numberFormatter = useMemo(() => new Intl.NumberFormat("en-US"), []);

  const productById = useMemo(() => {
    const map = new Map<string, Product>();
    for (const product of products) {
      map.set(product.id, product);
    }
    return map;
  }, [products]);

  const recMetaById = useMemo(() => {
    const map = new Map<string, Product["recMeta"]>();
    for (const product of products) {
      if (product.recMeta) {
        map.set(product.id, product.recMeta);
      }
    }
    return map;
  }, [products]);

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

  const topCategoryLinks = useMemo(() => categories.slice(0, 3), [categories]);
  const datasetLabelText = activeDataset === "all" ? "All products" : datasetLabel(activeDataset);

  const priceRange = useMemo(() => {
    const min = typeof priceMin === "number" && Number.isFinite(priceMin) && priceMin >= 0 ? priceMin : null;
    const rawMax = typeof priceMax === "number" && Number.isFinite(priceMax) && priceMax >= 0 ? priceMax : null;
    const max = rawMax != null && min != null && rawMax < min ? min : rawMax;
    return { min, max };
  }, [priceMax, priceMin]);

  const normalizedRating = useMemo(() => {
    if (typeof minRating !== "number" || !Number.isFinite(minRating) || minRating <= 0) return null;
    if (minRating >= 4.5) return 4.5;
    if (minRating >= 4) return 4;
    if (minRating >= 3) return 3;
    return null;
  }, [minRating]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (activeQuery.trim()) count += 1;
    if (activeDataset !== "all") count += 1;
    if (activeCategory !== "all") count += 1;
    if (activeBrand !== "all") count += 1;
    if (activeModel !== "all") count += 1;
    if (priceRange.min != null) count += 1;
    if (priceRange.max != null) count += 1;
    if (normalizedRating != null) count += 1;
    if (activeSort !== "recent") count += 1;
    return count;
  }, [
    activeBrand,
    activeCategory,
    activeDataset,
    activeModel,
    activeQuery,
    activeSort,
    normalizedRating,
    priceRange.max,
    priceRange.min,
  ]);

  const resetVisibleToFirstChunk = useCallback(() => {
    setVisible(CHUNK_SIZE);
  }, []);

  const handleQueryChange = useCallback(
    (value: string) => {
      setActiveQuery(value);
      resetVisibleToFirstChunk();
    },
    [resetVisibleToFirstChunk],
  );

  const handleDatasetChange = useCallback(
    (value: DatasetType) => {
      if (value === activeDataset) return;
      setActiveDataset(value);
      resetVisibleToFirstChunk();

      try {
        const current = searchParams ? new URLSearchParams(searchParams.toString()) : new URLSearchParams();
        if (value === "all") {
          current.delete("dataset");
        } else {
          current.set("dataset", value);
        }
        const queryString = current.toString();
        const href = queryString ? `/products?${queryString}` : "/products";
        router.push(href, { scroll: false });
      } catch {
        // In environments without router/searchParams just fall back to local state.
      }
    },
    [activeDataset, resetVisibleToFirstChunk, router, searchParams],
  );

  const handleCategoryChange = useCallback(
    (value: string) => {
      setActiveCategory(value);
      setActiveBrand("all");
      setActiveModel("all");
      resetVisibleToFirstChunk();
    },
    [resetVisibleToFirstChunk],
  );

  const handleBrandChange = useCallback(
    (value: string) => {
      setActiveBrand(value);
      setActiveModel("all");
      resetVisibleToFirstChunk();
    },
    [resetVisibleToFirstChunk],
  );

  const handleModelChange = useCallback(
    (value: string) => {
      setActiveModel(value);
      resetVisibleToFirstChunk();
    },
    [resetVisibleToFirstChunk],
  );

  const handleSortChange = useCallback(
    (value: SortMode) => {
      setActiveSort(value);
      resetVisibleToFirstChunk();
      setIsSortMenuOpen(false);
    },
    [resetVisibleToFirstChunk],
  );

  const handlePriceMinChange = useCallback(
    (value: number | null) => {
      setPriceMin(value);
      resetVisibleToFirstChunk();
    },
    [resetVisibleToFirstChunk],
  );

  const handlePriceMaxChange = useCallback(
    (value: number | null) => {
      setPriceMax(value);
      resetVisibleToFirstChunk();
    },
    [resetVisibleToFirstChunk],
  );

  const handleRatingChange = useCallback(
    (value: number | null) => {
      setMinRating(value);
      resetVisibleToFirstChunk();
    },
    [resetVisibleToFirstChunk],
  );

  const handleResetFilters = useCallback(() => {
    const defaults = filterDefaultsRef.current;
    setActiveQuery(defaults.query);
    setActiveDataset(defaults.dataset);
    setActiveCategory(defaults.category);
    setActiveBrand(defaults.brand);
    setActiveModel(defaults.model);
    setActiveSort(defaults.sort);
    setPriceMin(defaults.priceMin);
    setPriceMax(defaults.priceMax);
    setMinRating(defaults.minRating);
    resetVisibleToFirstChunk();
  }, [resetVisibleToFirstChunk]);

  const filtered = useMemo(() => {
    const query = activeQuery.trim().toLowerCase();
    let result = products;

    if (query) {
      result = result.filter((product) => (product.title + " " + (product.description || "")).toLowerCase().includes(query));
    }

    if (activeDataset !== "all") {
      result = result.filter((product) => product.dataset === activeDataset);
    }

    if (activeCategory !== "all") {
      result = result.filter((product) => product.categorySlug === activeCategory);
    }

    if (priceRange.min != null) {
      result = result.filter((product) => {
        const price = typeof product.price === "number" ? product.price : product.priceCents ? product.priceCents / 100 : 0;
        return price >= priceRange.min!;
      });
    }

    if (priceRange.max != null) {
      result = result.filter((product) => {
        const price = typeof product.price === "number" ? product.price : product.priceCents ? product.priceCents / 100 : 0;
        return price <= priceRange.max!;
      });
    }

    if (normalizedRating != null) {
      result = result.filter((product) => {
        const rating = typeof product.rating === "number" ? product.rating : 0;
        return rating >= normalizedRating;
      });
    }

    if (activeBrand !== "all") {
      result = result.filter((product) => matchesBrand(product, activeBrand));
    }

    if (activeModel !== "all") {
      result = result.filter((product) => matchesModel(product, activeModel));
    }

    return [...result].sort(sortComparators[activeSort]);
  }, [
    activeBrand,
    activeCategory,
    activeDataset,
    activeQuery,
    activeModel,
    activeSort,
    normalizedRating,
    priceRange.max,
    priceRange.min,
    products,
  ]);

  const displayed = useMemo(() => filtered.slice(0, visible), [filtered, visible]);
  const hasMore = useMemo(() => visible < filtered.length, [filtered.length, visible]);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!isSortMenuOpen) return;
    const handlePointer = (event: MouseEvent) => {
      if (!sortMenuRef.current) return;
      if (!sortMenuRef.current.contains(event.target as Node)) {
        setIsSortMenuOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSortMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isSortMenuOpen]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          setVisible((prev) => {
            if (prev >= filtered.length) return prev;
            return Math.min(filtered.length, prev + CHUNK_SIZE);
          });
        });
      },
      { rootMargin: "160px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filtered.length]);

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
      const metaParts = [availabilityLabel, categoryLabel, statsLabel].filter(Boolean);
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
        recMeta: product.recMeta,
      };
    },
    [availabilityLabelMap, numberFormatter],
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

  const hasCatalogLinks = useMemo(() => products.some((p) => Boolean(p.catalogProductId)), [products]);

  const brandOptions = useMemo<TaxonomyOption[]>(() => {
    const counts = new Map<string, { count: number; label: string }>();
    for (const product of products) {
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
  }, [activeCategory, products]);

  const modelOptions = useMemo<TaxonomyOption[]>(() => {
    if (activeBrand === "all") return [];
    const counts = new Map<string, { count: number; label: string }>();
    for (const product of products) {
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
  }, [activeBrand, activeCategory, products]);

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
      firstProduct: products[0]
        ? {
            id: products[0].id,
            brand: products[0].brand,
            brandSlug: products[0].brandSlug,
            brandName: products[0].brandName,
            model: products[0].model,
            modelSlug: products[0].modelSlug,
            modelTitle: products[0].modelTitle,
            catalogProductId: products[0].catalogProductId,
          }
        : null,
    });
  }, [activeBrand, activeCategory, activeModel, brandOptions, modelOptions, products]);

  useEffect(() => {
    if (activeBrand === "all") return;
    const exists = brandOptions.some((option) => option.value === activeBrand);
    if (!exists) {
      setActiveBrand("all");
      setActiveModel("all");
    }
  }, [activeBrand, brandOptions]);

  useEffect(() => {
    if (activeModel === "all") return;
    const exists = modelOptions.some((option) => option.value === activeModel);
    if (!exists) {
      setActiveModel("all");
    }
  }, [activeModel, modelOptions]);

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

  const showSkeleton = !hydrated;
  const skeletonCount = showSkeleton ? Math.max(displayed.length, 8) : 0;
  const layoutMode: LayoutMode = initialLayout;
  const visibleCount = displayed.length;
  const totalCount = typeof totalAvailable === "number" ? totalAvailable : products.length;
  const activeSortLabel = SORT_OPTIONS.find((option) => option.value === activeSort)?.label ?? "Newest first";

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

  const filterSidebarProps: FilterSidebarProps = {
    isOpen: isFilterOpen,
    onCloseAction: () => setIsFilterOpen(false),
    activeQuery,
    onQueryChangeAction: handleQueryChange,
    activeCategory,
    categories,
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
    <div
      data-theme={theme}
      className={
        theme === "dark"
          ? "relative min-h-screen bg-gradient-to-br from-[#0b0f19] via-[#0f1324] to-[#0b101a] text-slate-100"
          : "relative min-h-screen bg-white text-gray-900"
      }
    >
      {theme === "dark" ? (
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-70 [background:radial-gradient(circle_at_20%_20%,rgba(80,200,255,0.14),transparent_32%),radial-gradient(circle_at_82%_12%,rgba(140,122,255,0.18),transparent_30%),radial-gradient(circle_at_35%_70%,rgba(93,247,185,0.12),transparent_28%)]" />
      ) : null}
      <div
        className={
          theme === "dark"
            ? "sticky top-0 z-40 border-b border-white/10 bg-[#0d111b]/80 backdrop-blur-xl"
            : "sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur"
        }
      >
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 px-4 py-5 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <button
              type="button"
              onClick={() => setIsFilterOpen((prev) => !prev)}
              className={
                theme === "dark"
                  ? "inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5 hover:border-white/35"
                  : "inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 shadow-sm transition hover:-translate-y-0.5 hover:border-gray-900"
              }
            >
              <Settings className={theme === "dark" ? "h-4 w-4 text-slate-300" : "h-4 w-4 text-gray-500"} />
              <span>Filters</span>
              {activeFiltersCount ? (
                <span
                  className={
                    theme === "dark"
                      ? "flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-400 px-2 text-xs font-semibold text-black"
                      : "flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-900 px-2 text-xs font-semibold text-white"
                  }
                >
                  {activeFiltersCount}
                </span>
              ) : null}
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className={
                theme === "dark"
                  ? "inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/30"
                  : "inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition hover:border-gray-300"
              }
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span className="hidden sm:inline">{theme === "dark" ? "Light mode" : "Dark mode"}</span>
            </button>

            <div className="w-full flex-1">
              <div className="relative">
                <Search
                  className={
                    theme === "dark"
                      ? "pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      : "pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
                  }
                />
                <input
                  type="search"
                  value={activeQuery}
                  onChange={(event) => handleQueryChange(event.target.value)}
                  placeholder="Search the catalog..."
                  className={
                    theme === "dark"
                      ? "h-12 w-full rounded-full border border-white/10 bg-white/5 pl-11 pr-11 text-sm font-medium text-slate-100 placeholder:text-slate-500 transition focus:border-emerald-400/70 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-300/30"
                      : "h-12 w-full rounded-full border border-gray-300 bg-gray-50 pl-11 pr-11 text-sm font-medium text-gray-900 placeholder:text-gray-500 transition focus:border-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-200"
                  }
                />
                {activeQuery ? (
                  <button
                    type="button"
                    onClick={() => handleQueryChange("")}
                    className={
                      theme === "dark"
                        ? "absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-white"
                        : "absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 transition hover:text-gray-900"
                    }
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {DATASET_OPTIONS.map((option) => {
                const isActive = activeDataset === option.value;
                const activeClass =
                  theme === "dark"
                    ? "border-emerald-300/70 bg-emerald-400/10 text-emerald-100 shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
                    : "border-gray-900 bg-white text-gray-900 shadow-[0_14px_34px_rgba(15,23,42,0.22)]";
                const idleClass =
                  theme === "dark"
                    ? "border-white/10 text-slate-300 hover:border-white/30 hover:text-white hover:shadow-[0_10px_26px_rgba(0,0,0,0.4)]"
                    : "border-gray-200 text-gray-700 hover:border-gray-300 hover:text-gray-900 hover:shadow-[0_10px_26px_rgba(15,23,42,0.18)]";
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleDatasetChange(option.value)}
                    className={`h-9 rounded-full border px-4 text-sm font-medium transform-gpu transition duration-170 ease-out hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${isActive ? activeClass : idleClass}`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span
                className={
                  theme === "dark"
                    ? "inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 shadow-inner shadow-black/20"
                    : "inline-flex items-center rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700"
                }
              >
                {visibleCount} of {totalCount} products
              </span>
              <div className="relative" ref={sortMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsSortMenuOpen((prev) => !prev)}
                  className={
                    theme === "dark"
                      ? "inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transform-gpu transition duration-170 ease-out hover:border-white/35 hover:-translate-y-[1px] hover:shadow-[0_16px_40px_rgba(0,0,0,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050816]"
                      : "inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transform-gpu transition duration-170 ease-out hover:border-gray-900 hover:-translate-y-[1px] hover:shadow-[0_16px_40px_rgba(15,23,42,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  }
                  aria-haspopup="menu"
                  aria-expanded={isSortMenuOpen}
                >
                  <svg
                    width="20"
                    height="14"
                    viewBox="0 0 20 14"
                    fill="currentColor"
                    className={theme === "dark" ? "text-slate-400" : "text-gray-500"}
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M1.098.36A.66.66 0 0 0 .64.713a.66.66 0 0 0 .002.527.61.61 0 0 0 .48.36c.18.028 17.578.028 17.758-.001a.62.62 0 0 0 .478-.359.5.5 0 0 0 .051-.27c0-.134-.009-.177-.054-.264a.68.68 0 0 0-.315-.304L18.93.35 10.06.347C5.181.346 1.149.352 1.098.36M2.91 4.388a.64.64 0 0 0-.393.332c-.066.127-.068.43-.003.551a.8.8 0 0 0 .302.293l.094.046h14.18l.095-.046a.62.62 0 0 0 .352-.604.62.62 0 0 0-.365-.544l-.102-.046-7.04-.004c-5.638-.003-7.056.002-7.12.022M4.734 8.42a.6.6 0 0 0-.304.247.622.622 0 0 0 .268.91l.112.053h10.38l.112-.052a.623.623 0 0 0 .268-.911.6.6 0 0 0-.31-.248c-.098-.038-.213-.039-5.265-.038-5.005.001-5.168.002-5.261.039m2.605 3.98a.63.63 0 0 0-.518.735c.029.142.06.204.153.307.097.107.211.17.355.197.167.03 5.178.03 5.342 0a.53.53 0 0 0 .311-.153c.166-.15.24-.37.197-.58a.62.62 0 0 0-.369-.46l-.12-.056-2.63-.003c-1.447-.001-2.671.004-2.721.013"
                    />
                  </svg>
                  <span>{activeSortLabel}</span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition ${
                      isSortMenuOpen ? "rotate-180" : ""
                    } ${theme === "dark" ? "text-slate-400" : "text-gray-500"}`}
                  />
                </button>
                {isSortMenuOpen ? (
                  <div
                    className={
                      theme === "dark"
                        ? "absolute right-0 z-50 mt-2 w-60 rounded-2xl border border-white/15 bg-[#0f131d] p-1 shadow-2xl shadow-black/40 backdrop-blur-lg"
                        : "absolute right-0 z-50 mt-2 w-60 rounded-2xl border border-gray-200 bg-white p-1 shadow-2xl"
                    }
                    role="menu"
                  >
                    {SORT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleSortChange(option.value)}
                        className={`flex w-full items-center justify-between rounded-xl px-4 py-2 text-sm font-medium transform-gpu transition duration-150 ease-out hover:-translate-y-[1px] ${
                          activeSort === option.value
                            ? theme === "dark"
                              ? "bg-emerald-400/20 text-emerald-50 shadow-[0_14px_32px_rgba(0,0,0,0.6)]"
                              : "bg-gray-900 text-white shadow-[0_14px_32px_rgba(15,23,42,0.32)]"
                            : theme === "dark"
                              ? "text-slate-200 hover:bg-white/5"
                              : "text-gray-700 hover:bg-gray-50"
                        }`}
                        role="menuitemradio"
                        aria-checked={activeSort === option.value}
                      >
                        <span>{option.label}</span>
                        {activeSort === option.value ? (
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              clipRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            />
                          </svg>
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full gap-6 px-4 py-10 sm:px-8 lg:px-12">
        {isFilterOpen ? (
          <div className="hidden lg:block lg:w-[280px] lg:flex-none">
            <FilterSidebar {...filterSidebarProps} />
          </div>
        ) : null}

        <section className="flex-1 min-w-0 space-y-10">
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
          >
            {showSkeleton ? (
              <div className={skeletonLayoutClass[layoutMode]}>
                {Array.from({ length: skeletonCount }).map((_, index) => (
                  <div key={`skeleton-${index}`} className={skeletonItemWrapperClass[layoutMode]}>
                    <ProductSkeleton />
                  </div>
                ))}
              </div>
            ) : displayed.length > 0 ? (
              <ProductGrid
                items={gridItems}
                layout={layoutMode}
                showAddToCart
                wrapWithContainer={false}
                gridId="catalog"
              />
            ) : (
              <EmptyState theme={theme} />
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

function EmptyState({ theme }: { theme: "light" | "dark" }) {
  const wrapperClass =
    theme === "dark"
      ? "flex flex-col items-center justify-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-12 text-center shadow-md"
      : "flex flex-col items-center justify-center gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-12 text-center shadow-md";
  const textClass = theme === "dark" ? "text-sm text-slate-200/80" : "text-sm text-gray-600";
  return (
    <div className={wrapperClass}>
      <p className={textClass}>Products are unavailable right now. Please check back later.</p>
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

