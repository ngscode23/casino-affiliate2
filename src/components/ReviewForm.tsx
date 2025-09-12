// src/components/ReviewForm.tsx
import { useState, useCallback, useEffect } from "react";
// Если у тебя экспорт по умолчанию из клиента — оставь так:
import { supabase } from "@/lib/supabase";
// Если у тебя именованный экспорт { supabase }, смени строку выше на:
// import { supabase } from "@/ecom/api/client";

type Props = {
  productId: string;
  onSubmitted?: () => void; // необязательно: дерни, чтобы обновить список отзывов
};

export default function ReviewForm({ productId, onSubmitted }: Props) {
  const [checked, setChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rating, setRating] = useState<number>(5);
  const [title, setTitle] = useState<string>("");
  const [body, setBody] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user: any = data?.user;
        const role = user?.app_metadata?.role || user?.user_metadata?.role || user?.role;
        setIsAdmin(role === "admin");
      } catch {
        setIsAdmin(false);
      } finally {
        setChecked(true);
      }
    })();
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setErrorMsg("");

      const t = title.trim();
      const b = body.trim();
      const r = Math.max(1, Math.min(5, Number(rating)));

      if (!productId || Number.isNaN(productId)) {
        setErrorMsg("Не указан productId.");
        return;
      }
      if (!t || !b) {
        setErrorMsg("Заполни заголовок и текст отзыва.");
        return;
      }

      setLoading(true);
      try {
        const { error } = await supabase.rpc("add_product_review", {
          p_product_id: productId,
          p_rating: r,
          p_title: t,
          p_body: b,
        });

        if (error) {
          // Наиболее частые причины: не залогинен, RLS, нет продукта
          setErrorMsg(error.message ?? "Не удалось отправить отзыв.");
          return;
        }

        // успех
        setTitle("");
        setBody("");
        setRating(5);
        onSubmitted?.();
        alert("Отзыв сохранён и ждёт модерации");
      } catch (err: unknown) {
        setErrorMsg(
          err instanceof Error ? err.message : "Случилась неизвестная ошибка"
        );
      } finally {
        setLoading(false);
      }
    },
    [productId, rating, title, body, onSubmitted]
  );

  if (!checked) return null; // avoid flicker
  if (isAdmin) return null; // do not show for admins

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      {errorMsg && (
        <div className="text-red-400 text-sm border border-red-400/30 rounded p-2">
          {errorMsg}
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
      />

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Ваш отзыв..."
        className="border border-white/10 bg-white/5 p-2 rounded min-h-[120px]"
        maxLength={2000}
        required
        aria-label="Текст отзыва"
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
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white px-4 py-2 rounded"
        aria-busy={loading}
      >
        {loading ? "Сохраняем..." : "Оставить отзыв"}
      </button>
    </form>
  );
}
