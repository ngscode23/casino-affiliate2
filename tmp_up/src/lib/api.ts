let __base = (import.meta.env.VITE_FN_BASE || "") as string;
while (__base.endsWith("/")) __base = __base.slice(0, -1);
export const FN_BASE = __base;

export function fnUrl(name: string) {
  // всегда относительный путь; никаких точек после functions
  return `${FN_BASE}/.netlify/functions/${name}`;
}
