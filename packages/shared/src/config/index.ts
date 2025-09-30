// Unified app configuration for both Vite (VITE_*) and Next.js (NEXT_PUBLIC_*)

const isBrowser = typeof window !== "undefined";
const viteEnv: any = (import.meta as any)?.env || {};

// Prefer literal reads so Next.js can inline variables during build
const NEXT_SITE_ORIGIN = (process.env.NEXT_PUBLIC_SITE_ORIGIN ?? "").trim();
const VITE_SITE_ORIGIN = (viteEnv?.VITE_SITE_ORIGIN ?? "").trim();
export const SITE_ORIGIN: string = NEXT_SITE_ORIGIN || VITE_SITE_ORIGIN || (isBrowser ? window.location.origin : "");

const NEXT_SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();
const VITE_SITE_URL = (viteEnv?.VITE_SITE_URL ?? "").trim();
export const SITE_URL: string = NEXT_SITE_URL || VITE_SITE_URL || SITE_ORIGIN || "";

const NEXT_SITE_NAME = (process.env.NEXT_PUBLIC_SITE_NAME ?? "").trim();
const VITE_SITE_NAME = (viteEnv?.VITE_SITE_NAME ?? "").trim();
export const SITE_NAME: string = NEXT_SITE_NAME || VITE_SITE_NAME || "CasinoHub";

const NEXT_BRAND_NAME = (process.env.NEXT_PUBLIC_BRAND_NAME ?? "").trim();
const VITE_BRAND_NAME = (viteEnv?.VITE_BRAND_NAME ?? "").trim();
export const BRAND_NAME: string = NEXT_BRAND_NAME || VITE_BRAND_NAME || SITE_NAME;

const NEXT_BRAND_LOGO = (process.env.NEXT_PUBLIC_BRAND_LOGO ?? "").trim();
const VITE_BRAND_LOGO = (viteEnv?.VITE_BRAND_LOGO ?? "").trim();
export const BRAND_LOGO: string = NEXT_BRAND_LOGO || VITE_BRAND_LOGO || "/logo.png";
export const SITE_LOGO: string = BRAND_LOGO; // Back-compat alias

export const GA_ID: string = (process.env.NEXT_PUBLIC_GA_ID ?? viteEnv?.VITE_GA_ID ?? "").trim();

// Supabase: read both Next and Vite naming, with literal access for Next replacement
const NEXT_SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const VITE_SUPABASE_URL = (viteEnv?.VITE_SUPABASE_URL ?? "").trim();
const RAW_SUPABASE_URL: string = NEXT_SUPABASE_URL || VITE_SUPABASE_URL || (process.env.SUPABASE_URL ?? "").trim();
export const SUPABASE_URL: string = (RAW_SUPABASE_URL || "").replace(/\/+$/, "");

const NEXT_SUPABASE_PUB = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
const VITE_SUPABASE_PUB = (viteEnv?.VITE_SUPABASE_PUBLISHABLE_KEY ?? viteEnv?.VITE_SUPABASE_KEY ?? "").trim();
export const SUPABASE_PUBLISHABLE_KEY: string = NEXT_SUPABASE_PUB || VITE_SUPABASE_PUB || (process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? "").trim();

const RAW_SUPABASE_PRODUCT_BUCKET: string = (viteEnv?.VITE_SUPABASE_PRODUCT_BUCKET ?? process.env.NEXT_PUBLIC_SUPABASE_PRODUCT_BUCKET ?? "").trim();
export const SUPABASE_PRODUCT_IMAGES_BUCKET: string = RAW_SUPABASE_PRODUCT_BUCKET || "product-images";

export const AUTH_CALLBACK_URL: string = `${SITE_URL.replace(/\/$/, "")}/auth/callback`;

export const HAS_SUPABASE: boolean = /^https?:\/\/.+\.supabase\.co$/i.test(SUPABASE_URL) && !!SUPABASE_PUBLISHABLE_KEY;

if (!HAS_SUPABASE) {
  throw new Error("VITE/NEXT_PUBLIC SUPABASE env vars must be configured");
}


