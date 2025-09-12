import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Section from "@/components/common/section";
import Card from "@/components/common/card";
import Button from "@/components/common/button";
import { supabase } from "@/lib/supabase";
import { updatePassword } from "@/lib/auth";

export default function ResetPassword() {
  const nav = useNavigate();
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "ready" | "saving" | "error">("checking");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // Ensure we have a recovery session available
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data.session) {
          setStatus("error");
          setError("Ссылка недействительна или сессия не найдена. Откройте ссылку из письма повторно.");
          return;
        }
        setStatus("ready");
      } catch (e: any) {
        setStatus("error");
        setError(e?.message || "Не удалось проверить сессию восстановления");
      }
    })();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pw1.length < 8) {
      setError("Пароль должен быть не менее 8 символов");
      return;
    }
    if (pw1 !== pw2) {
      setError("Пароли не совпадают");
      return;
    }
    try {
      setStatus("saving");
      setError(null);
      await updatePassword(pw1);
      // success → to admin
      nav("/admin", { replace: true });
    } catch (e: any) {
      setStatus("error");
      setError(e?.message || "Не удалось обновить пароль");
    }
  }

  return (
    <Section className="py-10">
      <Card className="p-6 max-w-md space-y-4">
        <h1 className="text-xl font-bold">Сброс пароля</h1>
        {status === "checking" && <p>Проверяем ссылку…</p>}
        {status !== "checking" && (
          <form onSubmit={onSubmit} className="space-y-3">
            <label className="block text-sm">Новый пароль</label>
            <input
              type="password"
              required
              minLength={8}
              className="w-full rounded-md border px-3 py-2"
              value={pw1}
              onChange={(e) => setPw1(e.currentTarget.value)}
            />
            <label className="block text-sm">Повторите пароль</label>
            <input
              type="password"
              required
              minLength={8}
              className="w-full rounded-md border px-3 py-2"
              value={pw2}
              onChange={(e) => setPw2(e.currentTarget.value)}
            />
            <Button type="submit" disabled={status === "saving"}>
              {status === "saving" ? "Сохраняем…" : "Установить пароль"}
            </Button>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <p className="text-xs text-[var(--text-dim)]">
              Если видите ошибку о сессии — откройте ссылку из письма ещё раз.
            </p>
          </form>
        )}
      </Card>
    </Section>
  );
}

