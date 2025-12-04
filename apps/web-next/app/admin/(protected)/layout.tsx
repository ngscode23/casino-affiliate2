import type { ReactNode } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { createClient } from "@/utils/supabase/server";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  title: "Admin | Neon Shop",
  robots: { index: false, follow: true },
};


async function currentAdminPath(): Promise<string> {
  const headerList = await headers();
  const invoke = headerList.get("x-invoke-path");
  if (invoke && invoke.startsWith("/")) return invoke;
  const matched = headerList.get("x-matched-path");
  if (matched && matched.startsWith("/")) return matched;
  return "/admin";
}

function normalizeRole(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return normalized ? normalized : null;
}

function resolveRole(user: any): string | null {
  const directRole = normalizeRole(user?.app_metadata?.role);
  if (directRole === "admin") return "admin";
  if (directRole) return directRole;

  const roles = user?.app_metadata?.roles;
  if (Array.isArray(roles)) {
    for (const candidate of roles) {
      const normalized = normalizeRole(candidate);
      if (normalized === "admin") return "admin";
    }
    for (const candidate of roles) {
      const normalized = normalizeRole(candidate);
      if (normalized) return normalized;
    }
  } else if (typeof roles === "string") {
    try {
      const parsed = JSON.parse(roles);
      if (Array.isArray(parsed)) {
        for (const candidate of parsed) {
          const normalized = normalizeRole(candidate);
          if (normalized === "admin") return "admin";
        }
        for (const candidate of parsed) {
          const normalized = normalizeRole(candidate);
          if (normalized) return normalized;
        }
      }
    } catch {
      const normalized = normalizeRole(roles);
      if (normalized) return normalized;
    }
  }

  const metaRole = normalizeRole(user?.user_metadata?.role);
  if (metaRole) return metaRole;

  return null;
}

export default async function AdminProtectedLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = await currentAdminPath();
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  const role = resolveRole(user);
  if (role !== "admin") {
    const next = await currentAdminPath();
    const params = new URLSearchParams({ error: "not_admin", next });
    if (role) params.set("role", role);
    redirect(`/login?${params.toString()}`);
  }

  return <AdminShell>{children}</AdminShell>;
}
