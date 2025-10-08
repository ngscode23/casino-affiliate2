import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

import { requireAuth } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN?.trim() ?? "";
const BOOTSTRAP_ENABLED =
  (process.env.BOOTSTRAP_ENABLED ?? "true").toString().toLowerCase() !== "false";
const DEFAULT_PASSWORD = process.env.BOOTSTRAP_DEFAULT_PASSWORD || "ChangeMe123!";

type PublicUser = {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function headerToken(request: Request): string {
  return (
    request.headers.get("x-admin-token") ??
    request.headers.get("X-Admin-Token") ??
    ""
  ).trim();
}

function toPublicUser(user: User): PublicUser {
  const role = (() => {
    const metaRole = (user.app_metadata?.role ?? "") as string;
    if (typeof metaRole === "string" && metaRole.trim()) return metaRole.trim();
    const appRoles = user.app_metadata?.roles;
    if (Array.isArray(appRoles) && typeof appRoles[0] === "string" && appRoles[0].trim()) {
      return appRoles[0].trim();
    }
    return "user";
  })();

  const bannedUntil = (user as { banned_until?: string | null }).banned_until ?? null;
  const metadata = (user.user_metadata as Record<string, unknown>) ?? null;

  return {
    id: user.id,
    email: user.email ?? "",
    role,
    isActive: !bannedUntil,
    metadata,
    createdAt: user.created_at,
    updatedAt: user.updated_at ?? user.created_at,
    lastLoginAt: user.last_sign_in_at ?? null,
  };
}

async function findUserByEmail(admin: ReturnType<typeof getAdminClient>["auth"]["admin"], email: string) {
  const perPage = 200;
  let page = 1;

  while (true) {
    const { data, error } = await admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users ?? [];
    const match = users.find((candidate) => (candidate.email ?? "").toLowerCase() === email);
    if (match) return match;
    if (users.length < perPage) break;
    page += 1;
  }

  return null;
}

export async function POST(request: Request) {
  if (!ADMIN_TOKEN) {
    return json({ ok: false, code: "misconfig", message: "ADMIN_TOKEN missing" }, 500);
  }
  if (!BOOTSTRAP_ENABLED) {
    return json({ ok: false, code: "disabled" }, 410);
  }

  const token = headerToken(request);
  if (!token || token !== ADMIN_TOKEN) {
    return json({ ok: false, code: "unauthorized" }, 401);
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    // keep empty body
  }

  const emailRaw = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const passwordRaw = typeof body.password === "string" ? body.password.trim() : "";
  const supabase = getAdminClient();
  const admin = supabase.auth.admin;

  if (emailRaw) {
    if (passwordRaw && passwordRaw.length < 8) {
      return json(
        { ok: false, code: "invalid_password", message: "Password must be at least 8 characters" },
        400,
      );
    }

    const existingUser = await findUserByEmail(admin, emailRaw);
    if (!existingUser) {
      const { data, error } = await admin.createUser({
        email: emailRaw,
        password: passwordRaw || DEFAULT_PASSWORD,
        email_confirm: true,
        app_metadata: { role: "admin" },
      });
      if (error || !data?.user) {
        return json({ ok: false, code: "db", message: error?.message || "Failed to create user" }, 500);
      }
      return json({ ok: true, user: toPublicUser(data.user) });
    }

    const updatePayload: Parameters<typeof admin.updateUserById>[1] = {
      app_metadata: { ...(existingUser.app_metadata ?? {}), role: "admin" },
    };
    if (passwordRaw) {
      updatePayload.password = passwordRaw;
    }

    const { data, error } = await admin.updateUserById(existingUser.id, updatePayload);
    if (error) {
      return json({ ok: false, code: "db", message: error.message }, 500);
    }
    const updatedUser = data?.user ?? existingUser;
    return json({ ok: true, user: toPublicUser(updatedUser) });
  }

  const auth = await requireAuth(request);
  if ("response" in auth) return auth.response;

  const { rawUser } = auth;
  const { data, error } = await admin.updateUserById(rawUser.id, {
    app_metadata: { ...(rawUser.app_metadata ?? {}), role: "admin" },
  });
  if (error) {
    return json({ ok: false, code: "db", message: error.message }, 500);
  }

  const updated = data?.user ?? rawUser;
  return json({ ok: true, user: toPublicUser(updated) });
}

export function GET() {
  return json({ ok: false, code: "method_not_allowed" }, 405);
}

