import { useState, useCallback } from "react";
import { addReview } from "@shared/ecom/api/client";
import { useAuthState } from "@shared/lib/authStore";

type Props = {
  productId: string;
  onSubmitted?: () => void;
};

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export default function ReviewForm({ productId, onSubmitted }: Props) {
  const { user } = useAuthState();
  const [rating, setRating] = useState<number>(5);
  const [title, setTitle] = useState<string>("");
  const [body, setBody] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setErrorMsg("");
      setSuccess(false);

      if (!user) {
        setErrorMsg("Нужно войти, чтобы оставить отзыв.");
        return;
      }
      if (user.role === "admin") {
        setErrorMsg("Админ не может оставлять отзывы.");
        return;
      }

      const t = title.trim();
      const b = body.trim();
      const r = Math.max(1, Math.min(5, Number(rating)));

      if (!productId || !isUuid(productId)) {
        setErrorMsg("Некорректный productId (ожидается UUID).");
        return;
      }
      if (!t || !b) {
        setErrorMsg("Введите заголовок и текст отзыва.");
        return;
      }

      setLoading(true);
      try {
        await addReview({ productId, rating: r, title: t, body: b });
        setTitle("");
        setBody("");
        setRating(5);
        setSuccess(true);
        onSubmitted?.();
      } catch (err: any) {
        setErrorMsg(err?.message || "Не удалось отправить отзыв.");
      } finally {
        setLoading(false);
      }
    },
    [user, productId, rating, title, body, onSubmitted]
  );

  if (user?.role === "admin") return null;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      {!user && (
        <div className="text-sm text-[var(--text-dim)]">
          Чтобы оставить отзыв, <span className="underline">войдите</span> в аккаунт.
        </div>
      )}
      {errorMsg && (
        <div className="text-red-400 text-sm border border-red-400/30 rounded p-2">
          {errorMsg}
        </div>
      )}
      {success && (
        <div className="text-green-400 text-sm border border-green-400/30 rounded p-2">
          Отзыв сохранён и отправлен на модерацию.
        </div>
      )}

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Заголовок"
        className="border border-white/10 bg-white/5 p-2 rounded"
        maxLength={120}
        required
        aria-label="Заголовок отзыва"
        disabled={!user || loading}
      />

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Текст отзыва..."
        className="border border-white/10 bg-white/5 p-2 rounded min-h-[120px]"
        maxLength={2000}
        required
        aria-label="Текст отзыва"
        disabled={!user || loading}
      />

      <label className="flex items-center gap-2">
        <span className="text-sm opacity-80">Оценка</span>
        <input
          type="number"
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
          min={1}
          max={5}
          className="border border-white/10 bg-white/5 p-2 rounded w-24"
          aria-label="Оценка от 1 до 5"
          disabled={!user || loading}
        />
      </label>

      <button
        type="submit"
        disabled={loading || !user}
        className="bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white px-4 py-2 rounded"
        aria-busy={loading}
      >
        {loading ? "Отправка..." : "Отправить отзыв"}
      </button>
    </form>
  );
}

