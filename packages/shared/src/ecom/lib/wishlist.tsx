import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useCallback,
} from "react";
import { products } from "@shared/ecom/data/products";
import type { Product } from "@shared/ecom/lib/types";
import { API_BASE, API_FALLBACK_BASE } from "@shared/ecom/api/client";
import { getValidAccessToken, onAuthStateChange } from "@shared/lib/auth";

/**
 * Храним в localStorage объект вида { ids: string[] }
 * Совместимость: если вдруг лежит старый формат (просто массив), тоже прочитаем.
 */
const LS_KEY = "ecom:wishlist";

type State = { ids: string[] };
type Action =
  | { type: "add"; id: string }
  | { type: "toggle"; id: string }
  | { type: "remove"; id: string }
  | { type: "clear" };

function readState(): State {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ids: [] };
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return { ids: parsed.filter(x => typeof x === "string") };
    if (parsed && Array.isArray(parsed.ids)) {
      return { ids: parsed.ids.filter((x: unknown) => typeof x === "string") };
    }
    return { ids: [] };
  } catch {
    return { ids: [] };
  }
}

function writeState(state: State) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "add": {
      if (state.ids.includes(action.id)) return state;
      return { ids: [...state.ids, action.id] };
    }
    case "toggle": {
      return state.ids.includes(action.id)
        ? { ids: state.ids.filter(x => x !== action.id) }
        : { ids: [...state.ids, action.id] };
    }
    case "remove":
      return { ids: state.ids.filter(x => x !== action.id) };
    case "clear":
      return { ids: [] };
    default:
      return state;
  }
}

type Ctx = {
  ids: string[];
  items: Product[]; // список продуктов (если есть в каталоге)
  add: (id: string) => void;
  toggle: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const WishlistContext = createContext<Ctx | null>(null);

/**
 * Провайдер. Инициализация из localStorage с ленивым инитом редьюсера.
 */
// wishlist.tsx

// было:
// export function WishlistProvider({ children }: React.PropsWithChildren<{}>) {
export function WishlistProvider({ children }: React.PropsWithChildren) {
  const [state, dispatch] = useReducer(reducer, undefined, () => readState());
  const SERVER_SYNC = ((import.meta as any).env?.VITE_WISHLIST_SERVER_SYNC ?? 'true') !== 'false';

  // синхронизация со storage
  useEffect(() => {
    try {
      writeState(state);
    } catch {
      // ignore: storage может быть недоступен/заблокирован
    }
  }, [state]);

  // ---- server sync helpers ----
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      return await getValidAccessToken();
    } catch {
      return null;
    }
  }, []);

  const fetchWithRetry = useCallback(async (
    path: string,
    init: RequestInit & { tries?: number } = {}
  ) => {
    const tries = init.tries ?? 3;
    let attempt = 0;
    let lastErr: any = null;
    while (attempt < tries) {
      try {
        let res = await fetch(path, init);
        if (res.status === 404 && path.startsWith(API_BASE)) {
          const fallback = API_FALLBACK_BASE + path.slice(API_BASE.length);
          res = await fetch(fallback, init);
        }
        if (res.status >= 500 || res.status === 429) throw new Error(`HTTP ${res.status}`);
        return res;
      } catch (e) {
        lastErr = e;
        attempt += 1;
        await new Promise((r) => setTimeout(r, 300 * attempt));
      }
    }
    throw lastErr || new Error("request failed");
  }, []);

  const serverList = useCallback(async (token: string): Promise<string[]> => {
    if (!SERVER_SYNC) return [];
    const res = await fetchWithRetry(`${API_BASE}/ecom-wishlist/list`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      tries: 3,
    } as any);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.items) ? data.items.map((r: any) => String(r.product_id)) : [];
  }, [SERVER_SYNC, fetchWithRetry]);

  const serverUpsertMany = useCallback(async (token: string, ids: string[]) => {
    if (!SERVER_SYNC) return;
    for (const id of ids) {
      try {
        await fetchWithRetry(`${API_BASE}/ecom-wishlist/upsert`, {
          method: "POST",
          headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ product_id: id }),
          tries: 3,
        } as any);
      } catch {
        // ignore single-item failure
      }
    }
  }, [SERVER_SYNC, fetchWithRetry]);

  const serverRemove = useCallback(async (token: string, id: string) => {
    if (!SERVER_SYNC) return;
    try {
      await fetchWithRetry(`${API_BASE}/ecom-wishlist/remove`, {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ product_id: id }),
        tries: 3,
      } as any);
    } catch {
      /* ignore */
    }
  }, [SERVER_SYNC, fetchWithRetry]);

  // initial sync and auth change handling
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
      dispatch({ type: "clear" });
      for (const id of merged) dispatch({ type: "add", id });
    })();

    const unsubscribe = onAuthStateChange(async (state) => {
      if (!state.user || !state.session?.accessToken) {
        writeState({ ids: [] });
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
      dispatch({ type: "clear" });
      for (const id of merged) dispatch({ type: "add", id });
    });

    return () => { cancelled = true; unsubscribe(); };
  }, [getAccessToken, serverList, serverUpsertMany]);

  // коллбеки; dispatch стабилен, пустой deps ок
  const add = useCallback((id: string) => {
    dispatch({ type: "add", id });
    getAccessToken().then((t) => { if (t) serverUpsertMany(t, [id]); });
  }, [getAccessToken, serverUpsertMany]);
  const toggle = useCallback((id: string) => {
    const next = !readState().ids.includes(id);
    dispatch({ type: "toggle", id });
    getAccessToken().then((t) => {
      if (!t) return;
      if (next) {
        serverUpsertMany(t, [id]);
      } else {
        serverRemove(t, id);
      }
    });
  }, [getAccessToken, serverUpsertMany, serverRemove]);
  const remove = useCallback((id: string) => {
    dispatch({ type: "remove", id });
    getAccessToken().then((t) => { if (t) serverRemove(t, id); });
  }, [getAccessToken, serverRemove]);
  const clear = useCallback(() => dispatch({ type: "clear" }), []);

  const value: Ctx = useMemo(() => {
    const set = new Set(state.ids);
    const items = products.filter(p => set.has(p.id));
    return { ids: state.ids, items, add, toggle, remove, clear };
  }, [state.ids, add, toggle, remove, clear]);

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

/**
 * Хук доступа к контексту.
 * Бросает, если провайдер не обернул дерево.
 */
export function useWishlist(): Ctx {
  const ctx = useContext(WishlistContext);
  if (!ctx) {
    throw new Error("useWishlist must be used within <WishlistProvider>");
  }
  return ctx;
}

