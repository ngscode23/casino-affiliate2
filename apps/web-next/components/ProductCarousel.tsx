"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import type { EmblaCarouselType } from "embla-carousel";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@shared/lib/cn";

import styles from "./ProductCarousel.module.css";

export type ProductVariant = {
  id: string;
  model: string;
  brand: string;
  category: string;
  variantLabel: string;
  slug: string;
  image: string;
  price: string;
  currency: string;
  availability: "in_stock" | "preorder" | "backorder";
  color?: string;
  storage?: string;
  rating?: number;
};

type ProductCarouselProps = {
  model: string;
  heading?: string;
  limit?: number;
  className?: string;
  initialProducts?: ProductVariant[];
};

/**
 * Displays a swipeable carousel with all variants of a given model, e.g. every iPhone 17 option.
 * Data is loaded via the mock `getProductsByModel` helper but can be replaced with a real API call.
 */
export default function ProductCarousel({
  model,
  heading = `Другие варианты ${model}`,
  limit = 10,
  className,
  initialProducts,
}: ProductCarouselProps) {
  const normalizedModelKey = useMemo(() => normalizeModelKey(model), [model]);
  const initialMatch = useMemo(() => {
    if (!initialProducts?.length) return false;
    return normalizeModelKey(initialProducts[0].model) === normalizedModelKey;
  }, [initialProducts, normalizedModelKey]);

  const [products, setProducts] = useState<ProductVariant[]>(() =>
    initialMatch ? initialProducts!.slice(0, limit) : [],
  );
  const [loading, setLoading] = useState(!initialMatch);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (initialMatch) {
        setProducts(initialProducts!.slice(0, limit));
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const items = await getProductsByModel(model);
        if (cancelled) return;
        setProducts(items.slice(0, limit));
      } catch {
        if (cancelled) return;
        setError("Не удалось загрузить похожие товары.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [initialMatch, initialProducts, limit, model]);

  const [viewportRef, emblaApi] = useEmblaCarousel({
    align: "start",
    loop: products.length > 3,
    containScroll: "trimSnaps",
    dragFree: true,
  });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const updateButtons = useCallback((api?: EmblaCarouselType) => {
    if (!api) return;
    setCanScrollPrev(api.canScrollPrev());
    setCanScrollNext(api.canScrollNext());
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    updateButtons(emblaApi);
    emblaApi.on("select", updateButtons);
    emblaApi.on("reInit", updateButtons);
    return () => {
      emblaApi?.off("select", updateButtons);
      emblaApi?.off("reInit", updateButtons);
    };
  }, [emblaApi, updateButtons]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const skeletonItems = useMemo(
    () =>
      Array.from({ length: Math.min(limit, 4) }).map((_, index) => (
        <div key={`skeleton-${index}`} className={styles.embla__slide}>
          <div className="h-full animate-pulse rounded-3xl border border-white/10 bg-white/5 p-5 dark:border-slate-800 dark:bg-slate-900/40">
            <div className="mb-4 aspect-square w-full rounded-2xl bg-gradient-to-br from-slate-200 to-slate-50 dark:from-slate-800 dark:to-slate-700" />
            <div className="mb-2 h-4 rounded-full bg-slate-200 dark:bg-slate-700" />
            <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800" />
          </div>
        </div>
      )),
    [limit],
  );

  const content = useMemo(() => {
    if (loading) {
      return skeletonItems;
    }
    if (error) {
      return (
        <div className="rounded-2xl border border-amber-200/50 bg-amber-50/60 p-4 text-sm text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100">
          {error}
        </div>
      );
    }
    if (!products.length) {
      return (
        <div className="rounded-2xl border border-slate-200 bg-white/60 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300">
          Других вариантов модели {model} пока нет.
        </div>
      );
    }

    return (
      <>
        <div className={styles.embla__viewport} ref={viewportRef}>
          <div className={styles.embla__container}>
            {products.map((product) => (
              <article key={product.id} className={styles.embla__slide}>
                <Link
                  href={product.slug}
                  className="flex h-full flex-col gap-3 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-white/10 dark:bg-white/5"
                  prefetch={false}
                >
                  <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-900">
                    <Image
                      src={product.image}
                      alt={product.variantLabel}
                      fill
                      sizes="(max-width: 768px) 70vw, 320px"
                      className="object-cover"
                      priority={false}
                    />
                    {product.availability !== "in_stock" ? (
                      <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-800 shadow-sm">
                        {availabilityLabel(product.availability)}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {product.brand} · {product.model}
                    </p>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">{product.variantLabel}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-300">
                      {product.color} · {product.storage}
                    </p>
                    <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{product.price}</div>
                    {product.rating ? (
                      <div className="flex items-center gap-1 text-sm text-amber-500">
                        <span>★</span>
                        <span>{product.rating.toFixed(1)}</span>
                      </div>
                    ) : null}
                  </div>
                </Link>
              </article>
            ))}
          </div>
        </div>
        <div className={styles.embla__controls}>
          <button
            type="button"
            onClick={scrollPrev}
            aria-label="Предыдущий товар"
            disabled={!canScrollPrev}
            className={styles.embla__button}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={scrollNext}
            aria-label="Следующий товар"
            disabled={!canScrollNext}
            className={styles.embla__button}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </>
    );
  }, [
    canScrollNext,
    canScrollPrev,
    error,
    loading,
    model,
    products,
    scrollNext,
    scrollPrev,
    skeletonItems,
    viewportRef,
  ]);

  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-emerald-500">Варианты модели</p>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">{heading}</h2>
        </div>
        <span className="text-sm text-slate-500 dark:text-slate-300">
          Найдено {products.length || (loading ? "… " : 0)} вариантов
        </span>
      </div>
      <div className={styles.embla}>{content}</div>
    </section>
  );
}

export async function getProductsByModel(model: string): Promise<ProductVariant[]> {
  // Симулируем сетевой вызов
  await new Promise((resolve) => setTimeout(resolve, 200));
  const key = normalizeModelKey(model);
  return MOCK_PRODUCTS.filter((product) => normalizeModelKey(product.model) === key);
}

const MOCK_PRODUCTS: ProductVariant[] = [
  {
    id: "iphone17-pro-128-titanium",
    model: "iPhone 17 Pro",
    brand: "Apple",
    category: "phones",
    variantLabel: "Pro · Titanium · 128 ГБ",
    slug: "/products/phones/apple/iphone-17-pro/titanium-128",
    image: "/images/catalog/iphone-17-pro-titanium.png",
    price: "$1,199",
    currency: "USD",
    availability: "in_stock",
    color: "Natural Titanium",
    storage: "128 ГБ",
    rating: 4.9,
  },
  {
    id: "iphone17-pro-256-black",
    model: "iPhone 17 Pro",
    brand: "Apple",
    category: "phones",
    variantLabel: "Pro · Black · 256 ГБ",
    slug: "/products/phones/apple/iphone-17-pro/black-256",
    image: "/images/catalog/iphone-17-pro-black.png",
    price: "$1,299",
    currency: "USD",
    availability: "in_stock",
    color: "Space Black",
    storage: "256 ГБ",
    rating: 4.8,
  },
  {
    id: "iphone17-pro-512-white",
    model: "iPhone 17 Pro",
    brand: "Apple",
    category: "phones",
    variantLabel: "Pro · White · 512 ГБ",
    slug: "/products/phones/apple/iphone-17-pro/white-512",
    image: "/images/catalog/iphone-17-pro-white.png",
    price: "$1,499",
    currency: "USD",
    availability: "preorder",
    color: "Arctic White",
    storage: "512 ГБ",
    rating: 4.7,
  },
  {
    id: "iphone17-pro-max-1tb-navy",
    model: "iPhone 17 Pro",
    brand: "Apple",
    category: "phones",
    variantLabel: "Pro Max · Navy · 1 ТБ",
    slug: "/products/phones/apple/iphone-17-pro-max/navy-1tb",
    image: "/images/catalog/iphone-17-pro-navy.png",
    price: "$1,799",
    currency: "USD",
    availability: "backorder",
    color: "Deep Navy",
    storage: "1 ТБ",
    rating: 4.9,
  },
  {
    id: "iphone17-plus-256-coral",
    model: "iPhone 17 Plus",
    brand: "Apple",
    category: "phones",
    variantLabel: "Plus · Coral · 256 ГБ",
    slug: "/products/phones/apple/iphone-17-plus/coral-256",
    image: "/images/catalog/iphone-17-plus-coral.png",
    price: "$1,099",
    currency: "USD",
    availability: "in_stock",
    color: "Coral",
    storage: "256 ГБ",
    rating: 4.6,
  },
] satisfies ProductVariant[];

function availabilityLabel(state: ProductVariant["availability"]): string {
  switch (state) {
    case "in_stock":
      return "В наличии";
    case "preorder":
      return "Предзаказ";
    case "backorder":
      return "Ожидание";
    default:
      return "Недоступно";
  }
}

function normalizeModelKey(value: string | null | undefined): string {
  if (!value) return "";
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}
