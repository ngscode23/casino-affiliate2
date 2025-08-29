import { useState } from "react";
import { signIn } from "@/lib/auth";
import Section from "@/components/common/section";
import Card from "@/components/common/card";
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
                className="w-full rounded border border-white/20 bg-transparent px-3 py-2 outline-none focus:border-white/40"
                placeholder="you@example.com"
              />
            </label>

            {error && <div className="text-red-400 text-sm">{error}</div>}

            <button
              type="submit"
              disabled={busy}
              className="btn w-full disabled:opacity-60"
            >
              {busy ? "Отправляем..." : "Отправить magic-ссылку"}
            </button>
          </form>
        )}

        <p className="mt-3 text-xs text-[var(--text-dim)]">
          Мы используем вход по ссылке. Нажмите кнопку, проверьте почту и перейдите по ссылке.
        </p>
      </Card>
    </Section>
  );
}

