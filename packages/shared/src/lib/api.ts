// Functions base URL resolution
const env = (() => {
  const fromProcess = typeof process !== "undefined" && process.env ? process.env : {};
  const fromImport = typeof import.meta !== "undefined" && (import.meta as any)?.env ? (import.meta as any).env : {};
  return { ...fromImport, ...fromProcess } as Record<string, string | undefined>;
})();

function pickEnv(...keys: string[]): string {
  for (const key of keys) {
    const value = env[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

let __base = pickEnv(
  "NEXT_PUBLIC_FUNCTIONS_URL",
  "NEXT_PUBLIC_FN_BASE",
  "VITE_FUNCTIONS_URL",
  "VITE_FN_BASE",
  "FUNCTIONS_URL",
  "FN_BASE"
);
while (__base.endsWith("/")) __base = __base.slice(0, -1);
export const FN_BASE = __base;

export function fnUrl(name: string) {
  // всегда относительный путь на /api
  return `${FN_BASE}/api/${name}`;
}

// Helper to call admin endpoints with token header when available
export async function adminFetch(input: string, init: RequestInit = {}) {
  const token =
    pickEnv("NEXT_PUBLIC_ADMIN_TOKEN", "VITE_ADMIN_TOKEN", "ADMIN_TOKEN") || undefined;
  const headers = new Headers(init.headers as HeadersInit | undefined);
  if (!headers.has("accept")) headers.set("accept", "application/json");
  if (token && !headers.has("x-admin-token")) headers.set("x-admin-token", token);
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  return fetch(input, { ...init, headers });
}

