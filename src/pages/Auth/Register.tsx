// src/pages/Auth/Register.tsx
import { useState } from "react";
import Section from "@/components/common/section";
import Card from "@/components/common/card";
import Button from "@/components/common/button";
import Seo from "@/components/Seo";
import { signUp } from "@/lib/auth";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      await signUp(email, password);
      setOk(true);
    } catch (e: any) {
      setErr(e?.message ?? "Ошибка регистрации");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section className="max-w-md mx-auto space-y-4">
      <Seo title="Регистрация" description="Создайте аккаунт" />
      <Card className="p-6 space-y-4">
        <h1 className="text-xl font-bold">Регистрация</h1>
        <form className="space-y-3" onSubmit={submit}>
          <input
            type="email"
            required
            placeholder="you@email.com"
            className="w-full rounded bg-white/5 px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            required
            placeholder="Пароль"
            className="w-full rounded bg-white/5 px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" disabled={busy}>
            {busy ? "Создаём..." : "Создать аккаунт"}
          </Button>
        </form>
        {ok && <div className="text-green-400 text-sm">Готово. Проверьте почту для подтверждения.</div>}
        {err && <div className="text-red-400 text-sm">{err}</div>}
      </Card>
    </Section>
  );
}