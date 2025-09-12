import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Section from "@/components/common/section";
import Card from "@/components/common/card";
import Button from "@/components/common/button";
import { HAS_SUPABASE } from "@/config";
import { signInWithPassword } from "@/lib/auth";

export default function AdminLogin() {
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle"|"sending"|"error">("idle");
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

    // password flow
    try {
      await signInWithPassword(email.trim(), password);
      // if next provided, go there; else /admin
      const params = new URLSearchParams(loc.search);
      const next = params.get('next') || '/admin';
      nav(next, { replace: true });
    } catch (err: any) {
      setStatus('error');
      setError(err?.message || 'Login failed');
    }
  }


  
  return (
    <Section className="space-y-6">
      <h1 className="text-2xl font-bold">Admin — вход</h1>

      <Card className="p-6 space-y-4 max-w-md">
        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block text-sm">E‑mail</label>
          <input type="email" required className="w-full rounded-md border px-3 py-2" placeholder="you@example.com" value={email} onChange={(e)=>setEmail(e.currentTarget.value)} />
          <label className="block text-sm">Пароль</label>
          <input type="password" required minLength={8} className="w-full rounded-md border px-3 py-2" placeholder="••••••••" value={password} onChange={(e)=>setPassword(e.currentTarget.value)} />
          <Button type="submit" disabled={status === 'sending'}>{status==='sending'? 'Входим…':'Войти'}</Button>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <p className="text-xs text-[var(--text-dim)]">Если пароля нет — задай его командой bootstrap (email+password) или через Studio.</p>
        </form>
      </Card>
    </Section>
  );
}
