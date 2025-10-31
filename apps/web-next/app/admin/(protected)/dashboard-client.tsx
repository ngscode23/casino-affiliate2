"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { MessageSquare } from "lucide-react";

import Section from "@ui/components/common/section";
import Card from "@ui/components/common/card";
import Button from "@ui/components/common/button";
import Skeleton from "@ui/components/common/skeleton";
import { toast } from "@ui/components/common/toast";
import { sanitizeSearchParam as sanitize } from "@shared/lib/sanitize";

import { loadDashboardMetrics, type BarPoint, type LinePoint, type DashboardMetrics } from "@/lib/admin/metrics";
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
      <div className="text-sm text-(--text-dim)">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
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

function Bars({ data }: { data: BarPoint[] }) {
  const tooltipStyle = {
    background: "rgba(12,16,22,0.96)",
    border: "1px solid rgba(255,255,255,.12)",
    color: "rgb(var(--text))",
  } as React.CSSProperties;
  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
          <XAxis dataKey="label" hide tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ ...tooltipStyle, fontSize: 12 }}
            itemStyle={{ color: "rgb(var(--text))" }}
            labelStyle={{ color: "rgb(var(--text))", fontWeight: 600 }}
            cursor={{ fill: "rgba(255,255,255,0.05)" }}
          />
          <Bar dataKey="value" fill="var(--accent,#60a5fa)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function LineMini({ data }: { data: LinePoint[] }) {
  const tooltipStyle = {
    background: "rgba(12,16,22,0.96)",
    border: "1px solid rgba(255,255,255,.12)",
    color: "rgb(var(--text))",
  } as React.CSSProperties;
  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
          <XAxis dataKey="label" hide />
          <Tooltip
            contentStyle={{ ...tooltipStyle, fontSize: 12 }}
            itemStyle={{ color: "rgb(var(--text))" }}
            labelStyle={{ color: "rgb(var(--text))", fontWeight: 600 }}
            cursor={{ stroke: "rgba(255,255,255,0.2)" }}
          />
          <Line type="monotone" dataKey="value" stroke="currentColor" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
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
      <li key={node.message.id} className={depth > 0 ? "mt-2 border-l border-border/40 pl-3" : undefined}>
        <div className="text-sm">
          <div className="text-xs text-(--text-dim)">
            {(node.message.author_role || "user").toUpperCase()} • {createdLabel}
          </div>
          <div className="whitespace-pre-line text-foreground/90">{sanitize(node.message.body)}</div>
          {allowReply && replyable ? (
            <div className="mt-1 text-xs">
              <Button
                variant={isActive ? "secondary" : "soft"}
                className="h-7 min-h-0 px-2 text-xs"
                onClick={() => onChooseTarget(messageId)}
              >
                {isActive ? "Replying here" : "Reply here"}
              </Button>
            </div>
          ) : null}
        </div>
        {node.children.length ? (
          <ul className="mt-1 space-y-2">{node.children.map((c) => renderNode(c, depth + 1))}</ul>
        ) : null}
      </li>
    );
  };
  return (
    <div className="rounded-md border border-border/40 bg-card/20 p-3">
      <div className="mb-2 flex items-center justify-between text-xs text-(--text-dim)">
        <span>Messages</span>
        <div className="flex items-center gap-2">
          <span>Target:</span>
          <Button
            variant={!currentTargetId ? "secondary" : "soft"}
            className="h-7 min-h-0 px-2 text-xs"
            onClick={() => onChooseTarget(null)}
            disabled={!allowReply}
          >
            Root
          </Button>
        </div>
      </div>
      {nodes.length ? <ul className="space-y-2">{nodes.map((n) => renderNode(n, 0))}</ul> : (
        <div className="text-xs text-(--text-dim)">No messages yet.</div>
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
        toast("Введите ответ для отправки", { variant: "error" });
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
      <Section className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 9 }).map((_, index) => (
          <Card key={index} className="p-4">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="mt-3 h-10 w-1/3" />
            <Skeleton className="mt-4 h-24 w-full" />
          </Card>
        ))}
      </Section>
    );
  }

  if (error) {
    return (
      <Section className="p-6">
        <Card className="p-4 text-sm text-rose-500">{error}</Card>
      </Section>
    );
  }

  if (!metrics) return null;

  const { kpis, sales, expenses, profit, cashflow } = metrics;

  return (
    <Section className="p-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="p-4">
          <Stat label="Cash" value={toCurrency(kpis.cash)} />
        </Card>
        <Card className="p-4">
          <div className="mb-1 text-sm text-(--text-dim)">Sales Goal</div>
          <div className="grid grid-cols-2 items-center gap-2">
            <div className="h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    dataKey="value"
                    data={[
                      { name: "Done", value: kpis.goalPct },
                      { name: "Remain", value: Math.max(0, 100 - kpis.goalPct) },
                    ]}
                    innerRadius={40}
                    outerRadius={60}
                    startAngle={90}
                    endAngle={-270}
                    stroke="none"
                  >
                    <Cell fill="var(--accent,#60a5fa)" />
                    <Cell fill="rgba(255,255,255,0.08)" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="text-right">
              <div className="text-2xl font-semibold">{kpis.goalPct}%</div>
              <div className="mt-1 text-xs text-(--text-dim)">
                <span className="mr-2 inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-(--accent,#60a5fa)" />
                  Done
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-white/20" />
                  Remain
                </span>
              </div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <Stat label="Cashflow forecast" value={toCurrency(kpis.cashflowForecast)} />
        </Card>

        <Card className="p-4">
          <div className="mb-2 text-sm text-(--text-dim)">Sales (12m)</div>
          <Bars data={sales} />
        </Card>
        <Card className="p-4">
          <div className="mb-2 text-sm text-(--text-dim)">Expenses (12m)</div>
          <Bars data={expenses} />
        </Card>
        <Card className="p-4">
          <div className="mb-2 text-sm text-(--text-dim)">Profit (12m)</div>
          <Bars data={profit} />
        </Card>

        <Card className="p-4">
          <div className="text-sm text-(--text-dim)">Cards evolution</div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <Stat label="Pending" value={String(kpis.cards.pending)} />
            <Stat label="In Progress" value={String(kpis.cards.inProgress)} />
            <Stat label="Done" value={String(kpis.cards.done)} />
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-(--text-dim)">Productivity (7d)</div>
          <div className="mt-2">
            <LineMini data={cashflow} />
          </div>
        </Card>
        <Card className="p-4">
          <div className="mb-2 text-sm text-(--text-dim)">To-do</div>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li>Review supplier invoices</li>
            <li>Approve two product listings</li>
            <li>Check weekly ad spend</li>
            <li>Follow up with vendor</li>
          </ul>
        </Card>
        <Card id="pending-reviews" className="p-4 md:col-span-2 xl:col-span-3">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 text-sm text-(--text-dim)">
                <MessageSquare size={18} />
                <span>Pending reviews</span>
              </div>
              <div className="mt-1 text-2xl font-semibold">{pendingTotal}</div>
            </div>
            <Button
              variant="ghost"
              className="h-9 min-h-0 px-3 text-xs"
              onClick={() => void loadPending()}
              disabled={reviewsLoading}
            >
              Refresh
            </Button>
          </div>
          {reviewsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : reviewsError ? (
            <div className="rounded border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-400">
              {reviewsError}
            </div>
          ) : pendingReviews.length === 0 ? (
            <div className="rounded border border-border/40 bg-card/60 p-4 text-sm text-muted-foreground">
              All caught up — no pending reviews.
            </div>
          ) : (
            <ul className="space-y-3">
              {pendingReviews.map((review) => {
                const currentTargetId = replyTargets[review.id] ?? null;
                const targetLabel =
                  currentTargetId && isUuid(currentTargetId)
                    ? `message ${currentTargetId.slice(0, 8)}...`
                    : "root";
                const canReply = typeof review.review_id === "string" && isUuid(review.review_id);

                return (
                  <li key={review.id} className="rounded-lg border border-border/40 bg-card/40 p-4">
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <div>
                          <div className="text-sm font-semibold text-foreground">
                            {review.product_title || "Untitled product"}
                          </div>
                          <div className="text-xs text-(--text-dim)">
                            {review.product_slug ? `/${review.product_slug}` : "-"}
                          </div>
                        </div>
                        {review.review_title ? (
                          <div className="text-sm font-medium text-foreground">{review.review_title}</div>
                        ) : null}
                        <div className="whitespace-pre-line text-sm text-foreground/80">
                          {review.review_body || "No review text provided."}
                        </div>
                        <div className="flex flex-wrap gap-4 text-xs text-(--text-dim)">
                          <span>Rating: {review.rating != null ? review.rating : "-"}</span>
                          <span>
                            Submitted:{" "}
                            {new Date(review.created_at).toLocaleString(undefined, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </span>
                        </div>
                      </div>

                      {review.reply_body ? (
                        <div className="rounded-md border border-border/40 bg-card/30 p-3 text-sm text-foreground/90">
                          <div className="text-xs text-(--text-dim)">
                            Admin reply{review.reply_created_at ? ` ${new Date(review.reply_created_at).toLocaleString(undefined, {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}` : ""}
                          </div>
                          <div className="mt-1 whitespace-pre-line">{review.reply_body}</div>
                        </div>
                      ) : null}

                      {Array.isArray(review.messages) && review.messages.length > 0 ? (
                        <MessagesTree
                          messages={review.messages}
                          onChooseTarget={(id) => setReplyTargets((prev) => ({ ...prev, [review.id]: id }))}
                          currentTargetId={currentTargetId}
                          allowReply={canReply}
                        />
                      ) : null}

                      <div className="space-y-2">
                        <textarea
                          rows={3}
                          className="w-full rounded-md border border-border/40 bg-card/20 px-3 py-2 text-sm text-foreground placeholder:text-(--text-dim) focus:border-(--accent) focus:outline-none focus:ring-1 focus:ring-(--accent)/30"
                          placeholder="???????? ????? ??????????"
                          value={replyDrafts[review.id] ?? ""}
                          onChange={(event) =>
                            setReplyDrafts((prev) => ({ ...prev, [review.id]: event.target.value }))
                          }
                          disabled={!canReply || replySavingId === review.id || moderatingId === review.id}
                        />
                        <div className="text-xs text-(--text-dim)">
                          Target: {targetLabel}
                        </div>
                        {!canReply ? (
                          <div className="text-xs text-rose-400">
                            Нельзя ответить: запись отзыва не найдена (только чтение).
                          </div>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant="secondary"
                            className="h-9 min-h-0 px-3 text-xs"
                            disabled={!canReply || replySavingId === review.id || moderatingId === review.id}
                            onClick={() => void handleReply(review)}
                          >
                            {replySavingId === review.id ? "Sending..." : "Reply & Approve"}
                          </Button>
                          <Button
                            variant="soft"
                            className="h-9 min-h-0 px-3 text-xs"
                            disabled={!canReply || moderatingId === review.id || replySavingId === review.id}
                            onClick={() => void handleModerate(review, "approve")}
                          >
                            {moderatingId === review.id ? "Saving..." : "Approve"}
                          </Button>
                          <Button
                            variant="ghost"
                            className="h-9 min-h-0 px-3 text-xs"
                            disabled={!canReply || moderatingId === review.id || replySavingId === review.id}
                            onClick={() => void handleModerate(review, "reject")}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </Section>
  );
}




