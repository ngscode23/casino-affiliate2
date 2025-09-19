import { useState } from "react";
import { signIn } from "@/lib/auth";
import Section from "@/components/common/section";
import Card from "@/components/common/card";
import { ButtonPrimary } from "@/components/ui/Buttons";
import Seo from "@/components/Seo";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signIn(email);
      setSent(true);
    } catch (err: any) {
      setError(err?.message || "Не удалось отправить письмо. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section className="py-10 max-w-xl mx-auto">
      <Seo
        title="Вход по email — Magic Link"
        description="Введите email и получите письмо со ссылкой для входа."
        canonical={`${location.origin}/auth/login`}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Login",
          url: `${location.origin}/auth/login`,
        }}
      />

      <Card className="p-6">
        <h1 className="text-2xl font-bold mb-4">Войти по e-mail</h1>

        {sent ? (
          <div className="text-green-400">
            Письмо отправлено! Проверьте почту и перейдите по ссылке для входа.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="block text-sm mb-1">E-mail</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
                placeholder="you@example.com"
              />
            </label>

            {error && <div className="text-red-400 text-sm">{error}</div>}

            <ButtonPrimary type="submit" disabled={busy} className="w-full disabled:opacity-60">
              {busy ? "Отправляем..." : "Отправить magic‑ссылку"}
            </ButtonPrimary>
          </form>
        )}

        <p className="mt-3 text-xs text-[var(--text-dim)]">
          Мы используем вход по ссылке. Нажмите кнопку, проверьте почту и перейдите по ссылке.
        </p>
      </Card>
    </Section>
  );
}

