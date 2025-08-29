// src/lib/cookies.ts

export type CookieOptions = {
  days?: number;                 // предпочтительное имя
  maxAgeDays?: number;           // алиас для совместимости
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: 'Lax' | 'Strict' | 'None';
};

export function setCookie(
  name: string,
  value: string,
  opts: CookieOptions = {}
): void {
  const {
    path = '/',
    domain,
    secure,
    sameSite = 'Lax',
  } = opts;

  const lifeDays = (opts.days ?? opts.maxAgeDays ?? 365);
  const expires = new Date(Date.now() + lifeDays * 864e5).toUTCString();

  let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Expires=${expires}; Path=${path}; SameSite=${sameSite}`;
  if (domain) cookie += `; Domain=${domain}`;
  if (secure || sameSite === 'None') cookie += '; Secure';

  document.cookie = cookie;
}

export function getCookie(name: string): string | null {
  const key = `${encodeURIComponent(name)}=`;
  const parts = document.cookie ? document.cookie.split('; ') : [];
  for (const part of parts) if (part.startsWith(key)) return decodeURIComponent(part.slice(key.length));
  return null;
}

export function deleteCookie(name: string, path: string = '/', domain?: string): void {
  let cookie = `${encodeURIComponent(name)}=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=${path}`;
  if (domain) cookie += `; Domain=${domain}`;
  document.cookie = cookie;
}

