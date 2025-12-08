const CACHE_KEY = "__SITE_ORIGIN_CACHE__";

function resolveSiteOrigin(): string {
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.NEXT_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
    "https://neon4.vercel.app";
  return origin.replace(/\/$/, "");
}

export function getSiteOrigin(): string {
  if (process.env[CACHE_KEY]) {
    return process.env[CACHE_KEY] as string;
  }
  const origin = resolveSiteOrigin();
  process.env[CACHE_KEY] = origin;
  return origin;
}

export function buildCanonical(path: string): string {
  if (!path) return getSiteOrigin();
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const origin = getSiteOrigin();
  return `${origin}${normalizedPath}`;
}
