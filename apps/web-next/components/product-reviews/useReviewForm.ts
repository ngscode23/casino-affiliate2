import { useCallback, useEffect, useState } from "react";
import { addReview } from "@shared/ecom/api/client";
import { track } from "@shared/lib/analytics";

import { MIN_BODY_LENGTH } from "./constants";
import type { OwnReview } from "./types";

type Options = {
  productId: string;
  slug: string;
  canSubmit: boolean;
  ownReview: OwnReview | null;
  onAfterSubmit?: (payload: { review: OwnReview | null; stats?: { avg_rating?: number; ratings_count?: number } | null }) => Promise<void> | void;
};

export function useReviewForm({ productId, slug, canSubmit, ownReview, onAfterSubmit }: Options) {
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

  const handleSubmit = useCallback(
    async (_event: React.FormEvent<HTMLFormElement>) => {
      if (!canSubmit) {
        setFormError("Пожалуйста, войдите, чтобы оставить отзыв.");
        return;
      }
      const cleanTitle = title.trim();
      const cleanBody = body.trim();
      if (!cleanTitle) {
        setFormError("Добавьте заголовок отзыва.");
        return;
      }
      if (cleanBody.length < MIN_BODY_LENGTH) {
        setFormError(`Текст отзыва должен быть не короче ${MIN_BODY_LENGTH} символов.`);
        return;
      }
      setFormError(null);
      setFormSuccess(false);
      setSubmitting(true);
      try {
        const response = await addReview({ productId, rating, title: cleanTitle, body: cleanBody });
        if (!response?.ok) {
          throw new Error(response?.message || "Не удалось отправить отзыв.");
        }
        if (onAfterSubmit) {
          await onAfterSubmit({ review: response.review ?? null, stats: response.stats ?? null });
        }
        try {
          track({
            name: "submit_review",
            params: { product_id: productId, slug, rating },
          });
        } catch {
          /* ignore analytics errors */
        }
        setFormSuccess(true);
      } catch (err: any) {
        setFormError(err?.message ?? "Не удалось отправить отзыв.");
      } finally {
        setSubmitting(false);
      }
    },
    [body, canSubmit, onAfterSubmit, productId, rating, slug, title],
  );

  return {
    rating,
    title,
    body,
    formError,
    formSuccess,
    submitting,
    isEditing: Boolean(ownReview),
    canSubmit,
    setRating,
    setTitle,
    setBody,
    handleSubmit,
  };
}
