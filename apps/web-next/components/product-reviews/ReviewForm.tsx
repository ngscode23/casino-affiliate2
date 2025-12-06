import { cn } from "@shared/lib/cn";
import { mutedTextSm, mutedTextXs } from "@/styles/classnames";
import { Star } from "lucide-react";
import { STAR_INDEXES, MIN_BODY_LENGTH } from "./constants";

type Props = {
  rating: number;
  title: string;
  body: string;
  canSubmit: boolean;
  submitting: boolean;
  isEditing: boolean;
  formError: string | null;
  formSuccess: boolean;
  onRatingChange: (value: number) => void;
  onTitleChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
};

export function ReviewForm({
  rating,
  title,
  body,
  canSubmit,
  submitting,
  isEditing,
  formError,
  formSuccess,
  onRatingChange,
  onTitleChange,
  onBodyChange,
  onSubmit,
}: Props) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(e);
      }}
      className="space-y-4 rounded-2xl border border-border/30 bg-card/70 p-4"
    >
      <h3 className="text-lg font-semibold text-fg">{isEditing ? "Редактировать отзыв" : "Оставить отзыв"}</h3>
      <div>
        <p className={mutedTextSm}>Выберите оценку</p>
        <div className="mt-2 flex items-center gap-1">
          {STAR_INDEXES.map((idx) => {
            const value = idx + 1;
            return (
              <button key={value} type="button" className="p-1" onClick={() => onRatingChange(value)} aria-label={`Оценка ${value}`}>
                <Star className={cn("h-6 w-6 transition", value <= rating ? "fill-amber-400 text-amber-400" : "text-border")} />
              </button>
            );
          })}
          <span className="ml-2 text-sm text-muted-foreground">{rating} / 5</span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="review-title" className="text-xs uppercase tracking-[0.24em] text-muted">
            Заголовок
          </label>
          <input
            id="review-title"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            className="h-11 rounded-xl border border-border/40 bg-card px-4 text-sm text-fg placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            placeholder="Например: лучший кейс для айфона"
            maxLength={120}
            required
            disabled={!canSubmit || submitting}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="review-body" className="text-xs uppercase tracking-[0.24em] text-muted">
            Текст
          </label>
          <textarea
            id="review-body"
            value={body}
            onChange={(event) => onBodyChange(event.target.value)}
            className="min-h-[110px] rounded-xl border border-border/40 bg-card px-4 py-3 text-sm text-fg placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            placeholder="Опишите впечатления — как сидит, что понравилось, что бы улучшили"
            maxLength={2000}
            required
            disabled={!canSubmit || submitting}
          />
        </div>
      </div>

      {!canSubmit ? (
        <p className="rounded-xl border border-amber-400/20 bg-amber-100/10 px-3 py-2 text-sm text-amber-400">
          Войдите, чтобы оставить отзыв.
        </p>
      ) : null}
      {formError ? (
        <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{formError}</p>
      ) : null}
      {formSuccess ? (
        <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          Спасибо! Ваш отзыв отправлен на модерацию.
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <span className={mutedTextXs}>Минимум {MIN_BODY_LENGTH} символов</span>
        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className="inline-flex h-11 w-full items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-primaryfg transition hover:-translate-y-[1px] hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {submitting ? "Отправляем..." : isEditing ? "Обновить отзыв" : "Отправить отзыв"}
        </button>
      </div>
    </form>
  );
}

export default ReviewForm;
