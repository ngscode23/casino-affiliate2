import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
      <Link
        to="/auth/login"
        className="rounded-xl px-4 py-2 font-medium bg-[color:var(--brand,#F5D15A)] text-[color:var(--brand-fg,#1A1A1A)] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50"
      >
        Войти
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-[var(--text-dim)]">{email}</span>
      <button
        onClick={() => signOut()}
        className="rounded-xl px-3 py-1.5 border border-white/10 text-neutral-200 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50"
      >
        Выйти
      </button>
    </div>
  );
}
