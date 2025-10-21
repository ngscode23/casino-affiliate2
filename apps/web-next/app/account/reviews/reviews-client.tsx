"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";

import { cn } from "@shared/lib/cn";

export type AccountReview = {
  review_id: string;
  product_id: string;
  product_slug: string;
  product_title: string;
  product_image_url: string | null;
  rating: number;
  title: string;
  body: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export default function ReviewsClient({ initialReviews }: { initialReviews: AccountReview[] }) {
  const [reviews, setReviews] = useState<AccountReview[]>(() => initialReviews ?? []);
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const setPending = useCallback((reviewId: string, pending: boolean) => {
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (pending) {
        next.add(reviewId);
      } else {
        next.delete(reviewId);
      }
      return next;
    });
  }, []);

  const handleDelete = useCallback(
    async (review: AccountReview) => {
      if (!review?.review_id) return;

      if (typeof window !== "undefined") {
        const confirmed = window.confirm(
          `Delete your review for "${review.product_title || "this product"}"?`,
        );
        if (!confirmed) return;
      }

      setPending(review.review_id, true);
      setErrorMessage(null);

      try {
        const response = await fetch(
          `/api/account/reviews/${encodeURIComponent(review.review_id)}`,
          { method: "DELETE" },
        );

        if (!response.ok) {
          let message = `Request failed with status ${response.status}`;
          try {
            const data = (await response.json()) as { message?: string; error?: string } | null;
            if (data?.message || data?.error) {
              message = data.message ?? data.error ?? message;
            }
          } catch {
            // ignore json parsing issues
          }
          throw new Error(message);
        }

        setReviews((prev) => prev.filter((item) => item.review_id !== review.review_id));
      } catch (error: any) {
        setErrorMessage(error?.message ?? "Failed to delete review. Please try again.");
      } finally {
        setPending(review.review_id, false);
      }
    },
    [setPending],
  );

  const hasReviews = reviews.length > 0;

  return (
    <section className="space-y-6 rounded-3xl border border-border/40 bg-card/70 p-6 shadow-soft">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-fg">My reviews</h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          All of your product feedback in one place. Track moderation status and jump back to the product page instantly.
        </p>
      </header>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {errorMessage}
        </div>
      ) : null}

      {!hasReviews ? (
        <div className="rounded-2xl border border-border/30 bg-card/60 p-6 text-base leading-relaxed text-muted">
          You haven&apos;t left any reviews yet. Share your experience with the community!
        </div>
      ) : (
        <ul className="space-y-4">
          {reviews.map((review) => {
            const isPending = pendingIds.has(review.review_id);
            return (
              <li
                key={review.review_id}
                className="flex flex-col gap-4 rounded-2xl border border-border/30 bg-card/80 p-4 sm:flex-row sm:items-start"
              >
                <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl border border-border/30 bg-card/50">
                  {review.product_image_url ? (
                    <Image
                      src={review.product_image_url}
                      alt={review.product_title || "Product image"}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-muted">
                      No image
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <Link
                      href={`/products/${review.product_slug ?? review.product_id}`}
                      className="text-xl font-semibold tracking-tight text-fg transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                    >
                      {review.product_title || "Product"}
                    </Link>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.26em]",
                        review.status === "approved"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : review.status === "pending"
                            ? "bg-amber-500/15 text-amber-400"
                          : "bg-red-500/15 text-red-300",
                      )}
                    >
                      {review.status === "approved"
                        ? "Approved"
                        : review.status === "pending"
                          ? "Pending"
                          : "Rejected"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-amber-400">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star
                        key={index}
                        className={cn(
                          "h-4 w-4",
                          index < Math.round(review.rating) ? "fill-amber-400 text-amber-400" : "text-border",
                        )}
                      />
                    ))}
                    <span className="text-muted-foreground">{review.rating.toFixed(1)}</span>
                  </div>

                  <div className="space-y-2 text-base leading-relaxed text-fg/85">
                    <p className="font-semibold text-fg">{review.title}</p>
                    <p className="whitespace-pre-line text-fg/80">{review.body}</p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                    <span>
                      Updated:{" "}
                      {review.updated_at
                        ? new Date(review.updated_at).toLocaleString()
                        : new Date(review.created_at).toLocaleString()}
                    </span>
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/products/${review.product_slug ?? review.product_id}#reviews`}
                        className="inline-flex items-center justify-center rounded-full border border-border px-3 py-1 text-sm font-medium text-muted transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                      >
                        View product
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(review)}
                        disabled={isPending}
                        className={cn(
                          "inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                          isPending
                            ? "cursor-not-allowed border-red-400/40 text-red-200 opacity-60"
                            : "border-red-500/40 text-red-200 hover:border-red-400 hover:text-red-100",
                      )}
                    >
                        {isPending ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
