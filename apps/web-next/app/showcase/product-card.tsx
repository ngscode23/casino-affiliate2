"use client";

import Image from "next/image";
import { Heart } from "lucide-react";
import { cn } from "@shared/lib/utils";

export type ProductBadgeVariant = "new" | "sale" | "bestseller" | "default";

export interface ShowcaseCardProps {
  title: string;
  badge?: {
    label: string;
    variant?: ProductBadgeVariant;
  };
  price: string;
  originalPrice?: string;
  image: {
    src: string;
    alt: string;
  };
}

const badgeStyles: Record<ProductBadgeVariant, string> = {
  new: "bg-secondary text-secondary-foreground",
  sale: "bg-[#fbe6d5] text-[#b3612f]",
  bestseller: "bg-muted text-muted-foreground",
  default: "bg-accent text-accent-foreground",
};

export function ShowcaseCard({
  title,
  badge,
  price,
  originalPrice,
  image,
}: ShowcaseCardProps) {
  return (
    <article className="relative flex h-full flex-col rounded-[calc(var(--radius)+0.25rem)] bg-card p-7 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover">
      <header className="flex items-start justify-between">
        {badge ? (
          <span
            className={cn(
              "inline-flex items-center rounded-full px-3.5 py-1 text-xs font-medium",
              badgeStyles[badge.variant ?? "default"],
            )}
          >
            {badge.label}
          </span>
        ) : (
          <span className="h-7" aria-hidden="true" />
        )}
        <button
          type="button"
          aria-label="Add to wishlist"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-transparent bg-secondary/60 text-muted-foreground transition-colors hover:bg-secondary hover:text-fg"
        >
          <Heart className="h-4 w-4" />
        </button>
      </header>

      <div className="mt-6 overflow-hidden rounded-[1.25rem] bg-gradient-to-br from-background to-accent/60 relative aspect-square">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 28vw, (min-width: 768px) 42vw, 100vw"
          className="object-cover"
          loading="lazy"
        />
      </div>

      <div className="mt-6 flex-1">
        <h2 className="text-xl font-semibold tracking-tight text-fg">
          {title}
        </h2>
        <div className="mt-3 flex items-baseline gap-3">
          <span className="text-xl font-semibold text-fg">{price}</span>
          {originalPrice ? (
            <span className="text-sm text-muted-foreground line-through">
              {originalPrice}
            </span>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-secondary px-6 py-3 text-sm font-medium text-fg transition-colors hover:bg-secondary/80"
      >
        View product
      </button>
    </article>
  );
}

export default ShowcaseCard;

