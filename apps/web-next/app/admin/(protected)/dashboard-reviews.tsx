"use client";

import { useMemo } from "react";
import clsx from "clsx";
import { MessageSquare } from "lucide-react";

import Button from "@ui/components/common/button";
import Skeleton from "@ui/components/common/skeleton";
import { sanitizeSearchParam as sanitize } from "@shared/lib/sanitize";

import type { PendingReviewItem } from "@/lib/admin/reviews";

import { Tile, TITLE_LABEL_CLASS } from "./dashboard-primitives";

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
              {isActive ? "Ответить сюда" : "Выбрать ветку"}
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

type PendingReviewsSectionProps = {
  pendingReviews: PendingReviewItem[];
  pendingTotal: number;
  loading: boolean;
  error: string | null;
  replyDrafts: Record<string, string>;
  replyTargets: Record<string, string | null>;
  replySavingId: string | null;
  moderatingId: string | null;
  onReload: () => void;
  onDraftChange: (reviewId: string, value: string) => void;
  onSelectTarget: (reviewId: string, targetId: string | null) => void;
  onReply: (review: PendingReviewItem) => Promise<void>;
  onModerate: (review: PendingReviewItem, action: "approve" | "reject") => Promise<void>;
};

export function PendingReviewsSection({
  pendingReviews,
  pendingTotal,
  loading,
  error,
  replyDrafts,
  replyTargets,
  replySavingId,
  moderatingId,
  onReload,
  onDraftChange,
  onSelectTarget,
  onReply,
  onModerate,
}: PendingReviewsSectionProps) {
  return (
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
          onClick={onReload}
          disabled={loading}
        >
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 w-full rounded-3xl" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>
      ) : pendingReviews.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-sm text-slate-500">
          Нет ожидающих модерации отзывов.
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
                      {review.product_title || review.product_slug || "Неизвестный товар"}
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
                      onChooseTarget={(id) => onSelectTarget(review.id, id)}
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
                    onChange={(event) => onDraftChange(review.id, event.target.value)}
                    disabled={!canReply || replySavingId === review.id || moderatingId === review.id}
                  />
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="uppercase tracking-[0.3em]">Target: {targetLabel}</span>
                    {!canReply ? <span className="text-rose-300">Нет прав для ответа.</span> : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="primary"
                      className="!min-h-0 h-10 !rounded-full !bg-sky-500 px-5 text-xs font-semibold uppercase tracking-[0.25em] text-white shadow-[0_12px_30px_rgba(56,189,248,0.4)] hover:bg-sky-400 disabled:opacity-60"
                      disabled={!canReply || replySavingId === review.id || moderatingId === review.id}
                      onClick={() => void onReply(review)}
                    >
                      {replySavingId === review.id ? "Sending..." : "Reply"}
                    </Button>
                    <Button
                      variant="ghost"
                      className="!min-h-0 h-10 !rounded-full border border-white/10 bg-white/10 px-4 text-xs font-semibold uppercase tracking-[0.25em] text-slate-100 hover:border-white/20 hover:bg-white/15 disabled:opacity-60"
                      disabled={!canReply || moderatingId === review.id || replySavingId === review.id}
                      onClick={() => void onModerate(review, "approve")}
                    >
                      {moderatingId === review.id ? "Saving..." : "Approve"}
                    </Button>
                    <Button
                      variant="ghost"
                      className="!min-h-0 h-10 !rounded-full border border-rose-500/40 bg-rose-500/10 px-4 text-xs font-semibold uppercase tracking-[0.25em] text-rose-200 hover:border-rose-400 hover:bg-rose-500/20 disabled:opacity-60"
                      disabled={!canReply || moderatingId === review.id || replySavingId === review.id}
                      onClick={() => void onModerate(review, "reject")}
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
  );
}

export default PendingReviewsSection;
