import { useEffect, useState } from "react";

export type AuthUser = {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
};

export type AuthSession = {
  accessToken: string;
  expiresAt: string;
  expiresIn: number;
  tokenType: "Bearer";
};

export type AuthState = {
  user: AuthUser | null;
  session: AuthSession | null;
};

const STORAGE_KEY = "auth:session:v1";

const defaultState: AuthState = { user: null, session: null };

let cachedState: AuthState = loadState();
const listeners = new Set<(state: AuthState) => void>();

function loadState(): AuthState {
  if (typeof window === "undefined") return { ...defaultState };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultState };
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || !parsed) return { ...defaultState };
    return {
      user: parsed.user ?? null,
      session: parsed.session ?? null,
    } as AuthState;
  } catch {
    return { ...defaultState };
  }
}

function persist(state: AuthState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

export function getAuthState(): AuthState {
  return cachedState;
}

export function setAuthState(state: AuthState) {
  cachedState = state;
  persist(state);
  for (const listener of listeners) listener(cachedState);
}

export function clearAuthState() {
  setAuthState({ ...defaultState });
}

export function subscribe(listener: (state: AuthState) => void): () => void {
  listeners.add(listener);
  listener(cachedState);
  return () => {
    listeners.delete(listener);
  };
}

export function useAuthState(): AuthState {
  const [state, setState] = useState<AuthState>(cachedState);
  useEffect(() => subscribe(setState), []);
  return state;
}

export function isSessionExpired(session: AuthSession | null): boolean {
  if (!session) return true;
  const expires = Date.parse(session.expiresAt);
  if (Number.isNaN(expires)) return true;
  // Refresh a little earlier than actual expiry
  return expires - 5000 <= Date.now();
}


