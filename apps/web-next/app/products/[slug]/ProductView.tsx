'use client';

import { mutedTextSm } from "@/styles/classnames";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import ProductImpression from "@/app/products/components/ProductImpression";
import TrackClickButton from "@/app/products/components/TrackClickButton";
import ProductSpecs from "@/components/ProductSpecs";
import { RecommendationsWidget } from "@/components/RecommendationsWidget";
import type { ProductGridItem } from "@/components/ProductGrid";
import type { ProductData, ProductVariantGroup, ProductVariantOption } from "./data";
import { formatCurrency } from "../currency";
import { track } from "@shared/lib/analytics";
import { isRecsOptedOut, logRecEvent } from "@/lib/recs-events";
import ProductTechBlock from "./ProductTechBlock";
import { PdpActions } from "./components/PdpActions";
import { PdpAdminStats } from "./components/PdpAdminStats";
import { PdpInfo } from "./components/PdpInfo";
import { PdpMedia } from "./components/PdpMedia";
import { PdpSimilar } from "./components/PdpSimilar";
import {
  type AdminStats,
  type Breadcrumb,
  type ReviewBucket,
  type ReviewBucketScore,
  type SelectionState,
} from "./components/pdp-types";

const ProductStickyCTA = dynamic(() => import("@/components/ProductStickyCTA"), {
  ssr: false,
  loading: () => null,
});

const ProductReviews = dynamic(() => import("@/components/ProductReviews"), {
  ssr: false,
  loading: () => <ReviewsSkeleton />,
});

const RecentProducts = dynamic(() => import("./RecentProducts.client"), {
  ssr: false,
  loading: () => null,
});

const RECENT_KEY = "recent:products:v1";
const PAYMENT_METHODS = ["Visa", "Mastercard", "Apple Pay", "Stripe"];

function resolvePriceBucket(price: number | null | undefined): string | null {
  if (price == null || Number.isNaN(price)) return null;
  const value = Number(price);
  if (!Number.isFinite(value)) return null;
  if (value < 50) return "low";
  if (value < 150) return "mid";
  if (value < 400) return "high";
  return "premium";
}

function ReviewsSkeleton() {
  return (
    <section className="space-y-4 rounded-3xl border border-border/40 bg-card/60 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-6 w-40 rounded-full bg-border/30" />
        <div className="h-10 w-48 rounded-full bg-border/20" />
      </div>
      <div className="grid gap-3 sm:grid-cols-5">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div key={idx} className="h-8 rounded-full bg-border/20" />
        ))}
      </div>
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, idx) => (
          <div
            key={`skeleton-review-${idx}`}
            className="space-y-3 rounded-2xl border border-border/30 bg-card/70 p-4"
          >
            <div className="h-4 w-32 rounded-full bg-border/30" />
            <div className="h-3 w-full rounded-full bg-border/20" />
            <div className="h-3 w-5/6 rounded-full bg-border/20" />
            <div className="h-3 w-2/3 rounded-full bg-border/20" />
          </div>
        ))}
      </div>
    </section>
  );
}

type IdleCleanup = () => void;

function runOnIdle(callback: () => void): IdleCleanup | undefined {
  if (typeof window === "undefined") return undefined;
  const win = window as typeof window & {
    requestIdleCallback?: (cb: IdleRequestCallback, options?: IdleRequestOptions) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

  if (typeof win.requestIdleCallback === "function") {
    const handle = win.requestIdleCallback(() => callback(), { timeout: 1500 });
    return () => {
      win.cancelIdleCallback?.(handle);
    };
  }

  const timeout = setTimeout(callback, 120);
  return () => clearTimeout(timeout);
}

const REVIEW_BUCKET_ORDER: ReviewBucketScore[] = [5, 4, 3, 2, 1];

type ReviewStatsEventDetail = {
  summary?: { average?: number | null; count?: number | null };
  buckets?: Array<{ score?: number; count?: number; value?: number; rating?: number; percent?: number }>;
};

type ReviewFilterEventDetail = { rating: number | null };

const REVIEW_SET_FILTER_EVENT = "product-reviews:set-filter";
const REVIEW_FILTER_CHANGE_EVENT = "product-reviews:filter-change";
const REVIEW_STATS_EVENT = "product-reviews:stats";

function buildInitialSelection(variants: ProductVariantGroup[]): SelectionState {
  const next: SelectionState = {};
  for (const group of variants) {
    const option = group.options.find((opt) => !opt.disabled) ?? group.options[0];
    next[group.id] = option;
  }
  return next;
}

function getRecentSlugs(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return [];
  }
}

function persistRecent(list: string[]) {
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 20)));
  } catch {
    /* ignore */
  }
}

function pushRecent(slug: string) {
  const list = getRecentSlugs().filter((value) => value !== slug);
  list.unshift(slug);
  persistRecent(list);
}

