"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LifeBuoy, RotateCcw, ShieldCheck } from "lucide-react";
import AddToCartButton from "@/app/products/components/AddToCartButton";
import ProductImpression from "@/app/products/components/ProductImpression";
import TrackClickButton from "@/app/products/components/TrackClickButton";
import ProductGallery from "@/components/ProductGallery";
import ProductStickyCTA from "@/components/ProductStickyCTA";
import ProductSpecs from "@/components/ProductSpecs";
import ProductReviews from "@/components/ProductReviews";
import { ProductGrid } from "@/components/ProductGrid";
import type { ProductGridItem } from "@/components/ProductGrid";
import type { ProductData, ProductVariantGroup, ProductVariantOption } from "./data";
import { formatCurrency } from "./data";
import { track } from "@shared/lib/analytics";
import { cn } from "@shared/lib/cn";

type AdminStats = {
  isAdmin: boolean;
  clicks: number;
  impressions: number;
};

type Breadcrumb = { name: string; href: string };

type ProductViewProps = {
  product: ProductData;
  breadcrumbs: Breadcrumb[];
  admin: AdminStats;
  similar: ProductGridItem[];
};

type SelectionState = Record<string, ProductVariantOption | undefined>;

const RECENT_KEY = "recent:products:v1";
const PAYMENT_METHODS = ["Visa", "Mastercard", "Apple Pay", "Stripe"];
const TRUST_POINTS = [
  { title: "14 дней на возврат", icon: <RotateCcw className="h-4 w-4" aria-hidden /> },
  { title: "Поддержка 24/7", icon: <LifeBuoy className="h-4 w-4" aria-hidden /> },
  { title: "Гарантия подлинности", icon: <ShieldCheck className="h-4 w-4" aria-hidden /> },
];

const REVIEW_BUCKET_ORDER = [5, 4, 3, 2, 1] as const;
type ReviewBucketScore = (typeof REVIEW_BUCKET_ORDER)[number];
type ReviewBucket = { score: ReviewBucketScore; count: number; percent: number };

type ReviewStatsEventDetail = {
  summary?: { average?: number | null; count?: number | null };
  buckets?: Array<{ score?: number; count?: number; value?: number; rating?: number; percent?: number }>;
};

type ReviewFilterEventDetail = { rating: number | null };

const REVIEW_SET_FILTER_EVENT = 'product-reviews:set-filter';
const REVIEW_FILTER_CHANGE_EVENT = 'product-reviews:filter-change';
const REVIEW_STATS_EVENT = 'product-reviews:stats';

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
    try {
      track({ name: "view_item", params: { product_id: product.id, slug: product.slug, price: product.price } });
    } catch {
      /* noop */
    }
    pushRecent(product.slug);
  }, [product.id, product.slug, product.price]);
  return null;
}

type RecentProductsState = { loading: boolean; items: ProductGridItem[] };

function ReviewFilterChip({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (!disabled) onClick();
      }}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-card",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border/40 text-muted-foreground hover:border-border/70 hover:text-fg",
        disabled ? "cursor-not-allowed opacity-50" : "hover:-translate-y-[1px]",
      )}
    >
      {label}
    </button>
  );
}

