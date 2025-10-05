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
  actionLabel?: string;
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
  actionLabel = "View details",
  showAddToCart = true,
  addLabel = "Add to cart",
}: ProductGridProps) {
  const isMasonry = layout === "masonry";
  const containerClasses = layoutClasses[layout] ?? layoutClasses.grid;

  return (
    <ul className={`${containerClasses} list-none`} role="list">
      {items.map((product, index) => {
        const href = `/products/${product.slug}`;
        return (
          <li key={product.id} className="h-full">
            <article className="surface relative flex h-full flex-col rounded-[calc(var(--radius)+0.75rem)] shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover">
              <div className="flex items-start justify-between px-7 pt-7">
                {product.meta ? (
                  <span className="inline-flex items-center rounded-full bg-secondary/80 px-3.5 py-1 text-xs font-medium text-secondary-foreground">
                    {product.meta}
                  </span>
                ) : (
                  <span className="h-7" aria-hidden="true" />
                )}
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  #{String(product.id).slice(-4)}
                </span>
              </div>

              <div className="px-7">
                <Link
                  href={href}
                  prefetch={false}
                  className="mt-6 block overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-bg to-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  aria-label={product.title}
                >
                  <div className="relative aspect-square w-full">
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt={product.title ?? ""}
                        fill
                        priority={index < 4}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1536px) 33vw, 20vw"
                        quality={88}
                        className="absolute inset-0 h-full w-full object-cover transition duration-500 ease-out group-hover:scale-105"
                        placeholder={product.image.startsWith("data:") ? "blur" : "empty"}
                        blurDataURL={product.image.startsWith("data:") ? product.image : undefined}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_60%)] bg-secondary/40" aria-hidden>
                        <div className="h-16 w-16 rounded-full border border-border/60 bg-card shadow-[0_18px_42px_rgba(38,28,23,0.28)]" />
                      </div>
                    )}
                  </div>
                </Link>
              </div>

              <div className="flex flex-1 flex-col px-7 pb-7 pt-6 text-sm">
                <div className="flex-1 space-y-2">
                  <h3 className="text-xl font-semibold tracking-tight text-fg">
                    <Link
                      href={href}
                      prefetch={false}
                      className="transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      {product.title}
                    </Link>
                  </h3>
                  {product.subtitle ? (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{product.subtitle}</p>
                  ) : null}
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                  {product.price ? (
                    <span className="text-lg font-semibold text-fg">{product.price}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground" aria-hidden>
                      &nbsp;
                    </span>
                  )}
                  <div className="flex flex-1 flex-wrap justify-end gap-2">
                    {showAddToCart ? (
                      <AddToCartButton
                        productId={product.id}
                        title={product.title}
                        label={addLabel}
                        variant="overlay"
                        className="inline-flex min-h-[2.75rem] flex-1 items-center justify-center rounded-full bg-secondary px-6 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 md:flex-none md:min-w-[160px]"
                      />
                    ) : null}
                    <Link
                      href={href}
                      prefetch={false}
                      className="inline-flex min-h-[2.75rem] flex-1 items-center justify-center rounded-full border border-border/50 px-6 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 md:flex-none md:min-w-[150px]"
                    >
                      {actionLabel}
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}

export function ProductSkeleton() {
  return (
    <article className="surface flex min-h-[360px] flex-col rounded-[calc(var(--radius)+0.75rem)] p-7 shadow-card animate-pulse">
      <div className="flex items-start justify-between">
        <div className="h-7 w-24 rounded-full bg-border/40" />
        <div className="h-7 w-16 rounded-full bg-border/30" />
      </div>
      <div className="mt-6 aspect-square w-full rounded-[1.75rem] bg-border/30" />
      <div className="mt-6 space-y-3">
        <div className="h-4 w-3/4 rounded bg-border/40" />
        <div className="h-3 w-2/3 rounded bg-border/30" />
      </div>
      <div className="mt-auto flex items-center justify-between gap-3">
        <div className="h-4 w-24 rounded bg-border/30" />
        <div className="h-10 w-32 rounded-full bg-border/20" />
      </div>
    </article>
  );
}
