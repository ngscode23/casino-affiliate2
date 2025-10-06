"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import AddToCartButton from "@/app/products/components/AddToCartButton";

export type ProductGridItem = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  price?: string | null;
  meta?: string | null;
  image?: string | null;
};

type LayoutMode = "single" | "grid" | "masonry";

type ProductGridProps = {
  items: ProductGridItem[];
  layout?: LayoutMode;
  showAddToCart?: boolean;
  addLabel?: string;
};

const layoutClasses: Record<LayoutMode, string> = {
  single: "grid grid-cols-1 gap-8",
  grid:
    "grid [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))] gap-6 sm:gap-8 2xl:gap-10",
  masonry:
    "grid [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))] grid-flow-row-dense auto-rows-[minmax(380px,auto)] gap-6 sm:gap-8 2xl:gap-10",
};

export function ProductGrid({
  items,
  layout = "grid",
  showAddToCart = false,
  addLabel = "Add to cart",
}: ProductGridProps) {
  const containerClasses = layoutClasses[layout] ?? layoutClasses.grid;

  return (
    <ul className={`${containerClasses} list-none`} role="list">
      {items.map((product, index) => {
        const href = `/products/${product.slug}`;
        return (
          <li key={product.id} className="h-full">
            <article className="group relative flex h-full flex-col overflow-hidden rounded-[32px] border border-border/30 bg-card/95 shadow-[0_24px_72px_-48px_rgba(153,126,92,0.32)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_32px_88px_-44px_rgba(153,126,92,0.42)]">
              <Link href={href} prefetch={false} aria-label={product.title} className="flex h-full flex-col">
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-secondary/20">
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={product.title ?? ""}
                      fill
                      priority={index < 4}
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1536px) 33vw, 20vw"
                      quality={90}
                      className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.04]"
                      placeholder={product.image.startsWith("data:") ? "blur" : "empty"}
                      blurDataURL={product.image.startsWith("data:") ? product.image : undefined}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-secondary/30" aria-hidden>
                      <div className="h-16 w-16 rounded-xl border border-border/50 bg-card/60" />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-4 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="line-clamp-2 text-base font-semibold text-fg">{product.title}</h3>
                    {product.price ? (
                      <span className="shrink-0 rounded-full border border-border/40 bg-card px-3 py-1 text-xs font-semibold text-primary">
                        {product.price}
                      </span>
                    ) : null}
                  </div>
                  {product.subtitle ? (
                    <p className="line-clamp-3 text-sm text-muted">{product.subtitle}</p>
                  ) : (
                    <p className="text-sm text-muted">No description provided.</p>
                  )}
                  {product.meta ? (
                    <div className="mt-auto flex items-center gap-2 text-xs text-muted">
                      <span className="inline-flex items-center rounded-full bg-secondary/30 px-3 py-1 font-semibold uppercase tracking-[0.22em] text-secondary-foreground">
                        {product.meta}
                      </span>
                    </div>
                  ) : null}
                </div>
              </Link>
              {showAddToCart ? (
                <div className="px-6 pb-6">
                  <AddToCartButton productId={product.id} label={addLabel} />
                </div>
              ) : null}
            </article>
          </li>
        );
      })}
    </ul>
  );
}

export function ProductSkeleton() {
  return (
    <article className="flex min-h-[360px] flex-col rounded-[32px] border border-border/30 bg-card/90 p-7 shadow-[0_24px_72px_-48px_rgba(153,126,92,0.32)] animate-pulse">
      <div className="relative aspect-[4/3] w-full rounded-[28px] bg-border/25" />
      <div className="mt-6 space-y-3">
        <div className="h-4 w-3/4 rounded-full bg-border/35" />
        <div className="h-3 w-2/3 rounded-full bg-border/25" />
        <div className="h-3 w-1/2 rounded-full bg-border/25" />
      </div>
      <div className="mt-auto flex items-center justify-between gap-4 pt-6">
        <div className="h-4 w-24 rounded-full bg-border/25" />
        <div className="h-9 w-28 rounded-full bg-border/20" />
      </div>
    </article>
  );
}
