import { useEffect, useState } from "react";
import type { User, AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import Button from "@/components/common/button";
import { AUTH_CALLBACK_URL } from "@/config";

export default function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: { user: User | null } }) => setUser(data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_: AuthChangeEvent, session: Session | null) =>
      setUser(session?.user ?? null)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  const sendCode = async () => {
    setErr(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: AUTH_CALLBACK_URL,
      },
    });
    setLoading(false);
    if (error) setErr(error.message);
    else setCodeSent(true);
  };

  const verify = async () => {
    setErr(null);
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });
    setLoading(false);
    if (error) setErr(error.message);
    else window.location.reload();
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-[var(--text-dim)] truncate max-w-[140px]">
          {user.email}
        </span>
        <Button variant="soft" onClick={signOut}>Sign out</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
      {!codeSent ? (
        <>
          <input
            className="neon-input min-w-[220px]"
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button onClick={sendCode} disabled={!email || loading}>
            {loading ? "Sending..." : "Send code"}
          </Button>
        </>
      ) : (
        <>
          <input
            className="neon-input min-w-[160px]"
            inputMode="numeric"
            placeholder="6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <Button onClick={verify} disabled={!code || loading}>
            {loading ? "Verifying..." : "Verify"}
          </Button>
        </>
      )}
      {err && <span className="text-xs text-red-400">{err}</span>}
    </div>
  );
}




