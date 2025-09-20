import { useState } from "react";
import { Link } from "react-router-dom";
import Button from "@ui/components/common/button";
import { useAuthState } from "@shared/lib/authStore";
import { signOut } from "@shared/lib/auth";

export default function AuthButton() {
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

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-[var(--text-dim)] truncate max-w-[160px]">{user.email}</span>
        <Button variant="soft" onClick={handleSignOut} disabled={busy}>
          {busy ? "Выходим…" : "Выйти"}
        </Button>
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link className="text-sm underline" to="/auth/login">
        Войти
      </Link>
      <Link className="text-sm underline" to="/auth/register">
        Регистрация
      </Link>
    </div>
  );
}

