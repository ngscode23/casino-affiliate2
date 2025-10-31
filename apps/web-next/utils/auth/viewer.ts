import { Buffer } from "node:buffer";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

type JwtPayload = Record<string, unknown>;

function decodeJwtPayload(token: string | null | undefined): JwtPayload | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  const base64Payload = parts[1]?.replace(/-/g, "+").replace(/_/g, "/") ?? "";
  const padded = base64Payload.padEnd(Math.ceil(base64Payload.length / 4) * 4, "=");
  try {
    const json = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

function extractFromSupabaseAuthCookie(raw: string | undefined | null): string | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "string") return parsed;
    if (Array.isArray(parsed)) {
      const candidate = parsed[0];
      if (typeof candidate === "string") return candidate;
      if (candidate && typeof candidate === "object" && typeof (candidate as any).value === "string") {
        return (candidate as any).value;
      }
      if (candidate && typeof candidate === "object" && typeof (candidate as any).access_token === "string") {
        return (candidate as any).access_token;
      }
    }
    if (parsed && typeof parsed === "object") {
      if (typeof (parsed as any).access_token === "string") return (parsed as any).access_token as string;
      if (Array.isArray((parsed as any).currentSession)) {
        const [first] = (parsed as any).currentSession;
        if (first && typeof first === "string") return first;
      }
    }
  } catch {
    // ignore malformed cookie
  }
  return null;
}

function extractAccessToken(cookies: ReadonlyRequestCookies): string | null {
  const directCandidates = [
    "sb-access-token",
    "sb:token",
    "supabase-access-token",
    "sb-token",
  ];
  for (const name of directCandidates) {
    const candidate = cookies.get(name)?.value;
    if (candidate) return candidate;
  }
  const supabaseAuthToken = extractFromSupabaseAuthCookie(cookies.get("supabase-auth-token")?.value);
  if (supabaseAuthToken) return supabaseAuthToken;
  const dynamic = cookies
    .getAll()
    .find((cookie) => /-access-token$/.test(cookie.name) && cookie.value);
  return dynamic?.value ?? null;
}

export type ViewerIdentity = {
  userId: string | null;
  anonId: string | null;
};

export function resolveViewerIdentity(cookieStore: ReadonlyRequestCookies): ViewerIdentity {
  const anonId = cookieStore.get("anon_id")?.value ?? null;
  const accessToken = extractAccessToken(cookieStore);
  const payload = decodeJwtPayload(accessToken);
  const userId = typeof payload?.sub === "string" && payload.sub.trim() ? payload.sub.trim() : null;
  return { userId, anonId };
}
