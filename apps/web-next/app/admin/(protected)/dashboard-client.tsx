"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { MessageSquare } from "lucide-react";

import Section from "@ui/components/common/section";
import Button from "@ui/components/common/button";
import Skeleton from "@ui/components/common/skeleton";
import { toast } from "@ui/components/common/toast";
import { sanitizeSearchParam as sanitize } from "@shared/lib/sanitize";
import clsx from "clsx";

import { loadDashboardMetrics, type DashboardMetrics } from "@/lib/admin/metrics";
import {
  fetchPendingReviews,
  approveReview,
  rejectReview,
  replyToReview,
  type PendingReviewItem,
} from "@/lib/admin/reviews";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}

function toCurrency(n: number) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return String(n);
  }
}

const BarsChart = dynamic(
  () => import("./dashboard-charts.client").then((mod) => mod.BarsChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-40 w-full">
        <Skeleton className="h-full w-full" />
      </div>
    ),
  },
);

const LineMiniChart = dynamic(
  () => import("./dashboard-charts.client").then((mod) => mod.LineMiniChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-40 w-full">
        <Skeleton className="h-full w-full" />
      </div>
    ),
  },
);

const GoalPieChart = dynamic(
  () => import("./dashboard-charts.client").then((mod) => mod.GoalPieChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-[140px] w-full">
        <Skeleton className="h-full w-full" />
      </div>
    ),
  },
);

const TILE_BASE =
  "relative overflow-hidden rounded-3xl border border-white/6 bg-[#0c141f]/90 p-6 shadow-[0_28px_55px_rgba(8,12,32,0.55)] backdrop-blur";
const TILE_MUTED =
  "relative overflow-hidden rounded-3xl border border-white/5 bg-[#0a121f]/85 p-6 shadow-[0_22px_38px_rgba(8,12,32,0.45)] backdrop-blur";
const TILE_ACCENT =
  "relative overflow-hidden rounded-3xl border border-sky-500/40 bg-gradient-to-br from-[#142742] via-[#0f1d33] to-[#0a1425] p-6 shadow-[0_32px_55px_rgba(14,116,219,0.35)] backdrop-blur";
const TITLE_LABEL_CLASS = "text-[11px] font-semibold uppercase tracking-[0.4em] text-slate-400";
const METRIC_VALUE_CLASS = "mt-4 text-4xl font-semibold tracking-tight text-white";

type TileTone = "base" | "muted" | "accent";

type TileProps = React.HTMLAttributes<HTMLDivElement> & {
  tone?: TileTone;
  children: ReactNode;
};

function Tile({ tone = "base", className, children, ...rest }: TileProps) {
  const toneClass = tone === "muted" ? TILE_MUTED : tone === "accent" ? TILE_ACCENT : TILE_BASE;
  return (
    <div {...rest} className={clsx(toneClass, className)}>
      {children}
    </div>
  );
}

