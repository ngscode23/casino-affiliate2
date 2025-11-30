"use client";

import Image from "next/image";
import Link from "next/link";
import { memo } from "react";

import AddToCartButton from "@/app/products/components/AddToCartButton";
import { cn } from "@shared/lib/cn";
import WishlistHeart from "./WishlistHeart";
import styles from "./ProductCard/ProductCard.module.css";

export type RecMeta = {
  treatment?: string | null;
  rank?: number | null;
  reason?: string | null;
  score?: number | null;
  adjusted_score?: number | null;
  bandit_from?: number | null;
  rollout?: number | null;
  placement?: string | null;
  source?: string | null;
};

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
  recMeta?: RecMeta;
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
  const metaItems = product.meta
    ? product.meta
        .split("\u0007")
        .map((item) => item.trim())
        .filter(Boolean)
    : null;
  const description = product.subtitle ?? metaItems?.[0] ?? null;
  const supportingMeta = description && metaItems ? metaItems.slice(1) : metaItems;

  return (
    <article aria-label={product.title} className={styles.vcCard}>
      <Link href={href} prefetch={false} aria-label={product.title} className={styles.vcLink}>
        <div className={styles.vcMedia}>
          {product.image ? (
            <Image
              src={product.image}
              alt={product.title ?? ""}
              fill
              loading={index === 0 ? "eager" : "lazy"}
              sizes="(max-width: 768px) 90vw, (max-width: 1199px) 45vw, 320px"
              quality={60}
              className={styles.vcImage}
              style={{ borderRadius: "var(--vc-card-image-radius, 11px)" }}
              placeholder={product.image.startsWith("data:") ? "blur" : "empty"}
              blurDataURL={product.image.startsWith("data:") ? product.image : undefined}
            />
          ) : (
            <div className={styles.vcMediaPlaceholder}>{noImageLabel}</div>
          )}
          {badgeLabel ? <span className={cn(styles.vcBadge, badgeClass)}>{badgeLabel}</span> : null}
          <WishlistHeart productId={product.id} className={styles.vcWishlist} />
        </div>

        <div className={styles.vcBody}>
          <h3 className={styles.vcTitle}>{product.title}</h3>
          {description ? <p className={styles.vcDescription}>{description}</p> : null}

          {product.price ? (
            <div className={styles.vcPriceRow}>
              {originalPrice ? <span className={styles.vcPriceOriginal}>{originalPrice}</span> : null}
              <span className={styles.vcPriceCurrent}>{product.price}</span>
            </div>
          ) : null}

          {supportingMeta && supportingMeta.length ? (
            <ul className={styles.vcMetaList}>
              {supportingMeta.map((item, metaIndex) => (
                <li key={`${product.id}-${metaIndex}`} className={styles.vcMetaItem}>
                  {item}
                </li>
              ))}
            </ul>
          ) : null}

        </div>
      </Link>

      {showAddToCart ? (
        <div className={styles.vcActionBar}>
          <AddToCartButton
            productId={product.id}
            title={product.title ?? ""}
            label={addLabel}
            variant="soft"
            className={styles.vcAddButton}
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
  if (!label) return styles.vcBadgeNeutral;
  const lower = label.toLowerCase();
  if (lower.includes("sale")) {
    return styles.vcBadgeSale;
  }
  if (lower.includes("new")) {
    return styles.vcBadgeNew;
  }
  if (lower.includes("best")) {
    return styles.vcBadgeBest;
  }
  return styles.vcBadgeNeutral;
}