function RecentProducts({ currentSlug }: { currentSlug: string }) {
  const [{ loading, items }, setState] = useState<RecentProductsState>(() => ({ loading: true, items: [] }));

  useEffect(() => {
    const list = getRecentSlugs().filter((slug) => slug !== currentSlug);
    if (!list.length) {
      setState({ loading: false, items: [] });
      return;
    }
    const controller = new AbortController();
    (async () => {
      try {
        const url = new URL("/api/products/lookup", window.location.origin);
        url.searchParams.set("slugs", list.join(","));
        url.searchParams.set("limit", "8");
        const res = await fetch(url.toString(), {
          signal: controller.signal,
          headers: { accept: "application/json" },
        });
        if (!res.ok) throw new Error("Failed to load recently viewed");
        const json = (await res.json()) as { ok: boolean; items: ProductGridItem[] };
        if (controller.signal.aborted) return;
        setState({ loading: false, items: Array.isArray(json.items) ? json.items : [] });
      } catch {
        if (!controller.signal.aborted) setState({ loading: false, items: [] });
      }
    })();
    return () => controller.abort();
  }, [currentSlug]);

  if (loading || items.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-fg">Вы недавно смотрели</h2>
      <ProductGrid items={items} wrapWithContainer={false} />
    </section>
  );
}

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
  const variantLabel = useMemo(() => formatVariantLabel(product.variants, selection), [product.variants, selection]);
  const reviewAverage = Number.isFinite(reviewStats.average) ? reviewStats.average : 0;
  const reviewCount = Number.isFinite(reviewStats.count) ? reviewStats.count : 0;
  const reviewAverageLabel = reviewCount > 0 ? reviewAverage.toFixed(1) : "—";

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
          price: finalPrice,
          variant: variantLabel ?? undefined,
        },
      });
    } catch {
      /* noop */
    }
  }, [product.id, product.slug, finalPrice, variantLabel]);

  return (
    <div className="space-y-12">
      <ProductClientEffects product={product} />
      <ProductImpression productId={product.id} dataset={product.dataset} />

      <nav aria-label="Хлебные крошки" className="text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-2">
          <li className="flex items-center gap-2">
            <Link href="/" className="transition hover:text-primary hover:underline">
              Главная
            </Link>
          </li>
          {breadcrumbs.map((crumb) => (
            <li key={crumb.href} className="flex items-center gap-2">
              <span aria-hidden>›</span>
              <Link href={crumb.href} className="transition hover:text-primary hover:underline">
                {crumb.name}
              </Link>
            </li>
          ))}
          <li className="flex items-center gap-2">
            <span aria-hidden>›</span>
            <span aria-current="page" className="font-medium text-fg">
              {product.title}
            </span>
          </li>
        </ol>
      </nav>

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] max-[923px]:-mx-6 max-[923px]:flex max-[923px]:snap-x max-[923px]:space-x-6 max-[923px]:overflow-x-auto max-[923px]:px-6">
        <div className="max-[923px]:min-w-[calc(100vw-3rem)] max-[923px]:snap-center">
          <ProductGallery
            title={product.title}
            images={gallery}
            fallbackImage={product.fallbackImage}
            activeImage={activeImage}
            onActiveChange={(_, idx) => handleGalleryChange(gallery[idx] ?? product.fallbackImage)}
          />
        </div>

        <aside className="mt-8 space-y-6 max-[923px]:min-w-[calc(100vw-3rem)] max-[923px]:snap-center max-[923px]:mt-0 xl:mt-0 xl:pl-4">
          <div className="space-y-4 rounded-3xl border border-border/40 bg-card/70 p-6">
            <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-muted">
              <span>Каталог</span>
              {product.category.name ? <span>{product.category.name}</span> : null}
            </div>
            <h1 className="text-3xl font-semibold text-fg sm:text-4xl">{product.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-400">
                {product.availabilityLabel}
              </span>
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-fg">
                ★ {reviewAverageLabel}
                <span className="text-muted-foreground">
                  ({reviewCount} отзыв{reviewCount % 10 === 1 && reviewCount % 100 !== 11 ? "" : "ов"})
                </span>
              </span>
            </div>

            {product.shortDescription ? (
              <p className="text-sm leading-relaxed text-fg/80">{product.shortDescription}</p>
            ) : null}

            <div className="rounded-2xl border border-border/40 bg-card/80 p-4 shadow-inner">
              <div className="flex flex-col gap-1">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Отзывы покупателей</div>
                <div className="flex items-end gap-2 text-2xl font-semibold text-fg">
                  {reviewAverageLabel}
                  <span className="text-xs font-medium text-muted-foreground">/ 5</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  На основе <span className="font-semibold text-fg">{reviewCount}</span> отзывов
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <ReviewFilterChip
                  label={`Все (${reviewCount})`}
                  active={activeReviewFilter === null}
                  disabled={reviewCount === 0}
                  onClick={() => handleReviewFilterSelect(null)}
                />
              </div>
              <div className="mt-3 space-y-2">
                {reviewBuckets.map((bucket) => {
                  const active = activeReviewFilter === bucket.score;
                  const disabled = bucket.count === 0;
                  return (
                    <button
                      key={bucket.score}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        if (!disabled) handleReviewFilterSelect(bucket.score);
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                        active
                          ? "border-primary/60 bg-primary/10 text-primary"
                          : "border-border/40 text-muted-foreground hover:border-border/70 hover:text-fg",
                        disabled ? "cursor-not-allowed opacity-50" : "hover:-translate-y-[1px]",
                      )}
                      aria-pressed={active}
                    >
                      <span className="w-10 text-left font-medium text-fg">{bucket.score}★</span>
                      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-border/40" aria-hidden>
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-primary"
                          style={{ width: `${bucket.percent}%` }}
                        />
                      </div>
                      <span className="w-16 text-right text-xs text-muted-foreground">{bucket.count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {product.variants.length ? (
              <div className="space-y-4">
                {product.variants.map((group) => (
                  <div key={group.id} className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">{group.label}</div>
                    <div className="flex flex-wrap gap-2">
                      {group.options.map((option) => {
                        const active = selection[group.id]?.value === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => handleVariantSelect(group, option)}
                            disabled={option.disabled}
                            className={cn(
                              "rounded-full border px-4 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                              active
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border/40 bg-card text-fg hover:border-border/80",
                              option.disabled ? "cursor-not-allowed opacity-40" : null,
                            )}
                            title={option.disabled ? "Недоступно" : option.label}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-muted">Цена</div>
                <div className="text-3xl font-semibold text-fg">{formattedPrice}</div>
              </div>
              <AddToCartButton
                productId={product.id}
                title={product.title}
                label="Добавить в корзину"
                className="h-12 rounded-full px-6 text-sm font-semibold"
                quantity={1}
                analyticsParams={{
                  product_id: product.id,
                  slug: product.slug,
                  price: finalPrice,
                  variant: variantLabel ?? undefined,
                  dataset: product.dataset,
                }}
              />
              {admin.isAdmin ? (
                <TrackClickButton productId={product.id} dataset={product.dataset} />
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {PAYMENT_METHODS.map((method) => (
                <div
                  key={method}
                  className="flex items-center gap-3 rounded-2xl border border-border/30 bg-card/80 px-3 py-2 text-sm text-fg/90"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {method.slice(0, 2)}
                  </span>
                  <span>{method}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 rounded-3xl border border-border/40 bg-card/70 p-6">
            <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-muted">Мы заботимся о вас</h3>
            <ul className="space-y-3">
              {TRUST_POINTS.map((point) => (
                <li key={point.title} className="flex items-center gap-3 text-sm text-fg/90">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {point.icon}
                  </span>
                  <span>{point.title}</span>
                </li>
              ))}
            </ul>
            {admin.isAdmin ? (
              <div className="rounded-2xl border border-dashed border-border/50 bg-card/80 px-4 py-3 text-xs text-muted-foreground">
                <div>Clicks: <span className="font-semibold text-fg">{admin.clicks}</span></div>
                <div>Impressions: <span className="font-semibold text-fg">{admin.impressions}</span></div>
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      <ProductSpecs specs={product.specs} description={product.description} />

      <ProductReviews
        productId={product.id}
        slug={product.slug}
        initialAverage={product.reviewSummary.average}
        initialCount={product.reviewSummary.count}
      />

      {similar.length ? (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-fg">Похожие товары</h2>
          <ProductGrid items={similar} wrapWithContainer={false} />
        </section>
      ) : null}

      <RecentProducts currentSlug={product.slug} />

      <ProductStickyCTA
        productId={product.id}
        title={product.title}
        price={formattedPrice}
        dataset={product.dataset}
        selectedVariantLabel={variantLabel}
        secondaryAction={
          admin.isAdmin ? (
            <TrackClickButton productId={product.id} dataset={product.dataset} />
          ) : null
        }
        analyticsParams={{
          product_id: product.id,
          slug: product.slug,
          price: finalPrice,
          variant: variantLabel ?? undefined,
          dataset: product.dataset,
        }}
      />
    </div>
  );
}
