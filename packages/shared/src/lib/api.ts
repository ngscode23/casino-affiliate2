// Functions base URL resolution
let __base = (import.meta.env.VITE_FUNCTIONS_URL || import.meta.env.VITE_FN_BASE || "") as string;
while (__base.endsWith("/")) __base = __base.slice(0, -1);
export const FN_BASE = __base;

export function fnUrl(name: string) {
  // всегда относительный путь на /api
  return `${FN_BASE}/api/${name}`;
}

// Helper to call admin endpoints with token header when available
export async function adminFetch(input: string, init: RequestInit = {}) {
  const token = (import.meta as any).env?.VITE_ADMIN_TOKEN as string | undefined;
  const headers = new Headers(init.headers as HeadersInit | undefined);
  if (!headers.has("accept")) headers.set("accept", "application/json");
  if (token && !headers.has("x-admin-token")) headers.set("x-admin-token", token);
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  return fetch(input, { ...init, headers });
}

