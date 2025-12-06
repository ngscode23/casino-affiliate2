import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { RATING_ORDER, type RatingScore, type SortKey } from "./constants";
import type { Bucket, OwnReview, ReviewItem } from "./types";

type ReviewStatsEventDetail = {
  summary?: { average?: number | null; count?: number | null };
  buckets?: Array<{ score?: number; count?: number; value?: number; rating?: number; percent?: number }>;
};

type Options = {
  productId: string;
  initialAverage: number;
  initialCount: number;
  ready: boolean;
  userId?: string | null;
};

type RefreshOpts = { resetCursor?: boolean };

type ReviewMessageDto = {
  id?: string | null;
  parent_id?: string | null;
  author_id?: string | null;
  author_role?: string | null;
  body?: string | null;
  created_at?: string | null;
};

export type ReviewItemDto = {
  rating?: number | null;
  title?: string | null;
  body?: string | null;
  created_at?: string | null;
  author_id?: string | null;
  votes?: { helpful?: number | null; notHelpful?: number | null; score?: number | null; user_vote?: number | null } | null;
  reply_body?: string | null;
  reply_created_at?: string | null;
  review_id?: string | null;
  messages?: ReviewMessageDto[] | null;
};

export type ReviewsResponseDto = {
  ok?: boolean;
  items?: ReviewItemDto[];
  stats?: { avg_rating?: number | null; ratings_count?: number | null } | null;
  own_review?: OwnReview | null;
  nextCursor?: string | null;
  hasMore?: boolean;
  buckets?: Array<{ score?: number; count?: number; percent?: number }>;
  message?: string;
  code?: string;
};

const REVIEW_STATS_EVENT = "product-reviews:stats";
const PAGE_SIZE = 20;

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

function normalizeBuckets(input: ReviewsResponseDto["buckets"]): Bucket[] {
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

function formatReviewDate(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return date.toLocaleDateString("ru-RU");
  } catch {
    return value;
  }
}

