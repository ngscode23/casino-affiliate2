// src/lib/useFavorites.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { HAS_SUPABASE } from "@/config";

/** Ключ в localStorage */
const LS_KEY = "fav:v1";

/** Шина событий для синхронизации экземпляров хука и вкладок */
const bus = new EventTarget();

/** Глобальный кэш (на уровне модуля) */
let cache: string[] = [];

/* ---------------- helpers ---------------- */

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
    /* ignore quota errors */
  }
}

function setCache(next: string[]) {
  cache = Array.from(new Set(next.map(normalizeKey).filter(Boolean)));
  writeLocal(cache);
  bus.dispatchEvent(new CustomEvent("fav:update", { detail: cache }));
}

/** Инициализация кэша и синк между вкладками */
if (typeof window !== "undefined") {
  if (cache.length === 0) {
    cache = readLocal();
    writeLocal(cache);
  }
  window.addEventListener("storage", (e) => {
    if (e.key === LS_KEY) setCache(readLocal());
  });
}

/* --------------- types & hook --------------- */

export type UseFavoritesReturn = {
  items: string[];
  isFavorite: (slug: string) => boolean;
  /** Возвращают новое состояние для данного slug */
  add: (slug: string) => boolean;
  remove: (slug: string) => boolean;
  toggle: (slug: string) => boolean;

  clear: () => void;
  isLoading: boolean;
  error: string | null;
};

export function useFavorites(userId?: string): UseFavoritesReturn {
  const [items, setItems] = useState<string[]>(cache);
  const [isLoading, setIsLoading] = useState<boolean>(!!(HAS_SUPABASE && userId));
  const [error, setError] = useState<string | null>(null);

  // подписка на глобальные обновления
  useEffect(() => {
    const onUpdate = (e: Event) => {
      const detail = (e as CustomEvent<string[]>).detail;
      if (Array.isArray(detail)) setItems(detail);
    };
    bus.addEventListener("fav:update", onUpdate);
    return () => bus.removeEventListener("fav:update", onUpdate);
  }, []);

  // первичная загрузка из Supabase (опционально)
  useEffect(() => {
    if (!HAS_SUPABASE || !userId) {
      setItems(cache);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        const { data, error } = await (supabase as any)
          .from("favorites")
          .select("offer_id")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (cancelled) return;

        if (error) {
          console.warn("[favorites] select error:", error);
          setError(error.message ?? "favorites select error");
          setItems(cache);
        } else {
          const remote: string[] = (data ?? []).map((r: any) => normalizeKey(r.offer_id));
          setCache(remote); // синхронизирует и setItems через шину
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const isFavorite = useCallback((slug: string) => cache.includes(normalizeKey(slug)), []);

  const add = useCallback(
    (slug: string): boolean => {
      const key = normalizeKey(slug);
      if (!key) return false;
      if (cache.includes(key)) return true;

      setCache([...cache, key]);

      if (HAS_SUPABASE && userId) {
        (async () => {
          const { error } = await (supabase as any)
            .from("favorites")
            .upsert([{ user_id: userId, offer_id: key }], { onConflict: "user_id,offer_id" });
          if (error) {
            console.warn("[favorites] upsert error:", error);
            setError(error.message ?? "favorites upsert error");
          }
        })();
      }

      return true;
    },
    [userId]
  );

  const remove = useCallback(
    (slug: string): boolean => {
      const key = normalizeKey(slug);
      if (!key) return false;
      if (!cache.includes(key)) return false;

      setCache(cache.filter((x) => x !== key));

      if (HAS_SUPABASE && userId) {
        (async () => {
          const { error } = await (supabase as any)
            .from("favorites")
            .delete()
            .eq("user_id", userId)
            .eq("offer_id", key);
          if (error) {
            console.warn("[favorites] delete error:", error);
            setError(error.message ?? "favorites delete error");
          }
        })();
      }

      return false;
    },
    [userId]
  );

  const toggle = useCallback(
    (slug: string): boolean => {
      const key = normalizeKey(slug);
      if (!key) return false;
      return cache.includes(key) ? remove(key) : add(key);
    },
    [add, remove]
  );

  const clear = useCallback(() => setCache([]), []);

  return useMemo(
    () => ({ items, isFavorite, add, remove, toggle, clear, isLoading, error }),
    [items, isFavorite, add, remove, toggle, clear, isLoading, error]
  );
}
