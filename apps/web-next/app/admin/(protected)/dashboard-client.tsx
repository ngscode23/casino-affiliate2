"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";

import Section from "@ui/components/common/section";
import Button from "@ui/components/common/button";
import Skeleton from "@ui/components/common/skeleton";
import { toast } from "@ui/components/common/toast";

import { loadDashboardMetrics, type DashboardMetrics } from "@/lib/admin/metrics";
import {
  fetchPendingReviews,
  approveReview,
  rejectReview,
  replyToReview,
  type PendingReviewItem,
} from "@/lib/admin/reviews";

import { Tile, Stat, TITLE_LABEL_CLASS, METRIC_VALUE_CLASS, toCurrency } from "./dashboard-primitives";

const DashboardChartsSection = dynamic(
  () => import("./dashboard-charts").then((mod) => mod.DashboardChartsSection),
  { ssr: false, loading: () => <ChartsPlaceholder /> },
);

const PendingReviewsSection = dynamic(() => import("./dashboard-reviews"), {
  ssr: false,
  loading: () => <ReviewsPanelPlaceholder />,
});

function ChartsPlaceholder() {
  return (
    <div className="space-y-10">
      <div className="grid gap-6 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <Tile key={`chart-top-${idx}`} tone="accent" className="overflow-hidden">
            <div className="h-4 w-28 rounded-full bg-white/20 animate-pulse" />
            <div className="mt-4 h-8 w-40 rounded-full bg-white/30 animate-pulse" />
            <div className="mt-3 h-4 w-28 rounded-full bg-white/20 animate-pulse" />
          </Tile>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <Tile key={`chart-bottom-${idx}`} tone="muted">
            <div className="h-4 w-32 rounded-full bg-white/15 animate-pulse" />
            <div className="mt-4 h-40 w-full rounded-2xl bg-white/10 animate-pulse" />
          </Tile>
        ))}
      </div>
    </div>
  );
}

