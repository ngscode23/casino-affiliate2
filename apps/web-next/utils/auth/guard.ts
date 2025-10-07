import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getAdminClient } from "@/utils/supabase/admin";

export interface AuthUserRecord {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  metadata: Record<string, unknown> | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSuccess {
  user: AuthUserRecord;
  rawUser: User;
  accessToken: string;
}

export type AuthResult = AuthSuccess | { response: NextResponse };

interface RequireAuthOptions {
  roles?: string[];
}

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json(
    { error: code, message },
    {
      status,
      headers: { "cache-control": "no-store" },
    }
  );
}

function extractAccessToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!header) return null;
  const trimmed = header.trim();
  if (!trimmed) return null;
  if (/^bearer\s+/i.test(trimmed)) {
    return trimmed.replace(/^bearer\s+/i, "").trim() || null;
  }
  return trimmed;
}

function toAuthUserRecord(user: User): AuthUserRecord {
  const role = (() => {
    const fromApp = user.app_metadata?.role;
    if (typeof fromApp === "string") {
      const trimmed = fromApp.trim();
      if (trimmed) return trimmed;
    }
    const roles = user.app_metadata?.roles;
    if (Array.isArray(roles) && typeof roles[0] === "string" && roles[0].trim()) {
      return roles[0].trim();
    }
    return "user";
  })();
  const bannedUntil = (user as { banned_until?: string | null }).banned_until ?? null;
  return {
    id: user.id,
    email: user.email ?? "",
    role,
    isActive: !bannedUntil,
    metadata: (user.user_metadata as Record<string, unknown>) ?? null,
    lastLoginAt: user.last_sign_in_at ?? null,
    createdAt: user.created_at,
    updatedAt: user.updated_at ?? user.created_at,
  };
}

export async function requireAuth(request: Request, options: RequireAuthOptions = {}): Promise<AuthResult> {
  const token = extractAccessToken(request);

  // Path A: Verify provided Bearer token via admin client
  if (token) {
    try {
      const supabase = getAdminClient();
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data?.user) {
        return {
          response: jsonError(401, "invalid_token", error?.message ?? "Invalid or expired token"),
        };
      }

      const record = toAuthUserRecord(data.user);
      if (options.roles?.length && !options.roles.includes(record.role)) {
        return { response: jsonError(403, "forbidden", "Insufficient role") };
      }

      return { user: record, rawUser: data.user, accessToken: token };
    } catch (error: any) {
      return { response: jsonError(500, "auth_error", error?.message ?? "Failed to verify token") };
    }
  }

  // Path B: Fallback to SSR cookie-based session (no Authorization header)
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
            } catch {
              // ignore when called from server handlers without mutable cookies
            }
          },
        },
      }
    );

    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      return { response: jsonError(401, "not_authenticated", "User session required") };
    }

    const sessionRes = await supabase.auth.getSession();
    const accessToken = sessionRes.data.session?.access_token || "";
    const record = toAuthUserRecord(data.user);
    if (options.roles?.length && !options.roles.includes(record.role)) {
      return { response: jsonError(403, "forbidden", "Insufficient role") };
    }

    return { user: record, rawUser: data.user, accessToken };
  } catch (error: any) {
    return { response: jsonError(500, "auth_error", error?.message ?? "Failed to verify session") };
  }
}

export function requireAdmin(request: Request): Promise<AuthResult> {
  return requireAuth(request, { roles: ["admin"] });
}
