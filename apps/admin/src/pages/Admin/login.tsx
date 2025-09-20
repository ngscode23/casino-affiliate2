import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import Section from "@ui/components/common/section";
import Card from "@ui/components/common/card";
import Button from "@ui/components/common/button";
import { signInWithPassword } from "@shared/lib/auth";

export default function AdminLogin() {
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);

    try {
      await signInWithPassword(email.trim(), password);
      const params = new URLSearchParams(loc.search);
      const next = params.get("next") || "/";
      nav(next, { replace: true });
    } catch (err: any) {
      setStatus("error");
      setError(err?.message || "Не удалось войти");
    } finally {
      setStatus((prev) => (prev === "error" ? "error" : "idle"));
    }
  }

  return (
    <Section className="space-y-6">
      <h1 className="text-2xl font-bold">Admin - Вход</h1>

      <Card className="p-6 space-y-4 max-w-md">
        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block text-sm">E-mail</label>
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

          <Button type="submit" disabled={status === "sending"}>
            {status === "sending" ? "Входим…" : "Войти"}
          </Button>

          {error && <p className="text-sm text-red-500">{error}</p>}
          <p className="text-xs text-[var(--text-dim)]">
            Забыли пароль? Напишите администратору или создайте новый аккаунт на
            <Link className="underline ml-1" to="/auth/register">
              /auth/register
            </Link>
            .
          </p>
        </form>
      </Card>
    </Section>
  );
}

