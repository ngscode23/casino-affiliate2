import { useCallback, useEffect, useMemo, useState } from "react";

const LS_KEY = "fav:v1";

let cache: string[] = [];
const bus = new EventTarget();

function normalizeKey(slug: unknown): string {
  try {
    return String(slug ?? "").trim();
  } catch {
    return "";
  }
}

function readLocal(): string[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.map(normalizeKey).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writeLocal(list: string[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

function setCache(next: string[]) {
  cache = Array.from(new Set(next.map(normalizeKey).filter(Boolean)));
  writeLocal(cache);
  bus.dispatchEvent(new CustomEvent("fav:update", { detail: cache }));
}

if (typeof window !== "undefined") {
  if (cache.length === 0) {
    cache = readLocal();
    writeLocal(cache);
  }
  window.addEventListener("storage", (e) => {
    if (e.key === LS_KEY) setCache(readLocal());
  });
}

export type UseFavoritesReturn = {
  items: string[];
  isFavorite: (slug: string) => boolean;
  add: (slug: string) => boolean;
  remove: (slug: string) => boolean;
  toggle: (slug: string) => boolean;
  clear: () => void;
  isLoading: boolean;
  error: string | null;
};

export function useFavorites(userId?: string): UseFavoritesReturn {
  void userId;
  const [items, setItems] = useState<string[]>(cache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onUpdate = (e: Event) => {
      const detail = (e as CustomEvent<string[]>).detail;
      if (Array.isArray(detail)) setItems(detail);
    };
    bus.addEventListener("fav:update", onUpdate);
    return () => bus.removeEventListener("fav:update", onUpdate);
  }, []);

  const isFavorite = useCallback((slug: string) => cache.includes(normalizeKey(slug)), []);

  const add = useCallback((slug: string): boolean => {
    const key = normalizeKey(slug);
    if (!key) return false;
    if (cache.includes(key)) return true;
    try {
      setCache([...cache, key]);
      return true;
    } catch (err: any) {
      setError(err?.message || "Не удалось добавить в избранное");
      return false;
    }
  }, []);

  const remove = useCallback((slug: string): boolean => {
    const key = normalizeKey(slug);
    if (!key) return false;
    if (!cache.includes(key)) return false;
    try {
      setCache(cache.filter((x) => x !== key));
      return false;
    } catch (err: any) {
      setError(err?.message || "Не удалось удалить из избранного");
      return false;
    }
  }, []);

  const toggle = useCallback((slug: string): boolean => {
    const key = normalizeKey(slug);
    if (!key) return false;
    return cache.includes(key) ? remove(key) : add(key);
  }, [add, remove]);

  const clear = useCallback(() => setCache([]), []);

  return useMemo(
    () => ({ items, isFavorite, add, remove, toggle, clear, isLoading: false, error }),
    [items, isFavorite, add, remove, toggle, clear, error]
  );
}

