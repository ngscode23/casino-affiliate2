"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { Product } from "@shared/ecom/lib/types";
import { API_BASE, getProductsByIds } from "@shared/ecom/api/client";
import { getValidAccessToken, onAuthStateChange } from "@shared/lib/auth";
import { envFlag } from "../../lib/env";

const LS_KEY = "ecom:wishlist";

type State = { ids: string[] };
type Action =
  | { type: "add"; id: string }
  | { type: "toggle"; id: string }
  | { type: "remove"; id: string }
  | { type: "clear" }
  | { type: "hydrate"; ids: string[] };

function readState(): State {
  if (typeof window === "undefined") return { ids: [] };
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ids: [] };
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return { ids: parsed.filter((x) => typeof x === "string") };
    if (parsed && Array.isArray(parsed.ids)) return { ids: parsed.ids.filter((x: unknown) => typeof x === "string") };
    return { ids: [] };
  } catch {
    return { ids: [] };
  }
}

function writeState(state: State) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

function emitUpdate(ids?: string[]) {
  if (typeof window === "undefined") return;
  try { window.dispatchEvent(new CustomEvent("wishlist:update", { detail: { ids } })); } catch { /* ignore */ }
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "hydrate":
      return { ids: action.ids };
    case "add":
      return state.ids.includes(action.id) ? state : { ids: [...state.ids, action.id] };
    case "toggle":
      return state.ids.includes(action.id)
        ? { ids: state.ids.filter((x) => x !== action.id) }
        : { ids: [...state.ids, action.id] };
    case "remove":
      return { ids: state.ids.filter((x) => x !== action.id) };
    case "clear":
      return { ids: [] };
    default:
      return state;
  }
}

