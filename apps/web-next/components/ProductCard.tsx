"use client";

import Image from "next/image";
import Link from "next/link";
import { memo } from "react";

import AddToCartButton from "@/app/products/components/AddToCartButton";
import { cn } from "@shared/lib/cn";
import WishlistHeart from "./WishlistHeart";

export type ProductGridItem = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  price?: string | null;
  originalPrice?: string | null;
  meta?: string | null;
  badge?: string | null;
  image?: string | null;
};

type ProductCardProps = {
  product: ProductGridItem;
  index: number;
  href: string;
  showAddToCart: boolean;
  addLabel: string;
  noImageLabel: string;
  translate: (key: string, fallback: string) => string;
};

function BaseProductCard({ product, index, href, showAddToCart, addLabel, noImageLabel, translate }: ProductCardProps) {
  const badgeLabel = getBadgeLabel(product, translate);
  const badgeClass = getBadgeClass(badgeLabel);
  const originalPrice =
    product.originalPrice && product.originalPrice !== product.price ? product.originalPrice : null;

  return (
    <article
      aria-label={product.title}
      className="flex h-full flex-col overflow-hidden rounded-xl border border-border/40 bg-card text-fg shadow-sm transition hover:-translate-y-[1px] hover:shadow-md focus-within:outline-none focus-within:ring-2 focus-within:ring-primary/30"
    >
      <Link
        href={href}
        prefetch={false}
        aria-label={product.title}
        className="group flex flex-1 flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
      >
        <div className="relative aspect-[4/5] overflow-hidden">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.title ?? ""}
              fill
              loading={index === 0 ? "eager" : "lazy"}
              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 25vw, 20vw"
              quality={55}
              className="h-full w-full object-cover object-center transition duration-700 ease-out group-hover:scale-[1.04]"
              placeholder={product.image.startsWith("data:") ? "blur" : "empty"}
              blurDataURL={product.image.startsWith("data:") ? product.image : undefined}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-medium uppercase tracking-[0.2em] text-muted">
              {noImageLabel}
            </div>
          )}
          {badgeLabel ? (
            <span
              className={cn(
                "pointer-events-none absolute left-4 top-4 inline-flex min-h-[1.75rem] items-center rounded-full px-3 text-[11px] font-semibold uppercase tracking-[0.08em]",
                badgeClass,
              )}
            >
              {badgeLabel}
            </span>
          ) : null}
          <WishlistHeart productId={product.id} className="absolute right-4 top-4" />
        </div>

        <div className="flex flex-1 flex-col gap-2 px-4 py-3 text-left">
          <h3 className="text-[15px] font-semibold leading-snug text-fg line-clamp-2">{product.title}</h3>
          {product.price ? (
            <div className="flex items-baseline gap-2">
              {originalPrice ? <span className="text-xs text-muted line-through">{originalPrice}</span> : null}
              <span className="text-base font-semibold">{product.price}</span>
            </div>
          ) : null}
          {product.meta ? <p className="text-xs text-muted-foreground">{product.meta}</p> : null}
          {product.subtitle ? <p className="text-sm text-muted">{product.subtitle}</p> : null}
        </div>
      </Link>

      {showAddToCart ? (
        <div className="mt-auto px-4 pb-4 pt-0">
          <AddToCartButton
            productId={product.id}
            title={product.title ?? ""}
            label={addLabel}
            variant="soft"
            className="h-11 w-full justify-center rounded-full font-semibold"
          />
        </div>
      ) : null}
    </article>
  );
}

export default memo(BaseProductCard);

function getBadgeLabel(
  product: ProductGridItem,
  translate: (key: string, fallback: string) => string,
): string | null {
  const raw = product.badge?.trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower.includes("sale")) {
    return translate("products.badges.sale", raw);
  }
  if (lower.includes("new")) {
    return translate("products.badges.new", raw);
  }
  if (lower.includes("best")) {
    return translate("products.badges.bestseller", raw);
  }
  return raw;
}

function getBadgeClass(label: string | null): string {
  if (!label) return "";
  const lower = label.toLowerCase();
  if (lower.includes("sale")) {
    return "bg-[#fbe7da] text-[#b3582f]";
  }
  if (lower.includes("new")) {
    return "bg-secondary/30 text-secondary-foreground";
  }
  if (lower.includes("best")) {
    return "bg-[#e9ecff] text-[#4951b3]";
  }
  return "bg-surface/20 text-muted";
}
