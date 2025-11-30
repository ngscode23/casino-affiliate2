"use client";;
import { overlineDark } from "@/styles/classnames";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@shared/lib/supabase";
import { useAuthState } from "@shared/lib/authStore";

type SellerOnboardingProps = {
  defaultEmail: string;
};

function normalizeSlug(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export default function SellerOnboarding({ defaultEmail }: SellerOnboardingProps) {
  const router = useRouter();
  const { user } = useAuthState();
  const [displayName, setDisplayName] = useState("");
  const [slug, setSlug] = useState("");
  const [contactEmail, setContactEmail] = useState(defaultEmail);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (!user?.id) {
        throw new Error("Нужна авторизация");
      }

      const normalizedSlug = slug.trim() ? normalizeSlug(slug) : normalizeSlug(displayName);
      if (!normalizedSlug) {
        throw new Error("Slug обязателен. Используйте латиницу, цифры и дефис.");
      }

      const { error: insertError } = await supabase.from("sellers").insert({
        user_id: user.id,
        display_name: displayName.trim(),
        slug: normalizedSlug,
        contact_email: contactEmail.trim() || null,
        status: "pending",
      });
      if (insertError) throw new Error(insertError.message);

      router.replace("/seller");
    } catch (err: any) {
      setError(err?.message ?? "Не удалось создать профиль продавца");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-white/15 bg-neutral-950/80 p-6 text-white shadow-2xl">
      <h1 className="text-2xl font-semibold text-white">Стать продавцом</h1>
      <p className="mt-2 text-sm text-white/60">
        Создадим профиль продавца и откроем доступ к кабинету. Вы сможете управлять товарами, остатками и заказами.
      </p>
      {error ? <p className="mt-4 rounded-xl border border-red-400/30 bg-red-500/15 px-4 py-3 text-sm text-red-100">{error}</p> : null}
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className={overlineDark}>Название магазина</label>
          <input
            className="mt-1 w-full rounded-xl border border-white/15 bg-neutral-900/70 px-3 py-2 text-sm text-white outline-none transition focus:border-white/40 focus:ring-1 focus:ring-white/30"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Например, Nordic Gaming Store"
            required
            maxLength={80}
          />
        </div>
        <div>
          <label className={overlineDark}>Slug</label>
          <input
            className="mt-1 w-full rounded-xl border border-white/15 bg-neutral-900/70 px-3 py-2 text-sm text-white outline-none transition focus:border-white/40 focus:ring-1 focus:ring-white/30"
            value={slug}
            onChange={(e) => setSlug(normalizeSlug(e.target.value))}
            placeholder="nordic-gaming-store"
            maxLength={60}
          />
          <p className="mt-1 text-xs text-white/40">
            Используйте латиницу, цифры и дефисы. Если пусто — создано автоматически.
          </p>
        </div>
        <div>
          <label className={overlineDark}>Контактный email</label>
          <input
            type="email"
            className="mt-1 w-full rounded-xl border border-white/15 bg-neutral-900/70 px-3 py-2 text-sm text-white outline-none transition focus:border-white/40 focus:ring-1 focus:ring-white/30"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="store@example.com"
          />
        </div>
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center rounded-full border border-white/20 bg-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/25 disabled:opacity-60"
          disabled={submitting}
        >
          {submitting ? "Сохраняем…" : "Создать профиль"}
        </button>
      </form>
    </div>
  );
}

