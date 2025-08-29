import { useState } from "react";
import Section from "@/components/common/section";
import Card from "@/components/common/card";
import Button from "@/components/common/button";
import { supabase } from "@/lib/supabase";
import { AUTH_CALLBACK_URL, HAS_SUPABASE } from "@/config";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle"|"sending"|"sent"|"error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);

    if (!HAS_SUPABASE) {
      setStatus("error");
      setError("Supabase не сконфигурирован (VITE_SUPABASE_URL/KEY).");
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: AUTH_CALLBACK_URL, // например https://твой-сайт/auth/callback
      },
    });

    if (error) {
      setStatus("error");
      setError(error.message);
      return;
    }
    setStatus("sent");
  }

  return (
    <Section className="space-y-6">
      <h1 className="text-2xl font-bold">Admin — вход</h1>

      <Card className="p-6 space-y-4 max-w-md">
        {status !== "sent" ? (
          <form onSubmit={onSubmit} className="space-y-3">
            <label className="block text-sm">
              Email (должен быть в whitelist)
            </label>
            <input
              type="email"
              required
              className="w-full rounded-md border px-3 py-2"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
            />

            <Button type="submit" disabled={status === "sending"}>
              {status === "sending" ? "Отправляем ссылку…" : "Войти по magic link"}
            </Button>

            {error && <p className="text-sm text-red-500">{error}</p>}
          </form>
        ) : (
          <p className="text-[var(--text-dim)]">
            Ссылка для входа отправлена. Проверь почту и перейди по ссылке.
          </p>
        )}
      </Card>
    </Section>
  );
}


