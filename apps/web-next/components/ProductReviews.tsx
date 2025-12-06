"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthState } from "@shared/lib/authStore";
import { sanitizeSearchParam as sanitize } from "@shared/lib/sanitize";
import { mutedTextSm } from "@/styles/classnames";
import { RATING_ORDER, type RatingScore, type SortKey } from "./product-reviews/constants";
import ReviewStats from "@/components/product-reviews/ReviewStats";
import ReviewFilters from "@/components/product-reviews/ReviewFilters";
import ReviewForm from "@/components/product-reviews/ReviewForm";
import ReviewsList from "@/components/product-reviews/ReviewsList";
import { useProductReviews } from "./product-reviews/useProductReviews";
import { useReviewForm } from "./product-reviews/useReviewForm";
import { AsyncSection } from "@/components/ui/AsyncSection";

type ProductReviewsProps = {
  productId: string;
  slug: string;
  initialAverage: number;
  initialCount: number;
};

type IdleCleanup = () => void;

function runOnIdle(callback: () => void): IdleCleanup | undefined {
  if (typeof window === "undefined") return undefined;
  const win = window as typeof window & {
    requestIdleCallback?: (cb: IdleRequestCallback, options?: IdleRequestOptions) => number;
    cancelIdleCallback?: (handle: number) => void;
  };
  if (typeof win.requestIdleCallback === "function") {
    const handle = win.requestIdleCallback(() => callback(), { timeout: 1800 });
    return () => {
      win.cancelIdleCallback?.(handle);
    };
  }
  if (process.env.NODE_ENV !== "production" && typeof queueMicrotask === "function") {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) callback();
    });
    return () => {
      cancelled = true;
    };
  }
  const timeout = setTimeout(callback, 180);
  return () => clearTimeout(timeout);
}

type ReviewFilterEventDetail = { rating: number | null };
const REVIEW_SET_FILTER_EVENT = "product-reviews:set-filter";
const REVIEW_FILTER_CHANGE_EVENT = "product-reviews:filter-change";

const REVIEW_DATE_FORMATTER = typeof Intl !== "undefined" ? new Intl.DateTimeFormat("ru-RU") : undefined;
function formatReviewDate(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  if (REVIEW_DATE_FORMATTER) {
    try {
      return REVIEW_DATE_FORMATTER.format(date);
    } catch {
      /* ignore format errors */
    }
  }
  try {
    return date.toLocaleDateString("ru-RU");
  } catch {
    return value;
  }
}

function StatsPlaceholder() {
  return (
    <aside className="min-w-0 space-y-3 rounded-2xl border border-border/30 bg-card/70 p-4" aria-busy="true">
      <div className="h-8 w-24 rounded-full bg-border/30 animate-pulse" />
      <div className="h-5 w-32 rounded-full bg-border/20 animate-pulse" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div key={`stat-${idx}`} className="flex items-center gap-3">
            <span className="h-4 w-10 rounded-full bg-border/30 animate-pulse" />
            <div className="h-2 flex-1 rounded-full bg-border/20 animate-pulse" />
            <span className="h-3 w-12 rounded-full bg-border/20 animate-pulse" />
          </div>
        ))}
      </div>
    </aside>
  );
}

