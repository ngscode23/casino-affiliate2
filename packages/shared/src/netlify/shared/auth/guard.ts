import type { HandlerEvent } from "@netlify/functions";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createUserClient, getServiceClient } from "./supabase";
import { error } from "./http";

export interface AuthUserRecord {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  metadata: Record<string, unknown> | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthResult {
  user: AuthUserRecord;
  rawUser: User;
  accessToken: string;
  client: SupabaseClient;
}

export interface RequireAuthOptions {
  roles?: string[];
}

function extractAuthorization(event: HandlerEvent): string | null {
  const header = event.headers?.authorization || event.headers?.Authorization;
  if (!header) return null;
  if (/^Bearer\s+/i.test(header)) return header.trim();
  return `Bearer ${header.trim()}`;
}

export function toAuthUserRecord(user: User): AuthUserRecord {
  const role = (() => {
    const metaRole = user.app_metadata?.role;
    if (typeof metaRole === "string" && metaRole.trim()) return metaRole.trim();
    const roles = user.app_metadata?.roles;
    if (Array.isArray(roles) && roles.length && typeof roles[0] === "string") return roles[0];
    return "user";
  })();
  const bannedUntil = (user as { banned_until?: string | null }).banned_until ?? null;
  return {
    id: user.id,
    email: user.email ?? "",
    role,
    is_active: !bannedUntil,
    metadata: (user.user_metadata as Record<string, unknown>) ?? null,
    last_login_at: user.last_sign_in_at ?? null,
    created_at: user.created_at,
    updated_at: user.updated_at ?? user.created_at,
  };
}

export async function requireAuth(
  event: HandlerEvent,
  options: RequireAuthOptions = {}
): Promise<AuthResult | { response: ReturnType<typeof error> }> {
  const authorization = extractAuthorization(event);
  if (!authorization) {
    return { response: error(401, "missing_bearer", "Authorization header required") };
  }

  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return { response: error(401, "missing_bearer", "Authorization header required") };
  }

  const service = getServiceClient();
  const { data, error: authError } = await service.auth.getUser(token);
  if (authError || !data?.user) {
    return {
      response: error(401, "bad_jwt", authError?.message || "Invalid or expired token"),
    };
  }

  const mapped = toAuthUserRecord(data.user);
  if (options.roles && options.roles.length && !options.roles.includes(mapped.role)) {
    return { response: error(403, "forbidden", "Insufficient role") };
  }

  return {
    user: mapped,
    rawUser: data.user,
    accessToken: token,
    client: createUserClient(token),
  };
}

export async function requireAdmin(
  event: HandlerEvent
): Promise<AuthResult | { response: ReturnType<typeof error> }> {
  return requireAuth(event, { roles: ["admin"] });
}


