import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@shared/lib/supabase";
import {
  clearAuthState,
  getAuthState,
  isSessionExpired,
  setAuthState,
  subscribe,
  type AuthState,
  type AuthUser,
} from "./authStore";

function mapUser(user: User | null): AuthUser | null {
  if (!user) return null;
  const role = (() => {
    const appRole = user.app_metadata?.role;
    if (typeof appRole === "string" && appRole.trim()) return appRole.trim();
    const roles = user.app_metadata?.roles;
    if (Array.isArray(roles) && roles.length && typeof roles[0] === "string") return roles[0];
    return "user";
  })();
  const bannedUntil = (user as { banned_until?: string | null }).banned_until ?? null;
  return {
    id: user.id,
    email: user.email ?? "",
    role,
    isActive: !bannedUntil,
    metadata: (user.user_metadata as Record<string, unknown>) ?? null,
    createdAt: user.created_at,
    updatedAt: user.updated_at ?? user.created_at,
    lastLoginAt: user.last_sign_in_at ?? null,
  };
}

function mapSession(session: Session | null): AuthState["session"] {
  if (!session) return null;
  return {
    accessToken: session.access_token,
    expiresAt: session.expires_at
      ? new Date(session.expires_at * 1000).toISOString()
      : new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    expiresIn: session.expires_in ?? 0,
    tokenType: "Bearer",
  };
}

function applySession(session: Session | null, explicitUser?: User | null) {
  const user = explicitUser ?? session?.user ?? null;
  setAuthState({ user: mapUser(user), session: mapSession(session) });
}

let initPromise: Promise<void> | null = null;

async function ensureInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = supabase.auth
      .getSession()
      .then(({ data }) => {
        applySession(data.session ?? null);
      })
      .catch(() => undefined);
  }
  await initPromise;
}

// Keep local store in sync with Supabase auth events
supabase.auth.onAuthStateChange((_event, session) => {
  applySession(session ?? null);
});

export async function signUp(email: string, password: string, metadata?: Record<string, unknown>) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata ?? {},
    },
  });
  if (error) throw new Error(error.message);
  applySession(data.session ?? null, data.user ?? null);
  return data;
}

export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  applySession(data.session ?? null, data.user ?? null);
  return data;
}

export async function refreshSession(): Promise<void> {
  const { data, error } = await supabase.auth.refreshSession();
  if (error || !data?.session) {
    await supabase.auth.signOut({ scope: "global" }).catch(() => undefined);
    applySession(null, null);
    throw new Error(error?.message || "Session expired");
  }

  applySession(data.session ?? null, data.session?.user ?? null);
}

export async function ensureSession(): Promise<void> {
  await ensureInitialized();
  const state = getAuthState();
  if (!state.session || isSessionExpired(state.session)) {
    await refreshSession().catch(async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw new Error(error.message);
      applySession(data.session ?? null);
    });
  }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  clearAuthState();
}

export function getUser(): AuthUser | null {
  return getAuthState().user;
}

export function getAccessToken(): string | null {
  return getAuthState().session?.accessToken ?? null;
}

export async function getValidAccessToken(): Promise<string | null> {
  await ensureSession().catch(() => undefined);
  return getAccessToken();
}

export const onAuthStateChange = subscribe;