type AdminMessage = NonNullable<PendingReviewItem["messages"]>[number];
type AdminMsgNode = { message: AdminMessage; children: AdminMsgNode[] };

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function buildAdminTree(messages: AdminMessage[] = []): AdminMsgNode[] {
  if (!Array.isArray(messages) || messages.length === 0) return [];
  const sorted = [...messages].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const map = new Map<string, AdminMsgNode>();
  const roots: AdminMsgNode[] = [];
  for (const m of sorted) {
    const node: AdminMsgNode = map.get(m.id) ?? { message: m, children: [] };
    node.message = m;
    map.set(m.id, node);
  }
  for (const m of sorted) {
    const node = map.get(m.id)!;
    if (m.parent_id && map.has(m.parent_id)) {
      map.get(m.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function MessagesTree({
  messages,
  onChooseTarget,
  currentTargetId,
  allowReply,
}: {
  messages: PendingReviewItem["messages"];
  onChooseTarget: (messageId: string | null) => void;
  currentTargetId: string | null;
  allowReply: boolean;
}) {
  const nodes = useMemo(() => buildAdminTree(messages ?? []), [messages]);
  const renderNode = (node: AdminMsgNode, depth: number) => {
    const createdLabel = new Date(node.message.created_at).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
    const messageId = node.message.id;
    const replyable = isUuid(messageId);
    const isActive = replyable && currentTargetId === messageId;
    return (
      <li
        key={node.message.id}
        className={clsx(
          "rounded-2xl border border-white/8 bg-[#101c31]/75 p-4 text-sm text-slate-200 shadow-[0_12px_30px_rgba(8,12,32,0.35)]",
          depth > 0 && "ml-5 mt-3",
        )}
      >
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.25em] text-slate-400">
          <span>{(node.message.author_role || "user").toUpperCase()}</span>
          <span className="text-slate-500">{createdLabel}</span>
        </div>
        <div className="mt-3 whitespace-pre-line text-[13px] leading-5 text-slate-100">
          {sanitize(node.message.body)}
        </div>
        {allowReply && replyable ? (
          <div className="mt-3">
            <Button
              variant="ghost"
              className={clsx(
                "!min-h-0 h-8 !rounded-full border border-white/10 bg-white/10 px-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-100 hover:bg-white/15",
                isActive && "border-sky-500/60 bg-sky-500/20 text-sky-200",
              )}
              onClick={() => onChooseTarget(messageId)}
            >
              {isActive ? "Ответ здесь" : "Ответить здесь"}
            </Button>
          </div>
        ) : null}
        {node.children.length ? (
          <ul className="mt-3 space-y-3">{node.children.map((c) => renderNode(c, depth + 1))}</ul>
        ) : null}
      </li>
    );
  };
  return (
    <div className="rounded-3xl border border-white/6 bg-[#0b1425]/70 p-4 shadow-[0_20px_38px_rgba(8,12,32,0.45)]">
      <div className="mb-3 flex items-center justify-between text-[11px] uppercase tracking-[0.35em] text-slate-400">
        <span>Messages</span>
        <div className="flex items-center gap-2 text-[10px] tracking-[0.25em] text-slate-500">
          <span>Target</span>
          <Button
            variant="ghost"
            className={clsx(
              "!min-h-0 h-8 !rounded-full border border-white/10 bg-white/10 px-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-100 hover:bg-white/15",
              !currentTargetId && "border-sky-500/60 bg-sky-500/20 text-sky-200",
            )}
            onClick={() => onChooseTarget(null)}
            disabled={!allowReply}
          >
            Root
          </Button>
        </div>
      </div>
      {nodes.length ? (
        <ul className="space-y-3">{nodes.map((n) => renderNode(n, 0))}</ul>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-center text-xs text-slate-500">
          No messages yet.
        </div>
      )}
    </div>
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

  const { kpis, sales, expenses, profit, cashflow } = metrics;
  const spotlightReview = pendingReviews[0] ?? null;
  const recentExpenses = expenses.slice(-3);

  return (
    <Section className="space-y-12 !px-3 sm:!px-6 lg:!px-10 pb-12">
      <div className="grid gap-6 lg:grid-cols-3">
        <Tile tone="accent" className="overflow-hidden">
          <div className={TITLE_LABEL_CLASS}>Cash</div>
          <div className={METRIC_VALUE_CLASS}>{toCurrency(kpis.cash)}</div>
          <div className="mt-3 text-sm text-slate-400">Available balance</div>
          <span className="pointer-events-none absolute -top-16 right-0 h-56 w-56 rounded-full bg-sky-500/25 blur-3xl" />
        </Tile>
        <Tile tone="accent" className="overflow-hidden">
          <div className={TITLE_LABEL_CLASS}>Goal Progress</div>
          <div className="mt-6 flex items-center gap-6">
            <GoalPieChart value={kpis.goalPct} />
            <div>
              <div className="text-4xl font-semibold text-white">{kpis.goalPct}%</div>
              <div className="mt-3 space-y-2 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-sky-400" />
                  Done
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-white/25" />
                  Remain
                </div>
              </div>
            </div>
          </div>
          <span className="pointer-events-none absolute -bottom-12 left-12 h-44 w-44 rounded-full bg-fuchsia-500/25 blur-3xl" />
        </Tile>
        <Tile tone="accent" className="overflow-hidden">
          <div className={TITLE_LABEL_CLASS}>Cashflow Forecast</div>
          <div className={METRIC_VALUE_CLASS}>{toCurrency(kpis.cashflowForecast)}</div>
          <div className="mt-3 text-sm text-slate-400">Next 30 days</div>
          <span className="pointer-events-none absolute -top-12 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-emerald-500/20 blur-3xl" />
        </Tile>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Tile tone="muted">
          <div className={TITLE_LABEL_CLASS}>Sales · 12 months</div>
          <div className="mt-4">
            <BarsChart data={sales} />
          </div>
        </Tile>
        <Tile tone="muted">
          <div className={TITLE_LABEL_CLASS}>Profit · 12 months</div>
          <div className="mt-4">
            <BarsChart data={profit} />
          </div>
        </Tile>
        <Tile tone="muted">
          <div className={TITLE_LABEL_CLASS}>Productivity · 7 days</div>
          <div className="mt-4">
            <LineMiniChart data={cashflow} />
          </div>
        </Tile>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Tile tone="base">
          <div className={TITLE_LABEL_CLASS}>Review pipeline</div>
          <div className="mt-6 grid grid-cols-3 gap-4 text-white">
            <Stat label="Pending" value={String(kpis.cards.pending)} />
            <Stat label="In progress" value={String(kpis.cards.inProgress)} />
            <Stat label="Done" value={String(kpis.cards.done)} />
          </div>
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-400">
            Обновляем данные каждые 60 секунд.
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
              <div className="text-xs text-slate-500">Недостаточно данных.</div>
            )}
          </div>
        </Tile>
        <Tile tone="base" className="flex flex-col gap-5">
          <div className={TITLE_LABEL_CLASS}>Latest review</div>
          {spotlightReview ? (
            <>
              <div>
                <div className="text-sm font-semibold text-white">
                  {spotlightReview.product_title || spotlightReview.product_slug || "Без названия"}
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
              Пока нет новых отзывов.
            </div>
          )}
        </Tile>
      </div>

      <Tile id="pending-reviews" tone="base" className="space-y-6 border-white/8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.35em] text-slate-400">
              <MessageSquare size={16} />
              <span>Pending reviews</span>
            </div>
            <div className="mt-3 text-3xl font-semibold text-white">{pendingTotal}</div>
          </div>
          <Button
            variant="ghost"
            className="!min-h-0 h-10 !rounded-full border border-white/10 bg-white/10 px-4 text-xs font-semibold uppercase tracking-[0.25em] text-slate-100 hover:border-white/20 hover:bg-white/15 disabled:opacity-60"
            onClick={() => void loadPending()}
            disabled={reviewsLoading}
          >
            Refresh
          </Button>
        </div>
        {reviewsLoading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-32 w-full rounded-3xl" />
            ))}
          </div>
        ) : reviewsError ? (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {reviewsError}
          </div>
        ) : pendingReviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-sm text-slate-500">
            Все отзывы обработаны.
          </div>
        ) : (
          <ul className="space-y-4">
            {pendingReviews.map((review) => {
              const currentTargetId = replyTargets[review.id] ?? null;
              const targetLabel =
                currentTargetId && isUuid(currentTargetId)
                  ? `message ${currentTargetId.slice(0, 8)}...`
                  : "root";
              const canReply = typeof review.review_id === "string" && isUuid(review.review_id);

              return (
                <li
                  key={review.id}
                  className="rounded-3xl border border-white/8 bg-[#101c31]/80 p-5 shadow-[0_22px_40px_rgba(8,12,32,0.5)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {review.product_title || review.product_slug || "Без названия"}
                      </div>
                      <div className="text-xs uppercase tracking-[0.25em] text-slate-500">
                        {review.product_slug ? `/${review.product_slug}` : "-"}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(review.created_at).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </div>
                  </div>

                  {review.review_title ? (
                    <div className="mt-3 text-sm font-medium text-white">{review.review_title}</div>
                  ) : null}

                  <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100">
                    {review.review_body || "No review text provided."}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                    <span>Rating: {review.rating != null ? review.rating : "-"}</span>
                    <span>Source: {review.source_table ?? "-"}</span>
                  </div>

                  {review.reply_body ? (
                    <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100">
                      <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                        Admin reply
                        {review.reply_created_at
                          ? ` · ${new Date(review.reply_created_at).toLocaleString(undefined, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}`
                          : ""}
                      </div>
                      <div className="mt-2 whitespace-pre-line">{review.reply_body}</div>
                    </div>
                  ) : null}

                  {Array.isArray(review.messages) && review.messages.length > 0 ? (
                    <div className="mt-4">
                      <MessagesTree
                        messages={review.messages}
                        onChooseTarget={(id) => setReplyTargets((prev) => ({ ...prev, [review.id]: id }))}
                        currentTargetId={currentTargetId}
                        allowReply={canReply}
                      />
                    </div>
                  ) : null}

                  <div className="mt-4 space-y-3">
                    <textarea
                      rows={3}
                      className="w-full rounded-2xl border border-white/10 bg-[#0a1524]/80 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500/50 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                      placeholder="Write a reply..."
                      value={replyDrafts[review.id] ?? ""}
                      onChange={(event) =>
                        setReplyDrafts((prev) => ({ ...prev, [review.id]: event.target.value }))
                      }
                      disabled={!canReply || replySavingId === review.id || moderatingId === review.id}
                    />
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="uppercase tracking-[0.3em]">Target: {targetLabel}</span>
                      {!canReply ? (
                        <span className="text-rose-300">Ответ невозможен: отзыв не найден.</span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="primary"
                        className="!min-h-0 h-10 !rounded-full !bg-sky-500 px-5 text-xs font-semibold uppercase tracking-[0.25em] text-white shadow-[0_12px_30px_rgba(56,189,248,0.4)] hover:bg-sky-400 disabled:opacity-60"
                        disabled={!canReply || replySavingId === review.id || moderatingId === review.id}
                        onClick={() => void handleReply(review)}
                      >
                        {replySavingId === review.id ? "Sending..." : "Reply"}
                      </Button>
                      <Button
                        variant="ghost"
                        className="!min-h-0 h-10 !rounded-full border border-white/10 bg-white/10 px-4 text-xs font-semibold uppercase tracking-[0.25em] text-slate-100 hover:border-white/20 hover:bg-white/15 disabled:opacity-60"
                        disabled={!canReply || moderatingId === review.id || replySavingId === review.id}
                        onClick={() => void handleModerate(review, "approve")}
                      >
                        {moderatingId === review.id ? "Saving..." : "Approve"}
                      </Button>
                      <Button
                        variant="ghost"
                        className="!min-h-0 h-10 !rounded-full border border-rose-500/40 bg-rose-500/10 px-4 text-xs font-semibold uppercase tracking-[0.25em] text-rose-200 hover:border-rose-400 hover:bg-rose-500/20 disabled:opacity-60"
                        disabled={!canReply || moderatingId === review.id || replySavingId === review.id}
                        onClick={() => void handleModerate(review, "reject")}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Tile>
    </Section>
  );

}





