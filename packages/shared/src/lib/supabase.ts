// @shared/lib/supabase.ts
// Универсальный клиент: работает в браузере и на сервере (SSR), дружит с HMR.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@shared/config";

// ---- sanity checks + почистим URL
function normalizeUrl(u?: string) {
  const v = (u || "").trim();
  if (!v) return v;
  // убираем завершающий слэш: https://xyz.supabase.co/ -> https://xyz.supabase.co
  return v.endsWith("/") ? v.slice(0, -1) : v;
}

const URL_NORM = normalizeUrl(SUPABASE_URL);
const KEY = SUPABASE_PUBLISHABLE_KEY;

if (!URL_NORM) {
  throw new Error("[supabase] SUPABASE_URL is not configured");
}
if (!KEY) {
  throw new Error("[supabase] SUPABASE_PUBLISHABLE_KEY is not configured");
}

// ---- общий ключ хранения (только для браузера)
const storageKey = "sb-casino-affiliate-auth";

// ---- фабрика: разные опции для браузера и сервера
function createSupabase(isBrowser: boolean): SupabaseClient {
  return createClient(URL_NORM!, KEY!, {
    auth: isBrowser
      ? {
          // В браузере храним сессию и автообновляем токены
          persistSession: true,
          autoRefreshToken: true,
          storageKey,
        }
      : {
          // На сервере НЕ пытаемся трогать localStorage/cookies
          persistSession: false,
          autoRefreshToken: false,
        },
    // Можно включить debug при разработке:
    // global: { headers: { 'x-debug': '1' } },
  });
}

// ---- singleton для обоих миров
declare global {
  var __supabase_srv__: SupabaseClient | undefined; // для Node/SSR
  interface Window {
    __supabase?: SupabaseClient; // для браузера/HMR
  }
}

let supabaseInstance: SupabaseClient;

if (typeof window === "undefined") {
  // SSR/Node
  if (!global.__supabase_srv__) {
    global.__supabase_srv__ = createSupabase(false);
  }
  supabaseInstance = global.__supabase_srv__;
} else {
  // Browser
  if (!window.__supabase) {
    window.__supabase = createSupabase(true);
  }
  supabaseInstance = window.__supabase;
}

export const supabase = supabaseInstance;
export type { SupabaseClient };