function formatVariantLabel(variants: ProductVariantGroup[], selection: SelectionState): string | null {
  if (!variants.length) return null;
  const parts = variants
    .map((group) => selection[group.id]?.label ?? group.options[0]?.label ?? "")
    .filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

function computePrice(product: ProductData, selection: SelectionState): { raw: number; formatted: string } {
  const delta = Object.values(selection).reduce((sum, option) => sum + (option?.priceDelta ?? 0), 0);
  const value = Number(product.price ?? 0) + delta;
  return { raw: value, formatted: formatCurrency(value, product.currency) };
}

function composeGallery(product: ProductData, selection: SelectionState): string[] {
  const extras = new Set(product.gallery);
  Object.values(selection).forEach((option) => {
    if (option?.image) extras.add(option.image);
  });
  return Array.from(extras);
}

function normalizeReviewBuckets(source: ReviewStatsEventDetail["buckets"]): ReviewBucket[] {
  const counts = new Map<ReviewBucketScore, number>();
  const percents = new Map<ReviewBucketScore, number>();

  if (Array.isArray(source)) {
    for (const raw of source) {
      const scoreValue = Number(raw?.score ?? raw?.rating);
      if (!Number.isFinite(scoreValue)) continue;
      const score = scoreValue as ReviewBucketScore;
      if (!REVIEW_BUCKET_ORDER.includes(score)) continue;

      const countValue = Number(raw?.count ?? raw?.value ?? 0);
      if (Number.isFinite(countValue) && countValue >= 0) {
        counts.set(score, countValue);
      }

      const percentValue = Number(raw?.percent);
      if (Number.isFinite(percentValue) && percentValue >= 0) {
        percents.set(score, percentValue);
      }
    }
  }

  const total = Array.from(counts.values()).reduce((sum, value) => sum + value, 0);
  return REVIEW_BUCKET_ORDER.map((score) => {
    const count = counts.get(score) ?? 0;
    const percent = total > 0 ? Math.round((count / total) * 100) : percents.get(score) ?? 0;
    return { score, count, percent };
  });
}

function normalizeAverageRating(input: number | null | undefined): number {
  const raw = Number(input ?? 0);
  if (!Number.isFinite(raw)) return 0;
  let value = raw;
  if (value > 5 && value <= 100) {
    value = value / 20;
  }
  if (value < 0) value = 0;
  if (value > 5) value = 5;
  return Number(value.toFixed(2));
}

function normalizeRatingsCount(value: number | null | undefined): number {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Math.max(0, Math.trunc(numeric));
}

function ProductClientEffects({ product }: { product: ProductData }) {
  useEffect(() => {
    const cleanup = runOnIdle(() => {
      try {
        track({ name: "view_item", params: { product_id: product.id, slug: product.slug, price: product.price } });
      } catch {
        /* noop */
      }
      const record = async () => {
        const optOut = isRecsOptedOut();
        try {
          await fetch("/api/events/view", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ productId: product.id, optOut }),
            keepalive: true,
          });
        } catch {
          /* ignore network errors */
        }
        const ok = await logRecEvent({
          event: "view",
          productId: product.id,
          category: product.category?.slug ?? undefined,
          priceCents: product.priceCents ?? Math.round((product.price || 0) * 100),
          metadata: { source: "product_page", dataset: product.dataset },
        });
        if (!ok) pushRecent(product.slug);
      };
      void record();
    });
    return () => {
      cleanup?.();
    };
  }, [product.id, product.slug, product.price]);
  return null;
}

type ProductViewProps = {
  product: ProductData;
  breadcrumbs: Breadcrumb[];
  admin: AdminStats;
  similar: ProductGridItem[];
};

