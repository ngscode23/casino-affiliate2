import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import Section from "@/components/common/section";
import Card from "@/components/common/card";
import Button from "@/components/common/button";
import { HAS_SUPABASE } from "@/config";
import { signInWithPassword, sendPasswordReset } from "@/lib/auth";

export default function AdminLogin() {
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "reset">("login");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);

    if (!HAS_SUPABASE) {
      setStatus("error");
      setError("Supabase не настроен (VITE_SUPABASE_URL/KEY).");
      return;
    }

    if (mode === "reset") {
      try {
        await sendPasswordReset(email.trim());
        setStatus("sent");
      } catch (err: any) {
        setStatus("error");
        setError(err?.message || "Не удалось отправить письмо со ссылкой");
      }
      return;
    }

    try {
      await signInWithPassword(email.trim(), password);
      const params = new URLSearchParams(loc.search);
      const next = params.get("next") || "/admin";
      nav(next, { replace: true });
    } catch (err: any) {
      setStatus("error");
      setError(err?.message || "Login failed");
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

          {mode === "login" && (
            <>
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
            </>
          )}

          {mode === "reset" && (
            <p className="text-sm">Отправим ссылку для сброса пароля на указанный email.</p>
          )}

          <Button type="submit" disabled={status === "sending" || status === "sent"}>
            {mode === "reset"
              ? status === "sending"
                ? "Отправляем…"
                : status === "sent"
                ? "Письмо отправлено"
                : "Отправить ссылку"
              : status === "sending"
              ? "Входим…"
              : "Войти"}
          </Button>

          <div className="text-sm">
            <button
              type="button"
              className="underline"
              onClick={() => {
                setMode(mode === "login" ? "reset" : "login");
                setStatus("idle");
                setError(null);
              }}
            >
              {mode === "login" ? "Забыли пароль?" : "Назад ко входу"}
            </button>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          <p className="text-xs text-[var(--text-dim)]">
            После запроса сброса проверьте почту. Ссылка ведёт на
            <Link className="underline ml-1" to="/auth/reset">
              /auth/reset
            </Link>
            , где можно задать новый пароль.
          </p>
        </form>
      </Card>
    </Section>
  );
}

