import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { createClient } from "@/utils/supabase/server";
import { AdminShell } from "@/components/admin/admin-shell";


async function currentAdminPath(): Promise<string> {
  const headerList = await headers();
  const invoke = headerList.get("x-invoke-path");
  if (invoke && invoke.startsWith("/")) return invoke;
  const matched = headerList.get("x-matched-path");
  if (matched && matched.startsWith("/")) return matched;
  return "/admin";
}

function resolveRole(user: any): string | null {
  const appRole = user?.app_metadata?.role;
  if (typeof appRole === "string" && appRole.trim()) return appRole.trim();
  const roles = user?.app_metadata?.roles;
  if (Array.isArray(roles) && roles.length && typeof roles[0] === "string") return roles[0];
  const metaRole = user?.user_metadata?.role;
  if (typeof metaRole === "string" && metaRole.trim()) return metaRole.trim();
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
    redirect(`/login?error=not_admin&next=${encodeURIComponent(next)}`);
  }

  return <AdminShell>{children}</AdminShell>;
}
