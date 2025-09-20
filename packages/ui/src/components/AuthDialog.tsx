import { useState } from "react";
import { Link } from "react-router-dom";
import Button from "@ui/components/common/button";
import { useAuthState } from "@shared/lib/authStore";
import { signOut } from "@shared/lib/auth";

export default function AuthDialog() {
  const { user } = useAuthState();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignOut = async () => {
    setBusy(true);
    setError(null);
    try {
      await signOut();
    } catch (err: any) {
      setError(err?.message || "Не удалось выйти");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[var(--bg-1)] p-4 space-y-3">
      <h3 className="font-semibold">Аккаунт</h3>
      {user ? (
        <div className="space-y-3 text-sm">
          <div className="text-[var(--text-dim)]">{user.email}</div>
          <Button variant="soft" onClick={handleSignOut} disabled={busy} className="w-full">
            {busy ? "Выходим…" : "Выйти"}
          </Button>
          {error && <div className="text-xs text-red-400">{error}</div>}
        </div>
      ) : (
        <div className="space-y-3 text-sm">
          <p className="text-[var(--text-dim)]">Чтобы продолжить, войдите или создайте аккаунт.</p>
          <Link to="/auth/login" className="underline">
            Войти
          </Link>
          <Link to="/auth/register" className="underline block">
            Регистрация
          </Link>
        </div>
      )}
    </div>
  );
}