type Ctx = {
  ids: string[];
  items: Product[];
  add: (id: string) => void;
  toggle: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const WishlistContext = createContext<Ctx | null>(null);

export function WishlistProvider({ children }: React.PropsWithChildren) {
  // Synchronous hydration at init prevents first-click flicker
  const [state, dispatch] = useReducer(reducer, undefined as any, () => readState());
  const stateRef = useRef(state.ids);
  const [productMap, setProductMap] = useState<Map<string, Product>>(() => new Map());

  useEffect(() => {
    stateRef.current = state.ids;
  }, [state.ids]);

  const SERVER_SYNC = envFlag(["NEXT_PUBLIC_WISHLIST_SERVER_SYNC", "WISHLIST_SERVER_SYNC"], true);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    try { return await getValidAccessToken(); } catch { return null; }
  }, []);

  const fetchWithRetry = useCallback(async (input: RequestInfo | URL, init?: RequestInit & { tries?: number }) => {
    const tries = Math.max(1, Number((init as any)?.tries ?? 1));
    let lastErr: any;
    for (let i = 0; i < tries; i++) {
      try { return await fetch(input, init); } catch (err) { lastErr = err; }
    }
    throw lastErr || new Error("request failed");
  }, []);

  const serverList = useCallback(async (token: string): Promise<string[]> => {
    if (!SERVER_SYNC) return [];
    const res = await fetchWithRetry(`${API_BASE}/ecom-wishlist/list`, { method: "GET", headers: { Authorization: `Bearer ${token}` }, tries: 3 } as any);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.items) ? data.items.map((r: any) => String(r.product_id)) : [];
  }, [SERVER_SYNC, fetchWithRetry]);

  const serverUpsertMany = useCallback(async (token: string, ids: string[]) => {
    if (!SERVER_SYNC) return;
    for (const id of ids) {
      try {
        await fetchWithRetry(`${API_BASE}/ecom-wishlist/upsert`, { method: "POST", headers: { "content-type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ product_id: id }), tries: 3 } as any);
      } catch { /* ignore single failure */ }
    }
  }, [SERVER_SYNC, fetchWithRetry]);

  const serverRemove = useCallback(async (token: string, id: string) => {
    if (!SERVER_SYNC) return;
    try {
      await fetchWithRetry(`${API_BASE}/ecom-wishlist/remove`, { method: "POST", headers: { "content-type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ product_id: id }), tries: 3 } as any);
    } catch { /* ignore */ }
  }, [SERVER_SYNC, fetchWithRetry]);

  // Initial remote merge and auth change handling
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await getAccessToken();
      if (!token) return;
      const remote = await serverList(token);
      if (cancelled) return;
      const local = readState().ids;
      const merged = Array.from(new Set([...(remote || []), ...(local || [])]));
      const missingRemote = merged.filter((id) => !remote.includes(id));
      if (missingRemote.length) await serverUpsertMany(token, missingRemote);
      writeState({ ids: merged });
      emitUpdate(merged);
      dispatch({ type: "hydrate", ids: merged });
    })();

    const unsubscribe = onAuthStateChange(async (state) => {
      if (!state.user || !state.session?.accessToken) {
        writeState({ ids: [] });
        emitUpdate([]);
        dispatch({ type: "clear" });
        return;
      }
      const token = state.session.accessToken;
      const remote = await serverList(token);
      const local = readState().ids;
      const merged = Array.from(new Set([...(remote || []), ...local]));
      const missing = merged.filter((id) => !remote.includes(id));
      if (missing.length) await serverUpsertMany(token, missing);
      writeState({ ids: merged });
      emitUpdate(merged);
      dispatch({ type: "hydrate", ids: merged });
    });

    return () => { cancelled = true; unsubscribe(); };
  }, [getAccessToken, serverList, serverUpsertMany]);

  const add = useCallback((id: string) => {
    // sync localStorage immediately to avoid race with initial effects
    const cur = readState().ids;
    if (!cur.includes(id)) {
      const next = [...cur, id];
      writeState({ ids: next });
      emitUpdate(next);
    }
    dispatch({ type: "add", id });
    getAccessToken().then((t) => { if (t) serverUpsertMany(t, [id]); });
  }, [getAccessToken, serverUpsertMany]);

  const toggle = useCallback((id: string) => {
    const cur = readState().ids;
    const nextActive = !cur.includes(id);
    // write immediately
    const next = nextActive ? [...cur, id] : cur.filter((x) => x !== id);
    writeState({ ids: next });
    emitUpdate(next);
    dispatch({ type: "toggle", id });
    getAccessToken().then((t) => {
      if (!t) return;
      if (nextActive) serverUpsertMany(t, [id]); else serverRemove(t, id);
    });
  }, [getAccessToken, serverUpsertMany, serverRemove]);

  const remove = useCallback((id: string) => {
    const cur = readState().ids;
    const next = cur.filter((x) => x !== id);
    writeState({ ids: next });
    emitUpdate(next);
    dispatch({ type: "remove", id });
    getAccessToken().then((t) => { if (t) serverRemove(t, id); });
  }, [getAccessToken, serverRemove]);

  const clear = useCallback(() => {
    writeState({ ids: [] });
    emitUpdate([]);
    dispatch({ type: "clear" });
  }, []);

  useEffect(() => {
    const missing = state.ids.filter((id) => !productMap.has(id));
    if (!missing.length) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await getProductsByIds(missing);
        if (cancelled || !rows.length) return;
        setProductMap((prev) => {
          const next = new Map(prev);
          rows.forEach((product) => next.set(product.id, product));
          return next;
        });
      } catch {
        // ignore fetch errors
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state.ids, productMap]);

  const value: Ctx = useMemo(() => {
    const items = state.ids.map((id) => productMap.get(id)).filter(Boolean) as Product[];
    return { ids: state.ids, items, add, toggle, remove, clear };
  }, [state.ids, productMap, add, toggle, remove, clear]);

  useEffect(() => {
    const syncFromStorage = () => {
      const next = readState().ids;
      const current = stateRef.current;
      if (next.length === current.length && next.every((id, index) => id === current[index])) return;
      dispatch({ type: "hydrate", ids: next });
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key && event.key !== LS_KEY) return;
      syncFromStorage();
    };
    window.addEventListener("storage", onStorage);
    const handleCustom = () => syncFromStorage();
    window.addEventListener("wishlist:update", handleCustom);
    syncFromStorage();
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("wishlist:update", handleCustom);
    };
  }, []);

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist(): Ctx {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within <WishlistProvider>");
  return ctx;
}

