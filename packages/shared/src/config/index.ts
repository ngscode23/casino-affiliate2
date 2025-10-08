// Unified app configuration for Next.js (NEXT_PUBLIC_*)

import { envString } from "../lib/env";

const isBrowser = typeof window !== "undefined";

// Prefer literal reads so Next.js can inline variables during build
const SITE_ORIGIN_ENV = envString(["NEXT_PUBLIC_SITE_ORIGIN", "SITE_ORIGIN"]);
export const SITE_ORIGIN: string = SITE_ORIGIN_ENV || (isBrowser ? window.location.origin : "");

const SITE_URL_ENV = envString(["NEXT_PUBLIC_SITE_URL", "SITE_URL"]);
export const SITE_URL: string = SITE_URL_ENV || SITE_ORIGIN || "";

export const SITE_NAME: string = envString(["NEXT_PUBLIC_SITE_NAME", "SITE_NAME"], "CasinoHub");

export const BRAND_NAME: string = envString(["NEXT_PUBLIC_BRAND_NAME", "BRAND_NAME"], SITE_NAME);

export const BRAND_LOGO: string = envString(
  ["NEXT_PUBLIC_BRAND_LOGO", "BRAND_LOGO"],
  "/logo.png"
);
export const SITE_LOGO: string = BRAND_LOGO; // Back-compat alias

export const GA_ID: string = envString(
  ["NEXT_PUBLIC_GA_ID", "NEXT_PUBLIC_GA_MEASUREMENT_ID", "GA_ID", "GA_MEASUREMENT_ID"],
  ""
);

// Supabase: read both Next public and server naming, with literal access for Next replacement
const RAW_SUPABASE_URL: string = envString(
  ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"],
  ""
);
export const SUPABASE_URL: string = (RAW_SUPABASE_URL || "").replace(/\/+$/, "");

export const SUPABASE_PUBLISHABLE_KEY: string = envString(
  [
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_ANON_KEY",
  ],
  ""
);

export const SUPABASE_PRODUCT_IMAGES_BUCKET: string = envString(
  ["NEXT_PUBLIC_SUPABASE_PRODUCT_BUCKET", "SUPABASE_PRODUCT_BUCKET"],
  "product-images"
);

export const AUTH_CALLBACK_URL: string = `${SITE_URL.replace(/\/$/, "")}/auth/callback`;

function isValidSupabaseUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export const HAS_SUPABASE: boolean = isValidSupabaseUrl(SUPABASE_URL) && !!SUPABASE_PUBLISHABLE_KEY;

if (!HAS_SUPABASE) {
  throw new Error("NEXT_PUBLIC/SUPABASE env vars must be configured");
}