function ReviewsPanelPlaceholder() {
  return (
    <Tile tone="base" className="space-y-4">
      <div className="h-5 w-40 rounded-full bg-white/20 animate-pulse" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={`pending-row-${idx}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="h-4 w-1/2 rounded-full bg-white/20 animate-pulse" />
            <div className="mt-2 h-4 w-3/4 rounded-full bg-white/10 animate-pulse" />
          </div>
        ))}
      </div>
    </Tile>
  );
}

export function AdminDashboardClient() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pendingReviews, setPendingReviews] = useState<PendingReviewItem[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [moderatingId, setModeratingId] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replySavingId, setReplySavingId] = useState<string | null>(null);
  const [replyTargets, setReplyTargets] = useState<Record<string, string | null>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await loadDashboardMetrics();
        if (!cancelled) setMetrics(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadPending = useCallback(async () => {
    setReviewsLoading(true);
    setReviewsError(null);
    try {
      const { items, total } = await fetchPendingReviews(5);
      setPendingReviews(items);
      setPendingTotal(total);
      setReplyDrafts((prev) => {
        const next: Record<string, string> = {};
        for (const item of items) {
          next[item.id] = prev[item.id] ?? item.reply_body ?? "";
        }
        return next;
      });
    } catch (err) {
      setReviewsError(err instanceof Error ? err.message : String(err));
    } finally {
      setReviewsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPending();
  }, [loadPending]);

  const scrollToReviews = useCallback(() => {
    if (typeof window === "undefined") return;
    document.getElementById("pending-reviews")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleModerate = useCallback(
    async (review: PendingReviewItem, action: "approve" | "reject") => {
      const payload: Record<string, unknown> = {
        review_id: review.id,
        product_uid: review.product_uid ?? undefined,
        source_schema: review.source_schema,
        source_table: review.source_table,
        source_pk: review.source_pk,
      };

      try {
        setModeratingId(review.id);
        const changed =
          action === "approve" ? await approveReview(payload) : await rejectReview(payload);
        if (changed) {
          toast(action === "approve" ? "Review approved" : "Review rejected", { variant: "success" });
          setReplyDrafts((prev) => {
            const next = { ...prev };
            delete next[review.id];
            return next;
          });
          setPendingReviews((prev) => prev.filter((item) => item.id !== review.id));
          setPendingTotal((prev) => {
            const nextTotal = Math.max(0, prev - 1);
            const remainingAfterRemoval = Math.max(0, pendingReviews.length - 1);
            if (nextTotal > remainingAfterRemoval) {
              void loadPending();
            }
            return nextTotal;
          });
        } else {
          toast("No changes applied", { variant: "info" });
        }
      } catch (err) {
        toast(err instanceof Error ? err.message : String(err), { variant: "error" });
      } finally {
        setModeratingId(null);
      }
    },
    [loadPending, pendingReviews.length, pendingTotal],
  );

  const handleReply = useCallback(
    async (review: PendingReviewItem) => {
      const draft = (replyDrafts[review.id] ?? "").trim();
      if (!draft) {
        toast("Введите текст ответа перед отправкой", { variant: "error" });
        return;
      }
      try {
        setReplySavingId(review.id);
        await replyToReview({ review_id: review.review_id ?? review.id, reply: draft, parent_message_id: (replyTargets[review.id] ?? null), product_uid: review.product_uid ?? undefined });
        toast("Reply sent and review approved", { variant: "success" });
        setReplyDrafts((prev) => {
          const next = { ...prev };
          delete next[review.id];
          return next;
        });
        setReplyTargets((prev) => {
          const next = { ...prev };
          delete next[review.id];
          return next;
        });
        setPendingReviews((prev) => prev.filter((item) => item.id !== review.id));
        setPendingTotal((prev) => {
          const nextTotal = Math.max(0, prev - 1);
          const remainingAfterRemoval = Math.max(0, pendingReviews.length - 1);
          if (nextTotal > remainingAfterRemoval) {
            void loadPending();
          }
          return nextTotal;
        });
      } catch (err) {
        toast(err instanceof Error ? err.message : String(err), { variant: "error" });
      } finally {
        setReplySavingId(null);
      }
    },
    [loadPending, pendingReviews.length, pendingTotal, replyDrafts, replyTargets],
  );

  if (loading) {
    return (
      <Section className="space-y-10 !px-3 sm:!px-6 lg:!px-10 pb-12">
        <div className="grid gap-6 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Tile key={`kpi-${index}`} tone={index === 1 ? "accent" : "base"}>
              <Skeleton className="h-3 w-24 rounded-full" />
              <Skeleton className="mt-4 h-10 w-1/3 rounded-xl" />
            </Tile>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Tile key={`chart-${index}`} tone="muted">
              <Skeleton className="h-40 w-full rounded-3xl" />
            </Tile>
          ))}
        </div>
        <Tile tone="base">
          <Skeleton className="h-5 w-56 rounded-full" />
          <Skeleton className="mt-4 h-32 w-full rounded-3xl" />
        </Tile>
      </Section>
    );
  }

  if (error) {
    return (
      <Section className="!px-3 sm:!px-6 lg:!px-10 pb-12">
        <Tile tone="base">
          <div className="text-sm text-rose-300">{error}</div>
        </Tile>
      </Section>
    );
  }

  if (!metrics) return null;

  const { kpis, expenses } = metrics;
  const spotlightReview = pendingReviews[0] ?? null;
  const recentExpenses = expenses.slice(-3);

  return (
    <Section className="space-y-12 !px-3 sm:!px-6 lg:!px-10 pb-12">
      <DashboardChartsSection metrics={metrics} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Tile tone="base">
          <div className={TITLE_LABEL_CLASS}>Review pipeline</div>
          <div className="mt-6 grid grid-cols-3 gap-4 text-white">
            <Stat label="Pending" value={String(kpis.cards.pending)} />
            <Stat label="In progress" value={String(kpis.cards.inProgress)} />
            <Stat label="Done" value={String(kpis.cards.done)} />
          </div>
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-400">
            Обновление каждые 60 минут.
          </div>
        </Tile>
        <Tile tone="base">
          <div className={TITLE_LABEL_CLASS}>Top spend</div>
          <div className="mt-6 space-y-4 text-sm text-slate-200">
            {recentExpenses.length ? (
              [...recentExpenses].reverse().map((point) => (
                <div key={point.label} className="flex items-center justify-between">
                  <span className="uppercase tracking-[0.25em] text-slate-500">{point.label}</span>
                  <span className="font-semibold text-white">{toCurrency(point.value)}</span>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-500">Нет данных по расходам.</div>
            )}
          </div>
        </Tile>
        <Tile tone="base" className="flex flex-col gap-5">
          <div className={TITLE_LABEL_CLASS}>Latest review</div>
          {spotlightReview ? (
            <>
              <div>
                <div className="text-sm font-semibold text-white">
                  {spotlightReview.product_title || spotlightReview.product_slug || "Неизвестный товар"}
                </div>
                <div className="text-xs uppercase tracking-[0.25em] text-slate-500">
                  {spotlightReview.product_slug ? `/${spotlightReview.product_slug}` : "-"}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100">
                {(spotlightReview.review_body ?? "No review text provided.").slice(0, 220)}
                {spotlightReview.review_body && spotlightReview.review_body.length > 220 ? "…" : ""}
              </div>
              <div className="mt-auto flex items-center gap-3">
                <Button
                  variant="ghost"
                  className="!min-h-0 h-10 !rounded-full border border-white/10 bg-white/10 px-4 text-xs font-semibold uppercase tracking-[0.25em] text-slate-100 hover:border-white/20 hover:bg-white/15"
                  onClick={scrollToReviews}
                >
                  Manage
                </Button>
                <Button
                  variant="primary"
                  className="!min-h-0 h-10 !rounded-full !bg-[#f40083] px-5 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-[0_12px_30px_rgba(244,0,131,0.35)] hover:shadow-[0_16px_36px_rgba(244,0,131,0.45)]"
                  onClick={scrollToReviews}
                >
                  Reply
                </Button>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-sm text-slate-500">
              Еще нет свежих отзывов.
            </div>
          )}
        </Tile>
      </div>

      <PendingReviewsSection
        pendingReviews={pendingReviews}
        pendingTotal={pendingTotal}
        loading={reviewsLoading}
        error={reviewsError}
        replyDrafts={replyDrafts}
        replyTargets={replyTargets}
        replySavingId={replySavingId}
        moderatingId={moderatingId}
        onReload={() => void loadPending()}
        onDraftChange={(id, value) => setReplyDrafts((prev) => ({ ...prev, [id]: value }))}
        onSelectTarget={(reviewId, targetId) => setReplyTargets((prev) => ({ ...prev, [reviewId]: targetId }))}
        onReply={handleReply}
        onModerate={handleModerate}
      />
    </Section>
  );
}

