"use client";

import { overlineDark } from "@/styles/classnames";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@shared/lib/supabase";
import { useAuthState } from "@shared/lib/authStore";
import ErrorBanner from "@/components/ui/ErrorBanner";

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
        throw new Error("????? ???????????");
      }

      const normalizedSlug = slug.trim() ? normalizeSlug(slug) : normalizeSlug(displayName);
      if (!normalizedSlug) {
        throw new Error("Slug ??????????. ??????????? ????????, ????? ? ?????.");
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
      setError(err?.message ?? "?? ??????? ??????? ??????? ????????");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-white/15 bg-neutral-950/80 p-6 text-white shadow-2xl">
      <h1 className="text-2xl font-semibold text-white">????? ?????????</h1>
      <p className="mt-2 text-sm text-white/60">
        ???????? ??????? ???????? ? ??????? ?????? ? ????????. ?? ??????? ????????? ????????, ????????? ? ????????.
      </p>
      {error ? (
        <div className="mt-4">
          <ErrorBanner description={error} onRetry={() => setError(null)} />
        </div>
      ) : null}
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className={overlineDark}>???????? ????????</label>
          <input
            className="mt-1 w-full rounded-xl border border-white/15 bg-neutral-900/70 px-3 py-2 text-sm text-white outline-none transition focus:border-white/40 focus:ring-1 focus:ring-white/30"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="????????, Nordic Gaming Store"
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
            ??????????? ????????, ????? ? ??????. ???? ????? - ??????? ?????????????.
          </p>
        </div>
        <div>
          <label className={overlineDark}>?????????? email</label>
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
          {submitting ? "?????????." : "??????? ???????"}
        </button>
      </form>
    </div>
  );
}

