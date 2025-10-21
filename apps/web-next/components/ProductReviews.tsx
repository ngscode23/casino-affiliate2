"use client";

import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import { Star, ThumbsDown, ThumbsUp } from "lucide-react";
import { addReview } from "@shared/ecom/api/client";
import { useAuthState } from "@shared/lib/authStore";
import { track } from "@shared/lib/analytics";
import { cn } from "@shared/lib/cn";

type ReviewVotes = {
  helpful: number;
  notHelpful: number;
  score: number;
  user_vote: 1 | -1 | null;
};

type ReviewItem = {
  rating: number;
  title: string;
  body: string;
  created_at: string;
  createdLabel: string;
  author_id: string;
  votes: ReviewVotes;
};

type OwnReview = {
  rating: number;
  title: string;
  body: string;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ReviewsResponse = {
  ok: boolean;
  items: ReviewItem[];
  stats: { avg_rating: number; ratings_count: number } | null;
  own_review?: OwnReview | null;
  nextCursor?: string | null;
  hasMore?: boolean;
  buckets?: Array<{ score?: number; count?: number; percent?: number }>;
  message?: string;
  code?: string;
};

type SortKey = "newest" | "oldest" | "rating_desc" | "rating_asc";
const RATING_ORDER = [5, 4, 3, 2, 1] as const;
type RatingScore = (typeof RATING_ORDER)[number];
type Bucket = { score: RatingScore; count: number; percent: number };
const PAGE_SIZE = 20;
const STAR_INDEXES = [0, 1, 2, 3, 4] as const;
const REVIEW_DATE_FORMATTER =
  typeof Intl !== "undefined" ? new Intl.DateTimeFormat("ru-RU") : undefined;

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

type ReviewFilterEventDetail = { rating: number | null };
type ReviewStatsEventDetail = {
  summary?: { average?: number | null; count?: number | null };
  buckets?: Array<{ score?: number; count?: number; value?: number; rating?: number; percent?: number }>;
};

function normalizeAverageRating(value: unknown, fallback = 0): number {
  const numeric = Number(value ?? fallback ?? 0);
  let rating = Number.isFinite(numeric) ? numeric : Number(fallback ?? 0);
  if (!Number.isFinite(rating)) rating = 0;
  if (rating > 5 && rating <= 100) {
    rating = rating / 20;
  }
  if (rating < 0) rating = 0;
  if (rating > 5) rating = 5;
  return Number(rating.toFixed(2));
}

function normalizeRatingsCount(value: unknown, fallback = 0): number {
  const numeric = Number(value ?? fallback ?? 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Math.max(0, Math.trunc(numeric));
}

const REVIEW_SET_FILTER_EVENT = "product-reviews:set-filter";
const REVIEW_FILTER_CHANGE_EVENT = "product-reviews:filter-change";
const REVIEW_STATS_EVENT = "product-reviews:stats";

function normalizeBuckets(input: ReviewsResponse["buckets"]): Bucket[] {
  const map = new Map<RatingScore, Bucket>();
  if (Array.isArray(input)) {
    for (const raw of input) {
      const score = Number(raw?.score);
      if (RATING_ORDER.includes(score as RatingScore)) {
        const typedScore = score as RatingScore;
        const count = Number(raw?.count) || 0;
        const percent = Number(raw?.percent) || 0;
        map.set(typedScore, { score: typedScore, count, percent });
      }
    }
  }
  return RATING_ORDER.map((score) => map.get(score) ?? { score, count: 0, percent: 0 });
}

function dedupeReviews(items: ReviewItem[]): ReviewItem[] {
  const seen = new Map<string, ReviewItem>();
  for (const item of items) {
    const key = `${item.author_id}:${item.created_at}`;
    seen.set(key, item);
  }
  return Array.from(seen.values());
}

type ProductReviewsProps = {
  productId: string;
  slug: string;
  initialAverage: number;
  initialCount: number;
};

const MIN_BODY_LENGTH = 24;
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Сначала новые" },
  { value: "oldest", label: "Сначала старые" },
  { value: "rating_desc", label: "По рейтингу (5→1)" },
  { value: "rating_asc", label: "По рейтингу (1→5)" },
];

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
  const inflightRequest = useRef<AbortController | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
const [items, setItems] = useState<ReviewItem[]>([]);
const [summary, setSummary] = useState({
  average: normalizeAverageRating(initialAverage),
  count: normalizeRatingsCount(initialCount),
});
const summaryAverageLabel = summary.count > 0 ? summary.average.toFixed(1) : "—";
  const [ownReview, setOwnReview] = useState<OwnReview | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeRating, setActiveRating] = useState<RatingScore | null>(null);
  const [buckets, setBuckets] = useState<Bucket[]>(() =>
    RATING_ORDER.map((score) => ({ score, count: 0, percent: 0 })),
  );
  const [votePending, setVotePending] = useState<string | null>(null);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    return () => inflightRequest.current?.abort();
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

  const canSubmit = hydrated && Boolean(user);
  const isEditing = Boolean(ownReview);

  const [rating, setRating] = useState<number>(5);
  const [title, setTitle] = useState<string>("");
  const [body, setBody] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (ownReview) {
      setRating(Number(ownReview.rating ?? 5) || 5);
      setTitle(ownReview.title ?? "");
      setBody(ownReview.body ?? "");
    } else if (!submitting) {
      setRating(5);
      setTitle("");
      setBody("");
    }
  }, [ownReview, submitting]);

  const handleSortChange = useCallback((next: SortKey) => {
    setSortKey(next);
    setNextCursor(null);
    setHasMore(false);
    setItems([]);
    setLoading(true);
    setError(null);
  }, []);

  const fetchReviews = useCallback(
    async (
      { cursor, append = false, silent = false }: { cursor?: string | null; append?: boolean; silent?: boolean } = {},
    ) => {
      const isAppend = append && Boolean(cursor);
      if (isAppend) {
        setLoadingMore(true);
      } else if (!silent) {
        setLoading(true);
        setError(null);
      } else {
        setError(null);
      }
      inflightRequest.current?.abort();
      const controller = new AbortController();
      inflightRequest.current = controller;
      try {
        const url = new URL("/api/reviews/list", window.location.origin);
        url.searchParams.set("product_id", productId);
        url.searchParams.set("limit", String(PAGE_SIZE));
        url.searchParams.set("sort", sortKey);
        if (activeRating) {
          url.searchParams.set("rating", String(activeRating));
        }
        if (cursor) {
          url.searchParams.set("cursor", cursor);
        }
        const res = await fetch(url.toString(), {
          headers: { accept: "application/json" },
          credentials: "include",
          signal: controller.signal,
        });
        const json = (await res.json()) as ReviewsResponse;
        if (!res.ok || json.ok === false) {
          throw new Error(json?.message || "Не удалось загрузить отзывы");
        }
        const incomingRaw = Array.isArray(json.items) ? json.items : [];
        const normalized = incomingRaw
          .map((raw) => {
            const votes = (raw as any)?.votes ?? {};
            const helpfulRaw = Number(votes?.helpful ?? 0);
            const notHelpfulRaw = Number(votes?.notHelpful ?? 0);
            const scoreRaw = Number(
              votes?.score ??
                (Number.isFinite(helpfulRaw) && Number.isFinite(notHelpfulRaw) ? helpfulRaw - notHelpfulRaw : 0),
            );
            const userVoteRaw = Number(votes?.user_vote);
            const authorId = typeof (raw as any)?.author_id === "string" ? (raw as any).author_id : "";
            const createdAt = typeof (raw as any)?.created_at === "string" ? (raw as any).created_at : "";
            return {
              rating: Number((raw as any)?.rating ?? 0) || 0,
              title: typeof (raw as any)?.title === "string" ? (raw as any).title : "",
              body: typeof (raw as any)?.body === "string" ? (raw as any).body : "",
              created_at: createdAt,
              createdLabel: formatReviewDate(createdAt),
              author_id: authorId,
              votes: {
                helpful: Number.isFinite(helpfulRaw) ? helpfulRaw : 0,
                notHelpful: Number.isFinite(notHelpfulRaw) ? notHelpfulRaw : 0,
                score: Number.isFinite(scoreRaw) ? scoreRaw : 0,
                user_vote: userVoteRaw === 1 || userVoteRaw === -1 ? (userVoteRaw as 1 | -1) : null,
              },
            } satisfies ReviewItem;
          })
          .filter((item) => Boolean(item.created_at));
        const avg = typeof json.stats?.avg_rating === "number" ? json.stats.avg_rating : initialAverage;
        const count =
          typeof json.stats?.ratings_count === "number"
            ? json.stats.ratings_count
            : typeof json.items?.length === "number"
              ? json.items.length
              : initialCount;
        const nextSummary = {
          average: normalizeAverageRating(avg, summary.average),
          count: normalizeRatingsCount(count, summary.count),
        };
        const normalizedBuckets = normalizeBuckets(json.buckets);
        startTransition(() => {
          setItems((prev) => (isAppend ? dedupeReviews([...prev, ...normalized]) : dedupeReviews(normalized)));
          setSummary(nextSummary);
          setOwnReview(json.own_review ?? null);
          setNextCursor(json.nextCursor ?? null);
          setHasMore(Boolean(json.nextCursor ?? json.hasMore));
          setBuckets(normalizedBuckets);
          setError(null);
        });
        if (typeof window !== "undefined") {
          runOnIdle(() => {
            try {
              window.dispatchEvent(
                new CustomEvent<ReviewStatsEventDetail>(REVIEW_STATS_EVENT, {
                  detail: { summary: nextSummary, buckets: normalizedBuckets },
                }),
              );
            } catch {
              /* ignore */
            }
          });
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        const message = err?.message ?? "Не удалось загрузить отзывы";
        startTransition(() => {
          setError(message);
          if (!isAppend) {
            setItems([]);
            setNextCursor(null);
            setHasMore(false);
          }
        });
      } finally {
        if (inflightRequest.current === controller) {
          inflightRequest.current = null;
          if (isAppend) {
            setLoadingMore(false);
          } else if (!silent) {
            setLoading(false);
          }
        }
      }
    },
    [productId, sortKey, activeRating, initialAverage, initialCount],
  );

  const resetFilterState = useCallback(() => {
    setNextCursor(null);
    setHasMore(false);
    setItems([]);
    setLoading(true);
    setError(null);
  }, []);

  const setRatingDirect = useCallback(
    (next: RatingScore | null) => {
      setActiveRating((prev) => {
        if (prev === next) return prev;
        resetFilterState();
        return next;
      });
    },
    [resetFilterState],
  );

  const handleBucketSelect = useCallback(
    (score: RatingScore) => {
      setActiveRating((prev) => {
        const next = prev === score ? null : score;
        if (next !== prev) {
          resetFilterState();
        }
        return next;
      });
    },
    [resetFilterState],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleExternal = (event: Event) => {
      const detail = (event as CustomEvent<ReviewFilterEventDetail>).detail;
      if (!detail) {
        setRatingDirect(null);
        return;
      }
      const rating = detail.rating;
      if (rating === null || rating === undefined) {
        setRatingDirect(null);
        return;
      }
      if (typeof rating === "number" && RATING_ORDER.includes(rating as RatingScore)) {
        setRatingDirect(rating as RatingScore);
      }
    };
    window.addEventListener(REVIEW_SET_FILTER_EVENT, handleExternal);
    return () => window.removeEventListener(REVIEW_SET_FILTER_EVENT, handleExternal);
  }, [setRatingDirect]);

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

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !nextCursor) return;
    await fetchReviews({ cursor: nextCursor, append: true, silent: true });
  }, [fetchReviews, loadingMore, nextCursor]);

  const handleVote = useCallback(
    async (review: ReviewItem, value: 1 | -1) => {
      if (!user) {
        setError("Пожалуйста, войдите, чтобы проголосовать.");
        return;
      }
      if (!review.author_id) return;
      try {
        setVotePending(review.author_id);
        const response = await fetch("/api/reviews/vote", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ product_id: productId, review_author_id: review.author_id, value }),
        });
        const json = (await response.json()) as {
          ok?: boolean;
          message?: string;
          totals?: { helpful?: number; notHelpful?: number; score?: number };
          vote?: { value?: number };
        };
        if (!response.ok || json.ok === false) {
          throw new Error(json?.message || "Не удалось сохранить голос.");
        }
        setItems((prev) =>
          prev.map((item) => {
            if (item.author_id !== review.author_id) return item;
            const helpful = Number(json.totals?.helpful ?? item.votes.helpful) || 0;
            const notHelpful = Number(json.totals?.notHelpful ?? item.votes.notHelpful) || 0;
            const score = Number.isFinite(Number(json.totals?.score))
              ? Number(json.totals?.score)
              : helpful - notHelpful;
            const userVoteValue =
              json.vote && typeof json.vote.value === "number" && (json.vote.value === 1 || json.vote.value === -1)
                ? (json.vote.value as 1 | -1)
                : null;
            return {
              ...item,
              votes: {
                helpful,
                notHelpful,
                score,
                user_vote: userVoteValue,
              },
            };
          }),
        );
      } catch (err: any) {
        setError(err?.message ?? "Не удалось сохранить голос.");
      } finally {
        setVotePending(null);
      }
    },
    [user, productId, setError],
  );

  useEffect(() => {
    if (!ready) return;
    fetchReviews();
  }, [ready, fetchReviews]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!user) {
        setFormError("Войдите, чтобы оставить отзыв.");
        return;
      }
      const cleanTitle = title.trim();
      const cleanBody = body.trim();
      if (!cleanTitle) {
        setFormError("Добавьте заголовок отзыва.");
        return;
      }
      if (cleanBody.length < MIN_BODY_LENGTH) {
        setFormError(`Текст должен быть не короче ${MIN_BODY_LENGTH} символов.`);
        return;
      }
      setFormError(null);
      setFormSuccess(false);
      setSubmitting(true);
      try {
        const response = await addReview({ productId, rating, title: cleanTitle, body: cleanBody });
        if (!response?.ok) {
          throw new Error(response?.message || "Не удалось сохранить отзыв.");
        }
        if (response.review) {
          setOwnReview(response.review);
        }
        if (response.stats) {
          const nextCount = normalizeRatingsCount(response.stats.ratings_count, summary.count);
          const nextAverage = normalizeAverageRating(response.stats.avg_rating, summary.average);
          setSummary({ count: nextCount, average: nextAverage });
        }
        runOnIdle(() => {
          try {
            track({
              name: "submit_review",
              params: { product_id: productId, slug, rating },
            });
          } catch {
            /* ignore analytics errors */
          }
        });
        await fetchReviews({ silent: true });
        setFormSuccess(true);
      } catch (err: any) {
        setFormError(err?.message ?? "Не удалось сохранить отзыв.");
      } finally {
        setSubmitting(false);
      }
    },
    [user, title, body, rating, productId, fetchReviews, slug, summary.count, summary.average],
  );

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
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-fg">Отзывы покупателей</h2>
          <p className="text-sm text-muted-foreground">
            Средняя оценка: <span className="font-semibold text-fg">{summaryAverageLabel}</span> на основе{" "}
            <span className="font-semibold text-fg">{summary.count}</span> отзывов
          </p>
        </div>
        <label className="flex w-full flex-col gap-2 text-xs uppercase tracking-[0.24em] text-muted sm:w-auto sm:flex-row sm:items-center sm:gap-3">
          <span className="sm:whitespace-nowrap">Сортировка</span>
          <select
            id="reviews-sort"
            value={sortKey}
            onChange={(event) => handleSortChange(event.target.value as SortKey)}
            className="h-10 rounded-xl border border-border/40 bg-card px-3 text-sm font-medium text-fg shadow-[0_14px_40px_-24px_rgba(15,23,42,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-card sm:min-w-[210px]"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </header>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <aside className="min-w-0 space-y-4 rounded-2xl border border-border/30 bg-card/70 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-muted">Распределение</h3>
          <ul className="space-y-2">
            {buckets.map((bucket) => {
              const active = activeRating === bucket.score;
              return (
                <li key={bucket.score}>
                  <button
                    type="button"
                    onClick={() => handleBucketSelect(bucket.score)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                      active
                        ? "border border-primary/60 bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-border/20",
                    )}
                    aria-pressed={active}
                  >
                    <span className="w-10 text-right font-medium text-fg">{bucket.score}★</span>
                    <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-border/40">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-primary"
                        style={{ width: `${bucket.percent}%` }}
                        aria-hidden
                      />
                    </div>
                    <span className="w-16 text-xs text-muted">{bucket.count} · {bucket.percent}%</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <div className="min-w-0 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border/30 bg-card/70 p-4">
            <h3 className="text-lg font-semibold text-fg">{isEditing ? "Редактировать отзыв" : "Оставить отзыв"}</h3>
            <div>
              <p className="text-sm text-muted-foreground">Оценка товара</p>
              <div className="mt-2 flex items-center gap-1">
                {STAR_INDEXES.map((idx) => {
                  const value = idx + 1;
                  return (
                    <button
                      key={value}
                      type="button"
                      className="p-1"
                      onClick={() => setRating(value)}
                      aria-label={`Оценка ${value}`}
                    >
                      <Star
                        className={cn(
                          "h-6 w-6 transition",
                          value <= rating ? "fill-amber-400 text-amber-400" : "text-border",
                        )}
                      />
                    </button>
                  );
                })}
                <span className="ml-2 text-sm text-muted-foreground">{rating} / 5</span>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label htmlFor="review-title" className="text-xs uppercase tracking-[0.24em] text-muted">
                  Заголовок
                </label>
                <input
                  id="review-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="h-11 rounded-xl border border-border/40 bg-card px-4 text-sm text-fg placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  placeholder="Например: Лучшее соотношение цены и качества"
                  maxLength={120}
                  required
                  disabled={!canSubmit || submitting}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="review-body" className="text-xs uppercase tracking-[0.24em] text-muted">
                  Отзыв
                </label>
                <textarea
                  id="review-body"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  className="min-h-[110px] rounded-xl border border-border/40 bg-card px-4 py-3 text-sm text-fg placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  placeholder="Поделитесь впечатлениями — что понравилось, что можно улучшить"
                  maxLength={2000}
                  required
                  disabled={!canSubmit || submitting}
                />
              </div>
            </div>

            {!canSubmit ? (
              <p className="rounded-xl border border-amber-400/20 bg-amber-100/10 px-3 py-2 text-sm text-amber-400">
                Войдите в аккаунт, чтобы оставить отзыв.
              </p>
            ) : null}
            {ownReview && ownReview.status && ownReview.status !== "approved" ? (
              <p className="rounded-xl border border-amber-400/20 bg-amber-100/10 px-3 py-2 text-sm text-amber-400">
                Ваш отзыв отправлен на модерацию. После одобрения он появится в списке.
              </p>
            ) : null}
            {formError ? (
              <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {formError}
              </p>
            ) : null}
            {formSuccess ? (
              <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                Спасибо! Отзыв сохранён и появится после модерации.
              </p>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <span className="text-xs text-muted-foreground">Минимум {MIN_BODY_LENGTH} символов</span>
              <button
                type="submit"
                disabled={!canSubmit || submitting}
                className="inline-flex h-11 w-full items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-primaryfg transition hover:-translate-y-[1px] hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {submitting ? "Отправка..." : (isEditing ? "Сохранить изменения" : "Отправить отзыв")}
              </button>
            </div>
          </form>

          <div className="space-y-4">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="animate-pulse rounded-2xl border border-border/20 bg-border/10 p-4">
                    <div className="h-4 w-1/3 rounded-full bg-border/40" />
                    <div className="mt-3 space-y-2">
                      <div className="h-3 w-3/4 rounded-full bg-border/30" />
                      <div className="h-3 w-2/3 rounded-full bg-border/30" />
                      <div className="h-3 w-1/2 rounded-full bg-border/30" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <p className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>
            ) : items.length === 0 ? (
              <p className="rounded-2xl border border-border/30 bg-card/70 px-4 py-3 text-sm text-muted">
                Пока нет отзывов. Будьте первым!
              </p>
            ) : (
              <div className="space-y-4">
                <ul className="space-y-4">
                  {items.map((review, idx) => (
                    <li key={`${review.created_at}-${idx}`} className="rounded-2xl border border-border/30 bg-card/70 p-4 overflow-hidden">
                      <div className="flex flex-wrap items-start gap-2 text-sm sm:items-center">
                        <div className="flex items-center gap-1 text-amber-400">
                          {STAR_INDEXES.map((starIdx) => (
                            <Star
                              key={starIdx}
                              className={cn(
                                "h-4 w-4",
                                starIdx < Math.round(review.rating) ? "fill-amber-400 text-amber-400" : "text-border",
                              )}
                            />
                          ))}
                        </div>
                        <span className="font-medium text-fg flex-1 min-w-0 break-words">{review.title || `Отзыв ${idx + 1}`}</span>
                        <span className="ml-auto shrink-0 text-xs text-muted-foreground text-right">
                          {review.createdLabel || formatReviewDate(review.created_at) || "—"}
                        </span>
                      </div>
                      <p className="mt-2 [overflow-wrap:anywhere] text-sm leading-relaxed text-fg/90">{review.body}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>Этот отзыв был полезен?</span>
                        <button
                          type="button"
                          onClick={() => handleVote(review, 1)}
                          disabled={votePending === review.author_id}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-3 py-1 transition",
                            votePending === review.author_id
                              ? "cursor-not-allowed opacity-60"
                              : "hover:-translate-y-[1px]",
                            review.votes.user_vote === 1
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border/40 text-muted-foreground hover:border-border/70 hover:text-fg",
                          )}
                          aria-label="Полезно"
                        >
                          <ThumbsUp className="h-3.5 w-3.5" aria-hidden />
                          <span>{review.votes.helpful}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleVote(review, -1)}
                          disabled={votePending === review.author_id}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-3 py-1 transition",
                            votePending === review.author_id
                              ? "cursor-not-allowed opacity-60"
                              : "hover:-translate-y-[1px]",
                            review.votes.user_vote === -1
                              ? "border-destructive/60 bg-destructive/10 text-destructive"
                              : "border-border/40 text-muted-foreground hover:border-border/70 hover:text-fg",
                          )}
                          aria-label="Не очень"
                        >
                          <ThumbsDown className="h-3.5 w-3.5" aria-hidden />
                          <span>{review.votes.notHelpful}</span>
                        </button>
                        <span className="text-muted-foreground/70">{review.votes.score >= 0 ? `+${review.votes.score}` : review.votes.score}</span>
                      </div>
                    </li>
                  ))}
                </ul>
                {hasMore ? (
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => handleLoadMore()}
                      disabled={loadingMore || !nextCursor}
                      className="inline-flex h-11 items-center justify-center rounded-full border border-border/40 bg-card px-6 text-sm font-semibold text-fg transition hover:-translate-y-[1px] hover:bg-border/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loadingMore ? "Загрузка..." : "Показать ещё"}
                    </button>
                  </div>
                ) : null}
              </div>
            )
          }
          </div>

        </div>
      </div>
    </section>
  );
}




