import { useEffect, useState } from "react";
import { getUser, signOut } from "@/lib/auth";

export default function UserBadge() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const user = await getUser();
        if (mounted) setEmail(user?.email ?? null);
      } catch {
        if (mounted) setEmail(null);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (!email) {
    return (
      <a href="/auth/login" className="underline hover:opacity-80">
        Войти
      </a>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-[var(--text-dim)]">{email}</span>
      <button
        onClick={() => signOut()}
        className="text-sm underline hover:opacity-80"
      >
        Выйти
      </button>
    </div>
  );
}