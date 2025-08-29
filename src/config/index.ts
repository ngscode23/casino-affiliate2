// Unified app configuration
// Reads from Vite env (VITE_*) with sensible fallbacks and exports a single source of truth.

const isBrowser = typeof window !== "undefined";

export const SITE_ORIGIN: string =
  (import.meta as any).env?.VITE_SITE_ORIGIN || (isBrowser ? window.location.origin : "");

export const SITE_URL: string =
  (import.meta as any).env?.VITE_SITE_URL || SITE_ORIGIN || "";

export const SITE_NAME: string = (import.meta as any).env?.VITE_SITE_NAME || "CasinoHub";

export const BRAND_NAME: string = (import.meta as any).env?.VITE_BRAND_NAME || SITE_NAME;
export const BRAND_LOGO: string = (import.meta as any).env?.VITE_BRAND_LOGO || "/logo.png";

// Back-compat alias for components expecting SITE_LOGO from old config
export const SITE_LOGO: string = BRAND_LOGO;

export const GA_ID: string = ((import.meta as any).env?.VITE_GA_ID || "").trim();

const RAW_SUPABASE_URL: string = ((import.meta as any).env?.VITE_SUPABASE_URL || "").trim();
export const SUPABASE_URL: string = RAW_SUPABASE_URL.replace(/\/+$/, "");
export const SUPABASE_ANON_KEY: string = ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY || "").trim();

export const AUTH_CALLBACK_URL: string = `${SITE_URL.replace(/\/$/, "")}/auth/callback`;

export const HAS_SUPABASE: boolean =
  /^https?:\/\/.+\.supabase\.co$/i.test(SUPABASE_URL) && !!SUPABASE_ANON_KEY;

if (!HAS_SUPABASE && (import.meta as any).env?.DEV) {
  console.warn("[config] VITE_SUPABASE_URL/KEY не заданы или некорректны — Supabase-фичи будут отключены.");
}