export default function ProductView({ product, breadcrumbs, admin, similar }: ProductViewProps) {
  const [selection, setSelection] = useState<SelectionState>(() => buildInitialSelection(product.variants));
  const [activeImage, setActiveImage] = useState<string | undefined>(product.gallery[0]);
  const [reviewStats, setReviewStats] = useState<{ average: number; count: number }>(() => ({
    average: normalizeAverageRating(product.reviewSummary.average),
    count: normalizeRatingsCount(product.reviewSummary.count),
  }));
  const [reviewBuckets, setReviewBuckets] = useState<ReviewBucket[]>(() =>
    REVIEW_BUCKET_ORDER.map((score) => ({ score, count: 0, percent: 0 })),
  );
  const [activeReviewFilter, setActiveReviewFilter] = useState<ReviewBucketScore | null>(null);

  const gallery = useMemo(() => composeGallery(product, selection), [product, selection]);
  const { raw: finalPrice, formatted: formattedPrice } = useMemo(
    () => computePrice(product, selection),
    [product, selection],
  );
  const priceBucket = useMemo(
    () => resolvePriceBucket(finalPrice ?? product.price),
    [finalPrice, product.price],
  );
  const compareAtPrice = useMemo(() => {
    if (typeof product.originalPrice === "number" && product.originalPrice > product.price) {
      return formatCurrency(product.originalPrice, product.currency);
    }
    if (
      typeof product.originalPriceCents === "number" &&
      product.originalPriceCents > (product.priceCents ?? Math.round(product.price * 100))
    ) {
      return formatCurrency(product.originalPriceCents / 100, product.currency);
    }
    if (
      typeof product.discountPercent === "number" &&
      product.discountPercent > 0 &&
      product.discountPercent < 100
    ) {
      const base = product.price / (1 - product.discountPercent / 100);
      if (Number.isFinite(base) && base > product.price) {
        return formatCurrency(base, product.currency);
      }
    }
    return null;
  }, [
    product.currency,
    product.discountPercent,
    product.originalPrice,
    product.originalPriceCents,
    product.price,
    product.priceCents,
  ]);
  const variantLabel = useMemo(() => formatVariantLabel(product.variants, selection), [product.variants, selection]);
  const reviewAverage = Number.isFinite(reviewStats.average) ? reviewStats.average : 0;
  const reviewCount = Number.isFinite(reviewStats.count) ? reviewStats.count : 0;
  const reviewAverageLabel = reviewCount > 0 ? reviewAverage.toFixed(1) : "-";
  const resolvedFinalPrice = finalPrice ?? product.price ?? 0;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const controller = new AbortController();
    let active = true;

    (async () => {
      try {
        const url = new URL("/api/reviews/list", window.location.origin);
        url.searchParams.set("product_id", product.id);
        url.searchParams.set("limit", "1");
        const response = await fetch(url.toString(), {
          headers: { accept: "application/json" },
          signal: controller.signal,
        });
        if (!response.ok) return;
        const json = (await response.json()) as {
          stats?: { avg_rating?: number | null; ratings_count?: number | null };
          buckets?: ReviewStatsEventDetail["buckets"];
        };
        if (!active) return;
        setReviewStats((prev) => {
          const avg = normalizeAverageRating(
            typeof json?.stats?.avg_rating === "number" ? json.stats.avg_rating : prev.average,
          );
          const count = normalizeRatingsCount(
            typeof json?.stats?.ratings_count === "number" ? json.stats.ratings_count : prev.count,
          );
          return { average: avg, count };
        });
        if (json?.buckets) {
          setReviewBuckets(normalizeReviewBuckets(json.buckets));
        }
      } catch {
        /* ignore network errors */
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [product.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStats = (event: Event) => {
      const detail = (event as CustomEvent<ReviewStatsEventDetail>).detail;
      if (!detail) return;
      if (detail.summary) {
        setReviewStats((prev) => ({
          average:
            detail.summary && "average" in detail.summary && detail.summary.average !== undefined
              ? normalizeAverageRating(detail.summary.average)
              : prev.average,
          count:
            detail.summary && "count" in detail.summary && detail.summary.count !== undefined
              ? normalizeRatingsCount(detail.summary.count)
              : prev.count,
        }));
      }
      if (detail.buckets) {
        setReviewBuckets(normalizeReviewBuckets(detail.buckets));
      }
    };

    const handleFilterChange = (event: Event) => {
      const detail = (event as CustomEvent<ReviewFilterEventDetail>).detail;
      if (!detail) {
        setActiveReviewFilter(null);
        return;
      }
      const rating = detail.rating;
      if (typeof rating === "number" && REVIEW_BUCKET_ORDER.includes(rating as ReviewBucketScore)) {
        setActiveReviewFilter(rating as ReviewBucketScore);
      } else {
        setActiveReviewFilter(null);
      }
    };

    window.addEventListener(REVIEW_STATS_EVENT, handleStats);
    window.addEventListener(REVIEW_FILTER_CHANGE_EVENT, handleFilterChange);

    return () => {
      window.removeEventListener(REVIEW_STATS_EVENT, handleStats);
      window.removeEventListener(REVIEW_FILTER_CHANGE_EVENT, handleFilterChange);
    };
  }, []);

  const handleVariantSelect = useCallback(
    (group: ProductVariantGroup, option: ProductVariantOption) => {
      if (option.disabled) return;
      setSelection((prev) => ({ ...prev, [group.id]: option }));
      if (option.image) {
        setActiveImage(option.image);
      }
    },
    [],
  );

  const handleGalleryChange = useCallback((url: string) => {
    setActiveImage(url);
  }, []);

  const handleReviewFilterSelect = useCallback(
    (score: ReviewBucketScore | null) => {
      if (score !== null && !REVIEW_BUCKET_ORDER.includes(score)) return;
      setActiveReviewFilter(score);
      if (typeof window !== "undefined") {
        try {
          window.dispatchEvent(
            new CustomEvent<ReviewFilterEventDetail>(REVIEW_SET_FILTER_EVENT, {
              detail: { rating: score },
            }),
          );
        } catch {
          /* ignore */
        }
        const target = document.getElementById("reviews");
        if (target) {
          try {
            target.scrollIntoView({ behavior: "smooth", block: "start" });
          } catch {
            target.scrollIntoView();
          }
        }
      }
    },
    [],
  );

  const onAdd = useCallback(() => {
    try {
      track({
        name: "add_to_cart",
        params: {
          product_id: product.id,
          slug: product.slug,
          price: resolvedFinalPrice ?? product.price ?? 0,
          variant: variantLabel ?? undefined,
        },
      });
    } catch {
      /* noop */
    }
  }, [product.id, product.slug, product.price, resolvedFinalPrice, variantLabel]);

  return (
    <div className="space-y-12">
      <ProductClientEffects product={product} />
      <ProductImpression
        productId={product.id}
        dataset={product.dataset}
        category={product.category?.slug}
        priceBucket={priceBucket}
      />
      <nav aria-label="Breadcrumb" className={mutedTextSm}>
        <ol className="flex flex-wrap items-center gap-2">
          <li className="flex items-center gap-2">
            <Link href="/" className="transition hover:text-primary hover:underline">
              Home
            </Link>
          </li>
          {breadcrumbs.map((crumb) => (
            <li key={crumb.href} className="flex items-center gap-2">
              <span aria-hidden>&gt;</span>
              <Link href={crumb.href} className="transition hover:text-primary hover:underline">
                {crumb.name}
              </Link>
            </li>
          ))}
          <li className="flex items-center gap-2">
            <span aria-hidden>&gt;</span>
            <span aria-current="page" className="font-medium text-fg">
              {product.title}
            </span>
          </li>
        </ol>
      </nav>

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] max-[923px]:-mx-6 max-[923px]:flex max-[923px]:snap-x max-[923px]:space-x-6 max-[923px]:overflow-x-auto max-[923px]:px-6">
        <PdpMedia
          title={product.title}
          images={gallery}
          fallbackImage={product.fallbackImage ?? "/logo.png"}
          activeImage={activeImage}
          onActiveChange={handleGalleryChange}
        />

        <aside className="mt-8 space-y-6 max-[923px]:min-w-[calc(100vw-3rem)] max-[923px]:snap-center max-[923px]:mt-0 xl:mt-0 xl:pl-4">
          <PdpInfo
            title={product.title}
            categoryName={product.category?.name ?? undefined}
            availabilityLabel={product.availabilityLabel}
            reviewAverageLabel={reviewAverageLabel}
            reviewCount={reviewCount}
            reviewBuckets={reviewBuckets}
            activeReviewFilter={activeReviewFilter}
            onReviewFilterSelect={handleReviewFilterSelect}
            shortDescription={product.shortDescription}
          />

          <PdpActions
            product={product}
            variants={product.variants}
            selection={selection}
            onVariantSelect={handleVariantSelect}
            formattedPrice={formattedPrice}
            compareAtPrice={compareAtPrice}
            finalPrice={resolvedFinalPrice}
            variantLabel={variantLabel}
            onAdd={onAdd}
            admin={admin}
            paymentMethods={PAYMENT_METHODS}
          />

          <PdpAdminStats admin={admin} />
        </aside>
      </div>

      <ProductSpecs specs={product.specs} description={product.description} />
      {product.techSpecs?.sections?.length ? (
        <ProductTechBlock data={product.techSpecs} defaultCollapsed />
      ) : null}
      <ProductReviews
        productId={product.id}
        slug={product.slug}
        initialAverage={product.reviewSummary.average}
        initialCount={product.reviewSummary.count}
      />
      <PdpSimilar items={similar} />
      <RecommendationsWidget limit={8} />
      <RecentProducts currentSlug={product.slug} />

      {(() => {
        const resolvedPriceCents = Math.round(Math.max(0, resolvedFinalPrice * 100));
        return (
          <ProductStickyCTA
            productId={product.id}
            title={product.title}
            price={formattedPrice}
            dataset={product.dataset}
            selectedVariantLabel={variantLabel}
            priceCents={resolvedPriceCents}
            category={product.category?.slug}
            currency={product.currency}
            recMetadata={{ source: "sticky_cta" }}
            secondaryAction={
              admin.isAdmin ? (
                <TrackClickButton productId={product.id} dataset={product.dataset} category={product.category?.slug} />
              ) : null
            }
            analyticsParams={{
              product_id: product.id,
              slug: product.slug,
              price: resolvedFinalPrice,
              variant: variantLabel ?? undefined,
              dataset: product.dataset,
            }}
          />
        );
      })()}
    </div>
  );
}
