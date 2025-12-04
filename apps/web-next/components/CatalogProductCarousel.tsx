"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@shared/lib/cn";
import { useT } from "@shared/lib/useT";
import ProductCard, { type ProductGridItem } from "./ProductCard";

import styles from "./CatalogProductCarousel.module.css";

type CatalogProductCarouselProps = {
  products: ProductGridItem[];
  heading: string;
  eyebrow?: string | null;
  caption?: string | null;
  className?: string;
  limit?: number;
  showAddToCart?: boolean;
};

export default function CatalogProductCarousel({
  products,
  heading,
  eyebrow,
  caption,
  className,
  limit,
  showAddToCart = true,
}: CatalogProductCarouselProps) {
  const t = useT();
  const translate = useCallback(
    (key: string, fallback: string) => {
      const value = t(key);
      return value && value !== key ? value : fallback;
    },
    [t],
  );
  const addLabel = useMemo(() => translate("products.addToCart", "Add to cart"), [translate]);
  const noImageLabel = useMemo(() => translate("products.noImage", "No image"), [translate]);

  const visibleProducts = useMemo(() => {
    if (typeof limit === "number" && Number.isFinite(limit)) {
      return products.slice(0, Math.max(0, limit));
    }
    return products;
  }, [limit, products]);

  const [viewportRef, emblaApi] = useEmblaCarousel({
    align: "start",
    loop: visibleProducts.length > 1,
    containScroll: visibleProducts.length > 2 ? "trimSnaps" : false,
    skipSnaps: false,
    duration: 60,
  });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  useEffect(() => {
    if (!emblaApi) return;
    const update = () => {
      setCanScrollPrev(emblaApi.canScrollPrev());
      setCanScrollNext(emblaApi.canScrollNext());
    };
    update();
    emblaApi.on("select", update);
    emblaApi.on("reInit", update);
    return () => {
      emblaApi.off("select", update);
      emblaApi.off("reInit", update);
    };
  }, [emblaApi]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  if (!visibleProducts.length) {
    return (
      <section className={cn("w-full min-w-0 rounded-[32px] border border-slate-200/70 bg-white/80 p-6 dark:border-white/10 dark:bg-white/5", className)}>
        <div className={styles.fallback}>
          No matching products for the selected model yet.
        </div>
      </section>
    );
  }

  return (
    <section
      className={cn(
        "w-full min-w-0 rounded-[34px] border border-slate-200/70 bg-white/90 p-6 shadow-[0_35px_90px_-60px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_45px_120px_-70px_rgba(0,0,0,0.8)]",
        className,
      )}
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">{heading}</h2>
          {caption ? <p className="text-sm text-slate-500 dark:text-slate-300">{caption}</p> : null}
        </div>
        {visibleProducts.length > 1 ? (
          <div className={styles.controls}>
            <button
              type="button"
              aria-label="Previous products"
              onClick={scrollPrev}
              disabled={!canScrollPrev}
              className={styles.button}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Next products"
              onClick={scrollNext}
              disabled={!canScrollNext}
              className={styles.button}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        ) : null}
      </div>

      <div className={styles.carousel}>
        <div className={styles.viewport} ref={viewportRef}>
          <div className={styles.container}>
            {visibleProducts.map((product, index) => (
              <div
                key={product.slug || product.id || index}
                className={styles.slide}
                data-product-id={product.id}
                data-product-slug={product.slug}
              >
                <ProductCard
                  product={product}
                  index={index}
                  href={`/products/${product.slug}`}
                  showAddToCart={showAddToCart}
                  addLabel={addLabel}
                  noImageLabel={noImageLabel}
                  translate={translate}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
