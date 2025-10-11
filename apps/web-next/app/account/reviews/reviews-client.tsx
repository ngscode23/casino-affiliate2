"use client";

import { useMemo } from "react";
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
  const reviews = useMemo(() => initialReviews ?? [], [initialReviews]);

  return (
    <section className="space-y-6 rounded-3xl border border-border/40 bg-card/70 p-6 shadow-soft">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-fg">Мои отзывы</h1>
        <p className="text-sm text-muted-foreground">
          Здесь собраны ваши отзывы о товарах. Можно перейти на страницу товара и отредактировать отзыв.
        </p>
      </header>

      {reviews.length === 0 ? (
        <div className="rounded-2xl border border-border/30 bg-card/60 p-6 text-sm text-muted">
          Вы ещё не оставляли отзывов. После покупки поделитесь своим опытом!
        </div>
      ) : (
        <ul className="space-y-4">
          {reviews.map((review) => (
            <li
              key={review.review_id}
              className="flex flex-col gap-4 rounded-2xl border border-border/30 bg-card/80 p-4 sm:flex-row sm:items-start"
            >
              <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl border border-border/30 bg-card/50">
                {review.product_image_url ? (
                  <Image
                    src={review.product_image_url}
                    alt={review.product_title || "Изображение товара"}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-muted">
                    Нет фото
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <Link
                    href={`/products/${review.product_slug ?? review.product_id}`}
                    className="text-lg font-semibold text-fg transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                  >
                    {review.product_title || "Товар"}
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
                      ? "одобрен"
                      : review.status === "pending"
                        ? "на модерации"
                        : "отклонён"}
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

                <div className="space-y-1 text-sm text-fg/90">
                  <p className="font-semibold text-fg">{review.title}</p>
                  <p className="whitespace-pre-line">{review.body}</p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    Обновлён:{" "}
                    {review.updated_at
                      ? new Date(review.updated_at).toLocaleString("ru-RU")
                      : new Date(review.created_at).toLocaleString("ru-RU")}
                  </span>
                  <Link
                    href={`/products/${review.product_slug ?? review.product_id}#reviews`}
                    className="inline-flex items-center justify-center rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                  >
                    Редактировать
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
