export const SITE_NAME = import.meta.env.VITE_SITE_NAME ?? "SITE";
// src/lib/config.ts
export const SITE_ORIGIN =
  import.meta.env.VITE_SITE_ORIGIN ||
  (typeof window !== "undefined" ? window.location.origin : "");

export const SITE_URL =
  import.meta.env.VITE_SITE_URL || SITE_ORIGIN;

export const BRAND_NAME =
  import.meta.env.VITE_BRAND_NAME || "SITE";

export const BRAND_LOGO =
  import.meta.env.VITE_BRAND_LOGO || ""; // URL логотипа, если есть
