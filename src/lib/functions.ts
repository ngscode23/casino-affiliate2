// src/lib/functions.ts
// Base URL for Netlify Functions. In production, relative path works.
// In local dev without `netlify dev`, set VITE_FUNCTIONS_URL to e.g. http://localhost:8888/.netlify/functions

export const FUNCTIONS_URL: string =
  (import.meta.env.VITE_FUNCTIONS_URL as string) || '/.netlify/functions';

export function fn(path: string): string {
  const base = FUNCTIONS_URL.replace(/\/$/, '');
  const p = String(path || '').replace(/^\//, '');
  return `${base}/${p}`;
}

