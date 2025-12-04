"use client";

import Image from "next/image";
import Link from "next/link";
import { memo, useMemo } from "react";

import AddToCartButton from "@/app/products/components/AddToCartButton";
import { cn } from "@shared/lib/cn";
import { useCompare } from "@shared/ctx/CompareContext";
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
  availability?: "InStock" | "OutOfStock" | "PreOrder" | null;
  availabilityLabel?: string | null;
  variantCount?: number | null;
  variantLabel?: string | null;
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
  variant?: "default" | "carousel";
};

function BaseProductCard({
  product,
  index,
  href,
  showAddToCart,
  addLabel,
  noImageLabel,
  translate,
  variant = "default",
}: ProductCardProps) {
  const { toggle, isSelected } = useCompare();
  const compareId = product.slug || product.id;
  const inCompare = useMemo(() => isSelected(compareId), [compareId, isSelected]);

  const badgeLabel = getBadgeLabel(product, translate);
  const badgeClass = getBadgeClass(badgeLabel);
  const originalPrice =
    product.originalPrice && product.originalPrice !== product.price ? product.originalPrice : null;
  const availabilityLabel =
    product.availabilityLabel ??
    resolveAvailabilityLabel(product.availability, translate);
  const metaItems = product.meta
    ? product.meta
        .split("\u0007")
        .map((item) => item.trim())
        .filter(Boolean)
    : null;
  const description = product.subtitle ?? metaItems?.[0] ?? null;
  const supportingMeta = metaItems
    ? metaItems.filter(
        (item) =>
          item !== availabilityLabel &&
          item !== product.variantLabel,
      )
    : null;
  const imageAlt = product.variantLabel
    ? `${product.title} - ${product.variantLabel}`
    : product.title ?? "";

  const compareLabel = inCompare
    ? translate("compare.selected", "В сравнении")
    : translate("compare.add", "Сравнить");

  return (
    <article
      aria-label={product.title}
      className={cn(styles.vcCard, variant === "carousel" && styles.vcCardCarousel)}
    >
      <Link href={href} prefetch={false} aria-label={product.title} className={styles.vcLink}>
        <div className={styles.vcMedia}>
          {product.image ? (
            <Image
              src={product.image}
              alt={imageAlt}
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
          <div className={styles.vcMetaRow}>
            {availabilityLabel ? (
              <span className={cn(styles.vcStatus, getAvailabilityClass(product.availability))}>
                {availabilityLabel}
              </span>
            ) : null}
            {product.variantCount && product.variantCount > 1 ? (
              <span className={styles.vcVariant}>
                {product.variantLabel ?? translate("products.variants", `${product.variantCount} options`)}
              </span>
            ) : null}
          </div>
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
          <div className={styles.vcCompareRow}>
            <button
              type="button"
              className={cn(styles.vcCompareToggle, inCompare && styles.vcCompareToggleActive)}
              aria-pressed={inCompare}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                toggle({
                  slug: product.slug,
                  name: product.title,
                  price: product.price,
                  availability: availabilityLabel,
                  availabilityCode: product.availability ?? null,
                  image: product.image,
                  variantLabel: product.variantLabel ?? null,
                });
              }}
            >
              <span className={styles.vcCompareDot} aria-hidden />
              <span>{compareLabel}</span>
            </button>
          </div>
          <AddToCartButton
            productId={product.id}
            title={product.title ?? ""}
            label={addLabel}
            variant="soft"
            className={styles.vcAddButton}
            availabilityCode={product.availability ?? undefined}
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

function resolveAvailabilityLabel(
  availability: ProductGridItem["availability"],
  translate: (key: string, fallback: string) => string,
): string | null {
  switch (availability) {
    case "InStock":
      return translate("products.availability.inStock", "In stock");
    case "OutOfStock":
      return translate("products.availability.outOfStock", "Out of stock");
    case "PreOrder":
      return translate("products.availability.preorder", "Pre-order");
    default:
      return null;
  }
}

function getAvailabilityClass(availability: ProductGridItem["availability"]): string {
  switch (availability) {
    case "InStock":
      return styles.vcStatusIn;
    case "OutOfStock":
      return styles.vcStatusOut;
    case "PreOrder":
      return styles.vcStatusPre;
    default:
      return styles.vcStatusMuted;
  }
}