export function useProductReviews({
  productId,
  initialAverage,
  initialCount,
  ready,
  userId,
}: Options) {
  const inflightRequest = useRef<AbortController | null>(null);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [summary, setSummary] = useState({
    average: normalizeAverageRating(initialAverage),
    count: normalizeRatingsCount(initialCount),
  });
  const [ownReview, setOwnReview] = useState<OwnReview | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeRating, setActiveRating] = useState<RatingScore | null>(null);
  const [buckets, setBuckets] = useState<Bucket[]>(() =>
    RATING_ORDER.map((score) => ({ score, count: 0, percent: 0 })),
  );
  const [votePending, setVotePending] = useState<string | null>(null);

  useEffect(() => () => inflightRequest.current?.abort(), []);

  const setRatingFilter = useCallback((next: RatingScore | null) => {
    setActiveRating((prev) => (prev === next ? prev : next));
    setNextCursor(null);
    setHasMore(false);
    setItems([]);
    setLoading(true);
    setError(null);
  }, []);

  const mapReviewDto = useCallback((raw: ReviewItemDto | null | undefined): ReviewItem | null => {
    const votes = raw?.votes ?? {};
    const helpfulRaw = Number(votes?.helpful ?? 0);
    const notHelpfulRaw = Number(votes?.notHelpful ?? 0);
    const scoreRaw =
      votes?.score ??
      (Number.isFinite(helpfulRaw) && Number.isFinite(notHelpfulRaw) ? helpfulRaw - notHelpfulRaw : 0);
    const userVoteRaw = Number(votes?.user_vote);
    const authorId = typeof raw?.author_id === "string" ? raw.author_id : "";
    const createdAt = typeof raw?.created_at === "string" ? raw.created_at : "";
    const replyBodyRaw = typeof raw?.reply_body === "string" ? raw.reply_body : "";
    const replyCreatedAtRaw = typeof raw?.reply_created_at === "string" ? raw.reply_created_at : "";
    const reply = replyBodyRaw.trim()
      ? {
          body: replyBodyRaw.trim(),
          created_at: replyCreatedAtRaw || createdAt,
        }
      : null;
    const reviewId = typeof raw?.review_id === "string" ? raw.review_id : undefined;
    const messagesRaw = Array.isArray(raw?.messages) ? (raw.messages as any[]) : [];
    const messages = messagesRaw
      .map((m) => {
        const id = typeof m?.id === "string" ? m.id : "";
        if (!id) return null;
        return {
          id,
          parent_id: typeof m?.parent_id === "string" ? m.parent_id : null,
          author_id: typeof m?.author_id === "string" ? m.author_id : null,
          author_role: typeof m?.author_role === "string" ? m.author_role : null,
          body: typeof m?.body === "string" ? m.body : "",
          created_at: typeof m?.created_at === "string" ? m.created_at : createdAt,
        };
      })
      .filter(Boolean) as NonNullable<ReviewItem["messages"]>;
    if (!createdAt) return null;
    return {
      rating: Number(raw?.rating ?? 0) || 0,
      title: typeof raw?.title === "string" ? raw.title : "",
      body: typeof raw?.body === "string" ? raw.body : "",
      created_at: createdAt,
      createdLabel: formatReviewDate(createdAt),
      author_id: authorId,
      votes: {
        helpful: Number.isFinite(helpfulRaw) ? helpfulRaw : 0,
        notHelpful: Number.isFinite(notHelpfulRaw) ? notHelpfulRaw : 0,
        score: Number.isFinite(Number(scoreRaw)) ? Number(scoreRaw) : 0,
        user_vote: userVoteRaw === 1 || userVoteRaw === -1 ? (userVoteRaw as 1 | -1) : null,
      },
      reply,
      review_id: reviewId,
      messages,
    };
  }, []);

  const fetchReviews = useCallback(
    async ({ cursor, append = false, silent = false }: { cursor?: string | null; append?: boolean; silent?: boolean } = {}) => {
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
        if (activeRating) url.searchParams.set("rating", String(activeRating));
        if (cursor) url.searchParams.set("cursor", cursor);
        const res = await fetch(url.toString(), {
          headers: { accept: "application/json" },
          credentials: "include",
          signal: controller.signal,
        });
        const json = (await res.json()) as ReviewsResponseDto;
        if (!res.ok || json.ok === false) throw new Error(json?.message || "Не удалось загрузить отзывы");

        const normalized = (Array.isArray(json.items) ? json.items : [])
          .map(mapReviewDto)
          .filter(Boolean) as ReviewItem[];
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
          try {
            window.dispatchEvent(
              new CustomEvent<ReviewStatsEventDetail>(REVIEW_STATS_EVENT, {
                detail: { summary: nextSummary, buckets: normalizedBuckets },
              }),
            );
          } catch {
            /* ignore */
          }
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
    [activeRating, initialAverage, initialCount, mapReviewDto, productId, sortKey, summary.average, summary.count],
  );

  const refresh = useCallback(
    ({ resetCursor }: RefreshOpts = {}) => {
      if (resetCursor) {
        setNextCursor(null);
        setHasMore(false);
      }
      setItems([]);
      setLoading(true);
      setError(null);
      void fetchReviews({ silent: true });
    },
    [fetchReviews],
  );

  useEffect(() => {
    if (!ready) return;
    void fetchReviews();
  }, [fetchReviews, ready]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !nextCursor) return;
    await fetchReviews({ cursor: nextCursor, append: true, silent: true });
  }, [fetchReviews, loadingMore, nextCursor]);

  const vote = useCallback(
    async (review: ReviewItem, value: 1 | -1) => {
      if (!userId) {
        setError("Пожалуйста, войдите, чтобы голосовать.");
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
          throw new Error(json?.message || "Не удалось отправить голос.");
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
        setError(err?.message ?? "Не удалось отправить голос.");
      } finally {
        setVotePending(null);
      }
    },
    [productId, setError, userId],
  );

  const reply = useCallback(
    async ({ reviewId, parentMessageId, body }: { reviewId: string; parentMessageId: string | null; body: string }) => {
      if (!reviewId || !body.trim()) return;
      try {
        const res = await fetch("/api/reviews/reply", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ review_id: reviewId, parent_message_id: parentMessageId, body }),
        });
        const json = await res.json();
        if (!res.ok || json?.ok === false) throw new Error(json?.message || "Не удалось отправить ответ.");
        await fetchReviews({ silent: true });
      } catch (err: any) {
        setError(err?.message ?? "Не удалось отправить ответ.");
      }
    },
    [fetchReviews],
  );

  const handleBucketSelect = useCallback(
    (score: RatingScore) => {
      setActiveRating((prev) => {
        const next = prev === score ? null : score;
        if (next !== prev) {
          setNextCursor(null);
          setHasMore(false);
          setItems([]);
          setLoading(true);
          setError(null);
        }
        return next;
      });
    },
    [],
  );

  const state = useMemo(
    () => ({
      items,
      loading,
      error,
      hasMore,
      loadingMore,
      nextCursor,
      votePending,
      summary,
      ownReview,
      sortKey,
      activeRating,
      buckets,
    }),
    [items, loading, error, hasMore, loadingMore, nextCursor, votePending, summary, ownReview, sortKey, activeRating, buckets],
  );

  return {
    ...state,
    setSortKey,
    setRatingFilter,
    handleBucketSelect,
    loadMore,
    vote,
    reply,
    refresh,
    setOwnReview,
    setSummary,
    fetchReviews,
  };
}
