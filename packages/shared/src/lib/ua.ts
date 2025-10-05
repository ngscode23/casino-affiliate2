// src/lib/ua.ts
export function isBotUA(ua: string | null | undefined): boolean {
  if (!ua) return false;
  return /bot|spider|crawl/i.test(ua);
}


