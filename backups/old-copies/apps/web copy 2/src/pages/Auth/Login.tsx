import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signInWithPassword } from "@shared/lib/auth";
import Section from "@ui/components/common/section";
import Card from "@ui/components/common/card";
import { ButtonPrimary } from "@ui/components/ui/Buttons";
import Seo from "@ui/components/Seo";

export default function LoginPage() {
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signInWithPassword(email.trim(), password);
      const from = (loc.state as any)?.from?.pathname || "/";
      nav(from, { replace: true });
    } catch (err: any) {
      setError(err?.message || "Не удалось войти. Проверьте e‑mail/пароль.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section className="py-10 max-w-xl mx-auto">
      <Seo
        title="Вход"
        description="Войдите с помощью e-mail и пароля."
        canonical={`${location.origin}/auth/login`}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Login",
          url: `${location.origin}/auth/login`,
        }}
      />

      <Card className="p-6 space-y-4 max-w-md">
        <h1 className="text-2xl font-bold">Вход</h1>
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-sm">E‑mail</label>
          <input
            type="email"
            required
            className="w-full rounded-md border px-3 py-2"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
          />
          <label className="block text-sm">Пароль</label>
          <input
            type="password"
            required
            minLength={8}
            className="w-full rounded-md border px-3 py-2"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
          />
          {error && <div className="text-sm text-red-500">{error}</div>}
          <ButtonPrimary type="submit" disabled={busy} className="w-full disabled:opacity-60">
            {busy ? "Входим…" : "Войти"}
          </ButtonPrimary>
        </form>
      </Card>
    </Section>
  );
}


