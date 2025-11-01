"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { RefreshCw, Star } from "lucide-react";
import clsx from "clsx";
import { useVirtualizer } from "@tanstack/react-virtual";

import { fetchApprovedReviews, type ApprovedReviewItem } from "@/lib/admin/reviews";
import { sanitizeSearchParam as sanitize } from "@shared/lib/sanitize";

const STAR_INDEXES = [0, 1, 2, 3, 4] as const;
const DATE_FORMATTER =
  typeof Intl !== "undefined" ? new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }) : null;

function formatDate(value: string | null): string {
  if (!value) return "-";
  try {
    if (DATE_FORMATTER) {
      return DATE_FORMATTER.format(new Date(value));
    }
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

type MessageNode = { message: ApprovedReviewItem["messages"][number]; children: MessageNode[] };

function buildTree(messages: ApprovedReviewItem["messages"] = []): MessageNode[] {
  if (!Array.isArray(messages) || messages.length === 0) return [];
  const sorted = [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime() || a.id.localeCompare(b.id),
  );
  const map = new Map<string, MessageNode>();
  const roots: MessageNode[] = [];
  for (const msg of sorted) {
    const node: MessageNode = map.get(msg.id) ?? { message: msg, children: [] };
    node.message = msg;
    map.set(msg.id, node);
  }
  for (const msg of sorted) {
    const node = map.get(msg.id)!;
    if (msg.parent_id && map.has(msg.parent_id)) {
      map.get(msg.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

type ViewState = "idle" | "loading" | "error" | "ready";

export function ApprovedReviewsClient() {
  const [reviews, setReviews] = useState<ApprovedReviewItem[]>([]);
  const [state, setState] = useState<ViewState>("idle");
  const [error, setError] = useState<string | null>(null);
  const scrollParentRef = useRef<HTMLDivElement | null>(null);

  const loadReviews = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const { items } = await fetchApprovedReviews(100);
      setReviews(items);
      setState("ready");
    } catch (err: any) {
      setError(err?.message ?? "?? ??????? ????????? ??????");
      setState("error");
    }
  }, []);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const total = reviews.length;
  const virtualizer = useVirtualizer({
    count: reviews.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => 340,
    overscan: 8,
  });

  return (
    <div className="space-y-6 p-6 text-sm text-white/90">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">?????? (??????????)</h1>
          <p className="text-xs text-white/60">
            ????? ???????????? ?????? ?? ???????? <strong>approved</strong>. ??????? ?????? - ????? ??????.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadReviews()}
          className={clsx(
            "inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--primary))]/60",
            state === "loading" && "cursor-wait opacity-70",
          )}
          disabled={state === "loading"}
        >
          <RefreshCw size={14} className={state === "loading" ? "animate-spin" : undefined} />
          ????????
        </button>
      </header>

      <section className="rounded-xl border border-white/10 bg-white/[0.05] p-4 shadow-lg">
        <dl className="grid gap-4 text-xs sm:grid-cols-3">
          <div>
            <dt className="text-white/50">?????</dt>
            <dd className="text-lg font-semibold text-white">{total}</dd>
          </div>
          <div>
            <dt className="text-white/50">?????? ??????????</dt>
            <dd className="text-lg font-semibold text-white">
              {state === "loading" ? "????????." : new Date().toLocaleTimeString("ru-RU")}
            </dd>
          </div>
          <div>
            <dt className="text-white/50">????????? ????????</dt>
            <dd className="text-white/70">?????? ????????. ????????? ??????????? ? ??????? pending.</dd>
          </div>
        </dl>
      </section>

      {state === "error" ? (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
      ) : null}

      {state !== "error" && (state === "loading" || reviews.length === 0) ? <EmptyState state={state} /> : null}

      {state === "ready" && reviews.length > 0 ? (
        <div
          ref={scrollParentRef}
          className="max-h-[70vh] overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-2"
          role="list"
          aria-label="Approved reviews list"
        >
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const review = reviews[virtualItem.index];
              if (!review) return null;
              const nodes = buildTree(review.messages);
              const key = review.review_id ?? `${review.product_uid ?? "unknown"}:${review.reviewer_id ?? "anon"}`;
              return (
                <div
                  key={key}
                  data-index={virtualItem.index}
                  ref={virtualizer.measureElement}
                  role="listitem"
                  className="absolute left-0 right-0 p-2"
                  style={{ transform: `translateY(${virtualItem.start}px)` }}
                >
                  <article className="space-y-3 rounded-2xl border border-white/10 bg-black/30 p-4 shadow-lg">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-xs uppercase tracking-[0.24em] text-white/40">???????</div>
                        <div className="text-base font-semibold text-white">
                          {review.product_title || "??? ????????"}
                          {review.product_slug ? (
                            <Link
                              href={`/products/${review.product_slug}`}
                              className="ml-2 text-xs font-normal text-[rgb(var(--primary))] underline-offset-2 hover:underline"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              /{review.product_slug}
                            </Link>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-white/70">
                        <span className="text-xs uppercase tracking-[0.24em] text-white/40">??????</span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-3 py-1">
                          {STAR_INDEXES.map((index) => (
                            <Star
                              key={index}
                              size={14}
                              className={index < Math.round(review.rating ?? 0) ? "fill-amber-400 text-amber-400" : "text-white/30"}
                            />
                          ))}
                          <span className="font-semibold text-white">{review.rating ?? "-"}</span>
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_200px]">
                      <div className="space-y-2">
                        {review.review_title ? (
                          <div className="text-sm font-semibold text-white">{review.review_title}</div>
                        ) : null}
                        <p className="whitespace-pre-line text-sm text-white/80">
                          {sanitize(review.review_body ?? "") || "????? ?????? ???????????."}
                        </p>
                      </div>
                      <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/60">
                        <div>
                          <div className="uppercase tracking-[0.24em] text-white/40">ID ??????</div>
                          <div className="font-mono text-white/70 break-all">{review.review_id ?? "-"}</div>
                        </div>
                        <div>
                          <div className="uppercase tracking-[0.24em] text-white/40">????????????</div>
                          <div className="font-mono text-white/70 break-all">{review.reviewer_id ?? "??????"}</div>
                        </div>
                        <div>
                          <div className="uppercase tracking-[0.24em] text-white/40">???????</div>
                          <div className="text-white/70">{formatDate(review.created_at)}</div>
                        </div>
                      </div>
                    </div>

                    {nodes.length ? (
                      <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-3">
                        <div className="text-xs uppercase tracking-[0.24em] text-white/40">?????????</div>
                        <MessageTree nodes={nodes} />
                      </div>
                    ) : null}
                  </article>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function EmptyState({ state }: { state: ViewState }) {
  if (state === "loading") {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
        ???????? ?????????? ???????.
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
      ???? ??? ?????????? ???????.
    </div>
  );
}

function MessageTree({ nodes }: { nodes: MessageNode[] }) {
  return (
    <ul className="space-y-2 text-sm text-white/80">
      {nodes.map((node) => (
        <MessageNodeItem key={node.message.id} node={node} depth={0} />
      ))}
    </ul>
  );
}

function MessageNodeItem({ node, depth }: { node: MessageNode; depth: number }) {
  const label =
    node.message.author_role === "admin"
      ? "?????"
      : node.message.author_role === "user"
        ? "????????????"
        : node.message.author_role;
  return (
    <li className={clsx("rounded-xl border border-white/10 bg-black/30 p-3", depth > 0 && "ml-4")}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs uppercase tracking-[0.24em] text-white/40">{label}</div>
        <div className="text-xs text-white/50">{formatDate(node.message.created_at)}</div>
      </div>
      <div className="mt-2 whitespace-pre-line text-sm text-white/80">{sanitize(node.message.body)}</div>
      {node.children.length ? (
        <ul className="mt-2 space-y-2 border-l border-white/10 pl-3">
          {node.children.map((child) => (
            <MessageNodeItem key={child.message.id} node={child} depth={depth + 1} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
