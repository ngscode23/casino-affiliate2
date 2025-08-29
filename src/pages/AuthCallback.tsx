import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Section from "@/components/common/section";
import Card from "@/components/common/card";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const nav = useNavigate();
  const [msg, setMsg] = useState("Завершаем вход…");

  useEffect(() => {
    (async () => {
      try {
        const code = new URLSearchParams(window.location.search).get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          setMsg("Готово! Перенаправляем в админку…");
          setTimeout(() => nav("/admin", { replace: true }), 600);
          return;
        }
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (data.session) {
          setMsg("Готово! Перенаправляем в админку…");
          setTimeout(() => nav("/admin", { replace: true }), 600);
          return;
        }
        setMsg("Не удалось получить сессию. Открой ссылку из письма в этом же браузере.");
      } catch (e: any) {
        setMsg(`Ошибка авторизации: ${e?.message ?? e}`);
      }
    })();
  }, [nav]);

  return (
    <Section className="py-10">
      <Card className="p-6">{msg}</Card>
    </Section>
  );
}


