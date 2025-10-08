import { isDevEnvironment } from "./env";

export const RECENT_KEY = "recent:offers:v1";
export const RECENT_MAX = 12;

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** Determine whether verbose logging should be enabled. */
function isDevMode(): boolean {
  if (isDevEnvironment()) return true;
  try {
    if (typeof globalThis !== "undefined") {
      const flag = (globalThis as any).__DEV__ ?? (globalThis as any).__DEV_MODE__;
      if (typeof flag === "boolean") return flag;
    }
  } catch {
    /* ignore access errors */
  }
  return false;
}

function resolveStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;

  try {
    const storage = window.localStorage;
    if (!storage) return null;
    // Probe to ensure the caller has permission to read/write (can throw in some environments).
    storage.getItem(RECENT_KEY);
    return storage;
  } catch (error) {
    if (isDevMode()) console.warn("[recent] storage unavailable:", error);
    return null;
  }
}

function readRecent(storage: StorageLike): string[] {
  try {
    const raw = storage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === "string");
  } catch (error) {
    if (isDevMode()) console.warn("[recent] read failed:", error);
    return [];
  }
}

function writeRecent(storage: StorageLike, list: string[]) {
  try {
    storage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_MAX)));
  } catch (error) {
    if (isDevMode()) console.warn("[recent] persist failed:", error);
  }
}

export function getRecent(): string[] {
  const storage = resolveStorage();
  if (!storage) return [];
  return readRecent(storage);
}

export function pushRecent(slug: string | null | undefined) {
  const storage = resolveStorage();
  if (!storage) return;

  const key = `${slug ?? ""}`.trim();
  if (!key) return;

  const list = readRecent(storage).filter((value) => value !== key);
  list.unshift(key);
  writeRecent(storage, list);
}

export function clearRecent() {
  const storage = resolveStorage();
  if (!storage) return;

  try {
    storage.removeItem(RECENT_KEY);
  } catch (error) {
    if (isDevMode()) console.warn("[recent] clear failed:", error);
  }
}
