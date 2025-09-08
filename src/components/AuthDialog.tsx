//src/components/AuthDialog.tsx

import { useState } from "react";
import Button from "@/components/common/button";
import { supabase } from "@/lib/supabase";

export default function AuthDialog() {
  const [email, setEmail] = useState("");
  const [sent, setSent]   = useState(false);
  const [err, setErr]     = useState<string | null>(null);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin }
      });
      if (error) throw error;
      setSent(true);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to send code");
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.reload();
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[var(--bg-1)] p-4 space-y-3">
      <h3 className="font-semibold">Sign in</h3>
      {sent ? (
        <div className="text-sm text-[var(--text-dim)]">
          Check your inbox and click the magic link.
        </div>
      ) : (
        <form onSubmit={sendOtp} className="space-y-2">
          <input
            className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
            type="email"
            required
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" className="w-full">Send link</Button>
          {err && <div className="text-xs text-red-400">{err}</div>}
        </form>
      )}
      <Button variant="soft" onClick={signOut} className="w-full">Sign out</Button>
    </div>
  );
}



