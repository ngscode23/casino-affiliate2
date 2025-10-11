"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ChevronDown, Star, ThumbsDown, ThumbsUp } from "lucide-react";
import * as SelectPrimitive from "@radix-ui/react-select";
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

export default function ProductReviews({ productId, slug, initialAverage, initialCount }: ProductReviewsProps) {
  const { user } = useAuthState();
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [summary, setSummary] = useState({ average: initialAverage, count: initialCount });
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
        setItems((prev) => (isAppend ? dedupeReviews([...prev, ...normalized]) : dedupeReviews(normalized)));
        const avg = typeof json.stats?.avg_rating === "number" ? json.stats.avg_rating : initialAverage;
        const count =
          typeof json.stats?.ratings_count === "number"
            ? json.stats.ratings_count
            : typeof json.items?.length === "number"
              ? json.items.length
              : initialCount;
        setSummary({
          average: Number.isFinite(avg) ? Number(avg) : initialAverage,
          count: Number(count) || 0,
        });
        setOwnReview(json.own_review ?? null);
        setNextCursor(json.nextCursor ?? null);
        setHasMore(Boolean(json.nextCursor ?? json.hasMore));
        setBuckets(normalizeBuckets(json.buckets));
        setError(null);
      } catch (err: any) {
        const message = err?.message ?? "Не удалось загрузить отзывы";
        setError(message);
        if (!isAppend) {
          setItems([]);
          setNextCursor(null);
          setHasMore(false);
        }
      } finally {
        if (isAppend) {
          setLoadingMore(false);
        } else if (!silent) {
          setLoading(false);
        }
      }
    },
    [productId, sortKey, activeRating, initialAverage, initialCount],
  );

  const handleBucketSelect = useCallback((score: RatingScore) => {
    setActiveRating((prev) => (prev === score ? null : score));
    setNextCursor(null);
    setHasMore(false);
    setItems([]);
    setLoading(true);
    setError(null);
  }, []);

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
    fetchReviews();
  }, [fetchReviews]);

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
          const nextCount = Number(response.stats.ratings_count ?? summary.count) || summary.count;
          const nextAverage = Number(response.stats.avg_rating ?? summary.average) || summary.average;
          setSummary({ count: nextCount, average: nextAverage });
        }
        try {
          track({
            name: "submit_review",
            params: { product_id: productId, slug, rating },
          });
        } catch {
          /* ignore analytics errors */
        }
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
  return (
    <section id="reviews" aria-label="Отзывы" className="space-y-6 rounded-3xl border border-border/40 bg-card/60 p-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-fg">Отзывы покупателей</h2>
          <p className="text-sm text-muted-foreground">
            Средняя оценка: <span className="font-semibold text-fg">{summary.average.toFixed(1)}</span> на основе{" "}
            <span className="font-semibold text-fg">{summary.count}</span> отзывов
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <label htmlFor="reviews-sort" className="text-xs uppercase tracking-[0.24em] text-muted sm:whitespace-nowrap">
            Сортировка
          </label>
          <ReviewSortSelect value={sortKey} onChange={handleSortChange} />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-4 rounded-2xl border border-border/30 bg-card/70 p-4">
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

        <div className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border/30 bg-card/70 p-4">
            <h3 className="text-lg font-semibold text-fg">{isEditing ? "Редактировать отзыв" : "Оставить отзыв"}</h3>
            <div>
              <p className="text-sm text-muted-foreground">Оценка товара</p>
              <div className="mt-2 flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, idx) => {
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

            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">Минимум {MIN_BODY_LENGTH} символов</span>
              <button
                type="submit"
                disabled={!canSubmit || submitting}
                className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-primaryfg transition hover:-translate-y-[1px] hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
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
                    <li key={`${review.created_at}-${idx}`} className="rounded-2xl border border-border/30 bg-card/70 p-4">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <div className="flex items-center gap-1 text-amber-400">
                          {Array.from({ length: 5 }).map((_, starIdx) => (
                            <Star
                              key={starIdx}
                              className={cn(
                                "h-4 w-4",
                                starIdx < Math.round(review.rating) ? "fill-amber-400 text-amber-400" : "text-border",
                              )}
                            />
                          ))}
                        </div>
                        <span className="font-medium text-fg">{review.title || `Отзыв ${idx + 1}`}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(review.created_at).toLocaleDateString("ru-RU")}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-fg/90">{review.body}</p>
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

function ReviewSortSelect({
  value,
  onChange,
}: {
  value: SortKey;
  onChange: (next: SortKey) => void;
}) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={(next) => onChange(next as SortKey)}>
      <SelectPrimitive.Trigger
        id="reviews-sort"
        className={cn(
          "inline-flex h-10 w-full max-w-[240px] items-center justify-between gap-3 rounded-full border border-border/50 bg-card px-4 text-sm font-medium text-fg shadow-[0_14px_40px_-24px_rgba(15,23,42,0.55)] transition",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-card",
          "data-[state=open]:border-primary/60 data-[state=open]:ring-2 data-[state=open]:ring-primary/40",
        )}
        aria-label="Сортировка отзывов"
      >
        <SelectPrimitive.Value placeholder="Выберите сортировку" />
        <SelectPrimitive.Icon asChild>
          <ChevronDown
            className="h-4 w-4 text-muted transition-transform duration-200 data-[state=open]:rotate-180"
            aria-hidden
          />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className={cn(
            "z-[260] w-[var(--radix-select-trigger-width)] min-w-[220px] overflow-hidden rounded-2xl border border-border/60 bg-[rgba(12,18,28,0.98)] text-sm text-fg shadow-[0_32px_80px_-32px_rgba(11,17,26,0.8)] backdrop-blur",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          )}
          position="popper"
          sideOffset={6}
        >
          <SelectPrimitive.Viewport className="p-1">
            {SORT_OPTIONS.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className={cn(
                  "relative flex w-full select-none items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm transition",
                  "text-muted-foreground data-[state=checked]:text-primary data-[state=checked]:font-semibold",
                  "data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary data-[highlighted]:outline-none",
                )}
              >
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="flex items-center text-primary">
                  <Check className="h-4 w-4" aria-hidden />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}






