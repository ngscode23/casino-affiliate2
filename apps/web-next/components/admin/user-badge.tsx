"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getUser } from "@shared/lib/auth";

export default function UserBadge() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const user = await getUser();
        if (active) setEmail(user?.email ?? null);
      } catch {
        if (active) setEmail(null);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!email) {
    return (
      <Link
        href="/login"
        className="rounded-xl bg-[color:var(--brand,#F5D15A)] px-4 py-2 font-medium text-[color:var(--brand-fg,#1A1A1A)] transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50"
      >
        Log in
      </Link>
    );
  }

  return <span className="text-sm text-[var(--text-dim)]">{email}</span>;
}