function FiltersPlaceholder() {
  return (
    <div className="flex w-full flex-col gap-3 text-xs uppercase tracking-[0.24em] text-muted sm:w-auto" aria-busy="true">
      <span className="h-3 w-24 rounded-full bg-border/30 animate-pulse sm:whitespace-nowrap" />
      <div className="rounded-2xl border border-border/30 bg-card/70 p-2 shadow-sm">
        <div className="flex flex-wrap gap-2 text-xs">
          {Array.from({ length: 3 }).map((_, idx) => (
            <span key={`filter-pill-${idx}`} className="h-9 w-28 rounded-xl bg-border/20 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

function FormPlaceholder() {
  return (
    <div className="space-y-4 rounded-2xl border border-border/30 bg-card/70 p-4" aria-busy="true">
      <div className="h-5 w-36 rounded-full bg-border/30 animate-pulse" />
      <div className="flex items-center gap-2">
        {Array.from({ length: 5 }).map((_, idx) => (
          <span key={`star-${idx}`} className="h-6 w-6 rounded-full bg-border/30 animate-pulse" />
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="h-11 rounded-xl bg-border/20 animate-pulse" />
        <div className="h-24 rounded-xl bg-border/20 animate-pulse" />
      </div>
      <div className="h-10 w-40 rounded-full bg-border/30 animate-pulse" />
    </div>
  );
}

function ReviewsPlaceholder() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-6 w-40 rounded-full bg-border/30" />
        <div className="h-10 w-48 rounded-full bg-border/20" />
      </div>
      <div className="grid gap-3 sm:grid-cols-5">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div key={idx} className="h-8 rounded-full bg-border/20" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, idx) => (
          <div key={idx} className="space-y-2 rounded-2xl border border-border/30 bg-card/70 p-4">
            <div className="h-4 w-32 rounded-full bg-border/30" />
            <div className="h-3 w-full rounded-full bg-border/20" />
            <div className="h-3 w-5/6 rounded-full bg-border/20" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProductReviews({ productId, slug, initialAverage, initialCount }: ProductReviewsProps) {
  const { user } = useAuthState();
  const containerRef = useRef<HTMLElement | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (ready) return;
    if (typeof window === "undefined") return;

    const node = containerRef.current;
    const markReady = () => setReady(true);

    if (node && "IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            markReady();
          }
        },
        { rootMargin: "160px 0px" },
      );
      observer.observe(node);
      return () => observer.disconnect();
    }

    const idleCleanup = runOnIdle(markReady);
    return () => idleCleanup?.();
  }, [ready]);

  const {
    items,
    loading,
    loadingMore,
    error,
    summary,
    ownReview,
    sortKey,
    activeRating,
    buckets,
    hasMore,
    nextCursor,
    votePending,
    setSortKey,
    setRatingFilter,
    handleBucketSelect,
    loadMore,
    vote,
    reply,
    refresh,
    setOwnReview,
    setSummary,
  } = useProductReviews({
    productId,
    initialAverage,
    initialCount,
    ready,
    userId: user?.id,
  });

  const summaryAverageLabel = summary.count > 0 ? summary.average.toFixed(1) : "-";
  const canSubmit = hydrated && Boolean(user);

  const handleAfterSubmit = useCallback(
    async ({ review, stats }: { review: any; stats?: { avg_rating?: number; ratings_count?: number } | null }) => {
      if (review) setOwnReview(review);
      if (stats) {
        const nextCount =
          typeof stats.ratings_count === "number" ? Math.max(0, Math.trunc(stats.ratings_count)) : summary.count;
        const nextAverage =
          typeof stats.avg_rating === "number"
            ? Math.min(5, Math.max(0, Number(stats.avg_rating.toFixed(2))))
            : summary.average;
        setSummary({ count: nextCount, average: nextAverage });
      }
      await refresh({ resetCursor: true });
    },
    [refresh, setOwnReview, setSummary, summary.average, summary.count],
  );

  const {
    rating,
    title,
    body,
    formError,
    formSuccess,
    submitting,
    isEditing,
    setRating,
    setTitle,
    setBody,
    handleSubmit,
  } = useReviewForm({
    productId,
    slug,
    canSubmit,
    ownReview,
    onAfterSubmit: handleAfterSubmit,
  });

  const handleSortChange = useCallback(
    (next: SortKey) => {
      setSortKey(next);
      refresh({ resetCursor: true });
    },
    [refresh, setSortKey],
  );

  const normalizedBuckets = useMemo(
    () =>
      buckets.map((bucket) => ({
        ...bucket,
        score: Math.min(5, Math.max(1, Number(bucket.score))) as RatingScore,
      })),
    [buckets],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleExternal = (event: Event) => {
      const detail = (event as CustomEvent<ReviewFilterEventDetail>).detail;
      if (!detail) {
        setRatingFilter(null);
        return;
      }
      const rating = detail.rating;
      if (rating === null || rating === undefined) {
        setRatingFilter(null);
        return;
      }
      if (typeof rating === "number" && RATING_ORDER.includes(rating as RatingScore)) {
        setRatingFilter(rating as RatingScore);
      }
    };
    window.addEventListener(REVIEW_SET_FILTER_EVENT, handleExternal);
    return () => window.removeEventListener(REVIEW_SET_FILTER_EVENT, handleExternal);
  }, [setRatingFilter]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.dispatchEvent(
        new CustomEvent<ReviewFilterEventDetail>(REVIEW_FILTER_CHANGE_EVENT, {
          detail: { rating: activeRating },
        }),
      );
    } catch {
      /* ignore */
    }
  }, [activeRating]);

  if (!ready) {
    return (
      <section
        id="reviews"
        aria-label="Отзывы"
        ref={containerRef}
        className="space-y-6 rounded-3xl border border-border/40 bg-card/60 p-4 sm:p-6"
      >
        <ReviewsPlaceholder />
      </section>
    );
  }

  return (
    <section
      id="reviews"
      aria-label="Отзывы"
      ref={containerRef}
      className="space-y-6 rounded-3xl border border-border/40 bg-card/60 p-4 sm:p-6"
    >
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-fg">
            Отзывы о продукте <span className="text-muted-foreground">/</span>
            <span className="text-primary">{summaryAverageLabel}</span>
          </h2>
          <p className={mutedTextSm}>{summary.count ? `Уже ${summary.count} отзывов` : "Пока нет отзывов"}</p>
        </div>
        <Suspense fallback={<FiltersPlaceholder />}>
          <ReviewFilters sortKey={sortKey} onSortChange={handleSortChange} />
        </Suspense>
      </header>
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <Suspense fallback={<StatsPlaceholder />}>
          <ReviewStats averageLabel={summaryAverageLabel} count={summary.count} buckets={normalizedBuckets} activeRating={activeRating} onBucketSelect={handleBucketSelect} />
        </Suspense>
        <div className="min-w-0 space-y-6">
          <Suspense fallback={<FormPlaceholder />}>
            <ReviewForm
              rating={rating}
              title={title}
              body={body}
              canSubmit={canSubmit}
              submitting={submitting}
              isEditing={isEditing}
              formError={formError}
              formSuccess={formSuccess}
              onRatingChange={setRating}
              onTitleChange={setTitle}
              onBodyChange={setBody}
              onSubmit={handleSubmit}
            />
          </Suspense>
          <AsyncSection
            status={error ? "error" : loading ? "loading" : "success"}
            skeleton={<ReviewsPlaceholder />}
          >
            <ReviewsList
              items={items}
              loading={loading}
              error={error}
              hasMore={hasMore}
              loadingMore={loadingMore}
              nextCursor={nextCursor}
              votePending={votePending}
              userId={user?.id ?? null}
              formatDate={formatReviewDate}
              sanitize={sanitize}
              onLoadMore={loadMore}
              onVote={vote}
              onReply={reply}
            />
          </AsyncSection>
        </div>
      </div>
    </section>
  );
}
