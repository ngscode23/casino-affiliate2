"use client";

import Link from "next/link";
import Image from "next/image";
import { memo, useCallback, useMemo, useEffect, useState } from "react";

import type { Product } from "@/app/products/types";
import { formatPrice } from "@/app/products/utils";
import { getFallbackImageByKey } from "@/app/products/fallback-images";
import { cn } from "@shared/lib/cn";
import { Heart, Shuffle } from "lucide-react";

type ProductCardProps = {
  product: Product;
};

const badgeStyles: Record<string, string> = {
  sale: "bg-[#fbe6d5] text-[#b3612f]",
  new: "bg-primary/15 text-primary",
  bestseller: "bg-muted text-muted-foreground",
  default: "bg-accent text-accent-foreground",
};

function resolveImage(src: Product["mainImage"], key: string) {
  if (typeof src === "string" && src.trim().length > 0) {
    return src;
  }
  return getFallbackImageByKey(key);
}

function useBadge(product: Product) {
  const discount = (product as unknown as { discountPercent?: number | null })?.discountPercent;
  if (typeof discount === "number" && discount > 0) {
    return `-${Math.round(discount)}%`;
  }
  const meta = product as unknown as { isNew?: boolean; isTop?: boolean };
  if (meta?.isNew) return "New";
  if (meta?.isTop) return "Top";
  return null;
}

function BaseProductCard({ product }: ProductCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isCompared, setIsCompared] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  const priceLabel = useMemo(() => formatPrice(product.price), [product.price]);
  const imageSrc = useMemo(
    () => resolveImage(product.mainImage, product.slug || product.id),
    [product.mainImage, product.slug, product.id],
  );
  const [imageUrl, setImageUrl] = useState(imageSrc);
  const title = product.title || "Product";
  const badge = useBadge(product);
  const badgeVariant = useMemo(() => {
    if (!badge) return "default";
    const discount = (product as unknown as { discountPercent?: number | null })?.discountPercent;
    if (typeof discount === "number" && discount > 0) return "sale";
    return badge.toLowerCase().includes("new") ? "new" : "default";
  }, [badge, product]);
  const originalPriceLabel = useMemo(() => {
    const discount = (product as unknown as { discountPercent?: number | null })?.discountPercent;
    if (typeof discount === "number" && discount > 0 && discount < 90) {
      const base = product.price / (1 - discount / 100);
      if (Number.isFinite(base)) return formatPrice(base);
    }
    return null;
  }, [product]);
  const href = useMemo(() => `/products/${encodeURIComponent(product.slug)}`, [product.slug]);

  const toggleFavorite = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsFavorite((prev) => !prev);
  }, []);

  const toggleCompare = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsCompared((prev) => !prev);
  }, []);

  const handleImageLoad = useCallback(() => {
    setIsImageLoaded(true);
  }, []);

  useEffect(() => {
    setImageUrl(imageSrc);
  }, [imageSrc]);

  useEffect(() => {
    setIsImageLoaded(false);
  }, [imageUrl]);

  const handleImageError = useCallback(() => {
    const fallback = getFallbackImageByKey(product.slug || product.id);
    if (fallback && fallback !== imageUrl) {
      setImageUrl(fallback);
    }
  }, [imageUrl, product.slug, product.id]);

  return (
    <Link
      href={href}
      prefetch
      aria-label={`View ${title} for ${priceLabel}`}
      className="group block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <article className="surface relative flex h-full flex-col rounded-[calc(var(--radius)+0.75rem)] shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover">
        <header className="flex items-start justify-between px-7 pt-7">
          {badge ? (
            <span
              className={cn(
                "inline-flex items-center rounded-full px-3.5 py-1 text-xs font-medium",
                badgeStyles[badgeVariant] ?? badgeStyles.default,
              )}
            >
              {badge}
            </span>
          ) : (
            <span className="h-7" aria-hidden="true" />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleFavorite}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-transparent bg-secondary/60 text-secondary-foreground/70 transition-colors hover:bg-secondary hover:text-secondary-foreground"
              aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
              aria-pressed={isFavorite}
            >
              <Heart className={cn("h-4 w-4", isFavorite ? "fill-current" : "")}
              />
            </button>
            <button
              type="button"
              onClick={toggleCompare}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-transparent bg-secondary/60 text-secondary-foreground/70 transition-colors hover:bg-secondary hover:text-secondary-foreground"
              aria-label={isCompared ? "Remove from compare" : "Add to compare"}
              aria-pressed={isCompared}
            >
              <Shuffle className={cn("h-4 w-4", isCompared ? "text-primary" : "")}
              />
            </button>
          </div>
        </header>

        <div className="mt-6 px-7">
          <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-bg to-accent/60">
            <div className="relative aspect-square">
              <Image
                src={imageUrl}
                alt={title}
                fill
                loading="lazy"
                sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 28vw, (min-width: 768px) 42vw, 100vw"
                className={cn(
                  "object-cover transition duration-500 ease-out group-hover:scale-[1.03]",
                  isImageLoaded ? "opacity-100" : "opacity-0",
                )}
                onLoadingComplete={handleImageLoad}
                onError={handleImageError}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col px-7 pb-7 text-sm">
          <div className="mt-6 flex-1">
            <h2 className="text-xl font-semibold tracking-tight text-fg">{title}</h2>
            {product.description ? (
              <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
            ) : null}
          </div>
          <div className="mt-6 flex items-baseline justify-between gap-3 text-sm">
            <div className="flex items-baseline gap-3">
              <span className="text-xl font-semibold text-fg">{priceLabel}</span>
              {originalPriceLabel ? (
                <span className="text-sm text-muted-foreground line-through">{originalPriceLabel}</span>
              ) : null}
            </div>
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{product.dataset}</span>
          </div>
          <div className="mt-6">
            <span className="inline-flex w-full items-center justify-center rounded-full bg-secondary px-6 py-3 text-sm font-medium text-secondary-foreground transition-colors group-hover:bg-secondary/80">
              View details
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

function ProductCardSkeleton() {
  return (
    <div className="animate-pulse rounded-[calc(var(--radius)+0.75rem)] bg-card p-7 shadow-card">
      <div className="flex items-start justify-between">
        <div className="h-7 w-20 rounded-full bg-border/40" />
        <div className="h-9 w-9 rounded-full bg-border/30" />
      </div>
      <div className="mt-6 aspect-square w-full rounded-[1.75rem] bg-border/30" />
      <div className="mt-6 space-y-3">
        <div className="h-4 w-3/4 rounded bg-border/40" />
        <div className="h-3 w-2/3 rounded bg-border/30" />
      </div>
      <div className="mt-6 flex items-center justify-between">
        <div className="h-4 w-24 rounded bg-border/30" />
        <div className="h-3 w-16 rounded bg-border/20" />
      </div>
      <div className="mt-6 h-10 rounded-full bg-border/30" />
    </div>
  );
}

export { ProductCardSkeleton };

export default memo(BaseProductCard);



