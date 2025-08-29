// src/lib/offers.ts
import { slugify } from "./slug";
import { offers as rawOffers } from "@/data/offers";
import type { Offer as RawOffer } from "@/data/schema";

/**
 * Нормализуем значение лицензии в удобочитаемую форму.
 * Возвращаем "Curaçao" для вариаций curacao/curaçao, иначе оставляем как есть.
 */
const normLicense = (s?: string) => {
  if (!s) return "Other";
  if (/^curacao$/i.test(s) || /^cura(c|ç)ao$/i.test(s)) return "Curaçao";
  // Обрезаем лишние пробелы и возвращаем исходную строку (в том числе "MGA", "UKGC" и т.п.)
  return String(s).trim();
};

export type NormalizedOffer = Omit<RawOffer, "slug" | "methods" | "license"> & {
  slug: string;
  methods: string[];
  license: "MGA" | "UKGC" | "Curaçao" | "Other" | string;
};

/**
 * Приводим методы выплат к массиву строк: trim, filter empty, unique.
 */
function normalizeMethods(raw?: any): string[] {
  const arr = (raw ?? []) as any[];
  return Array.from(
    new Set(
      arr
        .map((x) => (x == null ? "" : String(x).trim()))
        .filter(Boolean)
    )
  );
}

export function normalizeOffer(o: RawOffer): NormalizedOffer {
  const methods = normalizeMethods(o.methods ?? (o as any).payments ?? []);
  const slug = o.slug ? String(o.slug) : slugify(String(o.name ?? ""));
  return {
    ...o,
    slug,
    methods,
    license: normLicense(o.license),
  } as NormalizedOffer;
}

export const offersNormalized: NormalizedOffer[] = (rawOffers as RawOffer[])
  .filter(Boolean)
  .map(normalizeOffer);



  // добавь один раз в файле (или в d.ts), чтобы не нужны были ts-ignore
declare global {
  interface Window {
    __offersNormalized?: NormalizedOffer[];
    __clearFavs?: () => void;
  }
}
export {};
// dev helper: expose normalized offers for quick debugging in browser console (dev only)
if (import.meta.env?.DEV && typeof window !== "undefined") {
  
  (window as any).__offersNormalized = offersNormalized;
}