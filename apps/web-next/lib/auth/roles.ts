import { cookies } from "next/headers";

type CookieEntry = { name: string; value?: string | null | undefined };

export type UserRoleInfo = {
  role: string;
  isAdmin: boolean;
};

type CookieSource =
  | CookieEntry[]
  | { getAll(): CookieEntry[] }
  | { cookies?: { getAll(): CookieEntry[] } };

function resolveSupabaseCookiePrefix(): string | null {
  const rawUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "";
  const match = rawUrl.match(/^https?:\/\/([^.\s]+)\.supabase\.co/i);
  return match ? `sb-${match[1]}` : null;
}

const STATIC_COOKIE_NAMES = new Set([
  "sb-access-token",
  "sb-refresh-token",
  "sb:token",
  "supabase-auth-token",
  "supabase-session",
]);

function isSupabaseCookieName(name: string): boolean {
  if (!name) return false;
  if (STATIC_COOKIE_NAMES.has(name)) return true;
  const prefix = resolveSupabaseCookiePrefix();
  if (name.startsWith("sb-") && /-(access|refresh|auth)-token$/i.test(name)) return true;
  if (prefix && name.startsWith(`${prefix}-`) && /-(access|refresh|auth)-token$/i.test(name)) {
    return true;
  }
  return false;
}

async function collectCookies(source?: CookieSource | null): Promise<CookieEntry[]> {
  if (Array.isArray(source)) return source;
  if (source && typeof (source as any).getAll === "function") {
    return (source as any).getAll();
  }
  if (source && (source as any).cookies?.getAll) {
    return (source as any).cookies.getAll();
  }

  try {
    const store = await cookies();
    return store.getAll();
  } catch {
    return [];
  }
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  const base64 = parts[1]?.replace(/-/g, "+").replace(/_/g, "/") ?? "";
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");

  try {
    const json =
      typeof atob === "function"
        ? atob(padded)
        : Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function extractAccessToken(allCookies: CookieEntry[]): string | null {
  const directToken = allCookies.find((cookie) => {
    if (!cookie?.value) return false;
    if (cookie.name === "sb-access-token") return true;
    return /-access-token$/i.test(cookie.name ?? "");
  });

  const accessToken = directToken?.value ?? null;
  if (accessToken) return accessToken;

  const supabaseAuth = allCookies.find((cookie) => cookie.name === "supabase-auth-token");
  if (supabaseAuth?.value) {
    try {
      const parsed = JSON.parse(supabaseAuth.value);
      const tokenValue = parsed?.access_token;
      if (typeof tokenValue === "string" && tokenValue.trim()) {
        return tokenValue.trim();
      }
    } catch {
      // malformed cookie – ignore
    }
  }

  const prefixed = allCookies.find((cookie) => isSupabaseCookieName(cookie.name));
  return prefixed?.value ?? null;
}

function roleFromPayload(payload: Record<string, unknown>): string {
  const appMeta = (payload.app_metadata ?? payload.user_metadata ?? {}) as Record<string, unknown>;
  const rawRole =
    typeof appMeta.role === "string"
      ? appMeta.role
      : Array.isArray(appMeta.roles) && typeof appMeta.roles[0] === "string"
        ? appMeta.roles[0]
        : "user";
  return rawRole.trim() || "user";
}

export async function getUserRoleFromCookies(source?: CookieSource | null): Promise<UserRoleInfo> {
  const allCookies = await collectCookies(source);
  const token = extractAccessToken(allCookies);
  if (!token) {
    return { role: "user", isAdmin: false };
  }

  const payload = decodeJwtPayload(token) ?? {};
  const role = roleFromPayload(payload);
  return { role, isAdmin: role === "admin" };
}

export async function getUserRoleFromRequest(init?: { cookies?: CookieSource | null }): Promise<UserRoleInfo> {
  return getUserRoleFromCookies(init?.cookies);
}
