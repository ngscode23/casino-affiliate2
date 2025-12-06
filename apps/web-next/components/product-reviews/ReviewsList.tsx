import { useMemo, useState } from "react";
import { ThumbsDown, ThumbsUp, Star } from "lucide-react";
import { cn } from "@shared/lib/cn";
import { mutedTextXs } from "@/styles/classnames";
import type { ReviewItem } from "./types";

type TreeNode = {
  message: NonNullable<ReviewItem["messages"]>[number];
  children: TreeNode[];
};

type Props = {
  items: ReviewItem[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadingMore: boolean;
  nextCursor: string | null;
  votePending: string | null;
  userId?: string | null;
  formatDate: (value: string) => string;
  sanitize: (value: string) => string;
  onLoadMore: () => void;
  onVote: (review: ReviewItem, value: 1 | -1) => void;
  onReply: (params: { reviewId: string; parentMessageId: string | null; body: string }) => Promise<void>;
};

const STAR_INDEXES = [0, 1, 2, 3, 4] as const;

function buildTree(messages: NonNullable<ReviewItem["messages"]>): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];
  messages.forEach((m) => byId.set(m.id, { message: m, children: [] }));
  messages.forEach((m) => {
    const node = byId.get(m.id)!;
    if (m.parent_id && byId.has(m.parent_id)) {
      byId.get(m.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

function renderNode(
  node: TreeNode,
  depth: number,
  formatDate: (val: string) => string,
  sanitize: (v: string) => string,
) {
  return (
    <li key={node.message.id} className="rounded-xl border border-border/30 bg-card/70 p-3">
      <div className="flex items-start justify-between gap-2 text-sm text-fg">
        <div className="font-semibold">{node.message.author_role ?? "Support"}</div>
        <span className="text-xs text-muted">{formatDate(node.message.created_at) || node.message.created_at}</span>
      </div>
      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-fg/90">{sanitize(node.message.body)}</p>
      {node.children.length ? (
        <ul className="mt-2 space-y-2 border-l border-border/30 pl-3">
          {node.children.map((child) => renderNode(child, depth + 1, formatDate, sanitize))}
        </ul>
      ) : null}
    </li>
  );
}

export function ReviewsList({
  items,
  loading,
  error,
  hasMore,
  loadingMore,
  nextCursor,
  votePending,
  userId,
  formatDate,
  sanitize,
  onLoadMore,
  onVote,
  onReply,
}: Props) {
  const [replyToReviewId, setReplyToReviewId] = useState<string | null>(null);
  const [replyToMessageId, setReplyToMessageId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const canReply = Boolean(userId);

  if (loading) {
    return (
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
    );
  }

  if (error) {
    return <p className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>;
  }

  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-border/30 bg-card/70 px-4 py-3 text-sm text-muted">
        Пока нет отзывов. Будьте первым!
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-4">
        {items.map((review, idx) => (
          <li key={`${review.created_at}-${idx}`} className="overflow-hidden rounded-2xl border border-border/30 bg-card/70 p-4">
            <div className="flex flex-wrap items-start gap-2 text-sm sm:items-center">
              <div className="flex items-center gap-1 text-amber-400">
                {STAR_INDEXES.map((starIdx) => (
                  <Star
                    key={starIdx}
                    className={cn("h-4 w-4", starIdx < Math.round(review.rating) ? "fill-amber-400 text-amber-400" : "text-border")}
                  />
                ))}
              </div>
              <span className="flex-1 min-w-0 break-words font-medium text-fg">{review.title || `Отзыв ${idx + 1}`}</span>
              <span className="ml-auto shrink-0 text-right text-xs text-muted-foreground">
                {review.createdLabel || formatDate(review.created_at) || "-"}
              </span>
            </div>
            <p className="mt-2 [overflow-wrap:anywhere] text-sm leading-relaxed text-fg/90">{sanitize(review.body)}</p>

            {review.reply ? (
              <div className="mt-3 rounded-xl border border-border/30 bg-card/60 p-3 text-sm leading-relaxed text-fg">
                <div className={mutedTextXs}>
                  Ответ продавца • {formatDate(review.reply.created_at) || review.reply.created_at || "-"}
                </div>
                <div className="mt-1 whitespace-pre-line">{sanitize(review.reply.body)}</div>
              </div>
            ) : null}

            {Array.isArray(review.messages) && review.messages.length > 0 ? (
              <div className="mt-3">
                <ul className="space-y-2">{buildTree(review.messages).map((node) => renderNode(node, 0, formatDate, sanitize))}</ul>
              </div>
            ) : null}

            {canReply && review.review_id ? (
              <div className="mt-3">
                {replyToReviewId === review.review_id && replyToMessageId === null ? (
                  <form
                    className="space-y-2"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const text = replyText.trim();
                      if (!text || !review.review_id) return;
                      await onReply({ reviewId: review.review_id, parentMessageId: null, body: text });
                      setReplyText("");
                      setReplyToMessageId(null);
                      setReplyToReviewId(null);
                    }}
                  >
                    <textarea
                      rows={3}
                      className="w-full rounded-xl border border-border/40 bg-card px-3 py-2 text-sm text-fg placeholder:text-muted"
                      placeholder="Ваш ответ на отзыв"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="inline-flex h-9 items-center justify-center rounded-full border border-primary/50 bg-primary/10 px-4 text-sm font-semibold text-primary hover:-translate-y-[1px]"
                      >
                        Отправить
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-9 items-center justify-center rounded-full border border-border/40 bg-card px-4 text-sm text-muted-foreground hover:text-fg"
                        onClick={() => {
                          setReplyText("");
                          setReplyToMessageId(null);
                          setReplyToReviewId(null);
                        }}
                      >
                        Отмена
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    className="rounded-full border border-border/40 bg-card px-3 py-1.5 text-xs text-muted-foreground hover:text-fg"
                    onClick={() => {
                      setReplyToReviewId(review.review_id!);
                      setReplyToMessageId(null);
                      setReplyText("");
                    }}
                  >
                    Ответить на отзыв
                  </button>
                )}
              </div>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Был ли полезен отзыв?</span>
              <button
                type="button"
                onClick={() => onVote(review, 1)}
                disabled={votePending === review.author_id}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-3 py-1 transition",
                  votePending === review.author_id ? "cursor-not-allowed opacity-60" : "hover:-translate-y-[1px]",
                  review.votes.user_vote === 1
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/40 text-muted-foreground hover:border-border/70 hover:text-fg",
                )}
                aria-label="Нравится"
              >
                <ThumbsUp className="h-3.5 w-3.5" aria-hidden />
                <span>{review.votes.helpful}</span>
              </button>
              <button
                type="button"
                onClick={() => onVote(review, -1)}
                disabled={votePending === review.author_id}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-3 py-1 transition",
                  votePending === review.author_id ? "cursor-not-allowed opacity-60" : "hover:-translate-y-[1px]",
                  review.votes.user_vote === -1
                    ? "border-destructive/60 bg-destructive/10 text-destructive"
                    : "border-border/40 text-muted-foreground hover:border-border/70 hover:text-fg",
                )}
                aria-label="Не нравится"
              >
                <ThumbsDown className="h-3.5 w-3.5" aria-hidden />
                <span>{review.votes.notHelpful}</span>
              </button>
              <span className="text-muted-foreground/70">
                {review.votes.score >= 0 ? `+${review.votes.score}` : review.votes.score}
              </span>
            </div>
          </li>
        ))}
      </ul>
      {hasMore ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore || !nextCursor}
            className="inline-flex h-11 items-center justify-center rounded-full border border-border/40 bg-card px-6 text-sm font-semibold text-fg transition hover:-translate-y-[1px] hover:bg-border/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingMore ? "Загружаем..." : "Показать ещё"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default ReviewsList;
