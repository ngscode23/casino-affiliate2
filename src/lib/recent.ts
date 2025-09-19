// src/lib/recent.ts

export const RECENT_KEY = "recent:offers:v1";
export const RECENT_MAX = 12;

/** Безопасно читаем localStorage (и фильтруем мусор). */
function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((x) => typeof x === "string");
  } catch (e) {
    if (import.meta.env.DEV) console.warn("[recent] read failed:", e);
    return [];
  }
}

/** Безопасно пишем localStorage. */
function writeRecent(list: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_MAX)));
  } catch (e) {
    if (import.meta.env.DEV) console.warn("[recent] persist failed:", e);
  }
}

/** Отдаём список slug'ов (последние-сначала). */
export function getRecent(): string[] {
  if (typeof window === "undefined") return [];
  return readRecent();
}

/** Кладём slug в начало, убираем дубликаты, режем по лимиту. */
export function pushRecent(slug: string | null | undefined) {
  if (typeof window === "undefined") return;

  const key = String(slug ?? "").trim();
  if (!key) return;

  const list = readRecent().filter((s) => s !== key);
  list.unshift(key);
  writeRecent(list);
}

/** Полная очистка истории. */
export function clearRecent() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch (e) {
    if (import.meta.env.DEV) console.warn("[recent] clear failed:", e);
  }
}