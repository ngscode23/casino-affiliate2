// src/features/offers/api/getOffers.ts
import { supabase } from "@/lib/supabase";
import { offersNormalized } from "@/lib/offers"; // только данные, не типы!
import { HAS_SUPABASE } from "@/config";

// каноничные типы берем отсюда
import type { NormalizedOffer } from "@/lib/offers";

// Если тип License отдельно не экспортируется, оставь локально:
type License = "MGA" | "UKGC" | "Curaçao" | "Other";

/** Строка из БД Supabase (таблица public.offers) */
type DbOffer = {
  slug: string;
  name: string;
  rating: number | null;
  license: License;              // в БД у нас уже enum-подобные строки
  payout: string | null;
  payout_hours: number | null;
  methods: string[] | null;
  link: string | null;
  enabled: boolean;
  position: number | null;
};

/** Нормализация license из произвольной строки */
function normalizeLicense(v?: string | null): License {
  if (!v) return "Other";
  const s = v.normalize("NFKD").replace(/\u0301/g, "").toLowerCase();
  if (s === "mga") return "MGA";
  if (s === "ukgc") return "UKGC";
  if (s === "curaçao" || s === "curacao" || /cura[ck]ao/.test(s)) return "Curaçao";
  return "Other";
}

/** Приведение строки БД к формату UI */
function rowToNormalized(r: DbOffer): NormalizedOffer {
  return {
    slug: r.slug,
    name: r.name,
    license: r.license,                        // уже License
    rating: Number(r.rating ?? 0),
    payout: r.payout ?? "",
    payoutHours: r.payout_hours ?? undefined,
    methods: Array.isArray(r.methods) ? r.methods : [],
    link: r.link ?? undefined,                 // null -> undefined
    enabled: !!r.enabled,
    position: r.position ?? undefined,
  };
}

/** Приведение локального оффера к формату UI (фолбэк) */
function localToNormalized(o: any): NormalizedOffer {
  return {
    slug: o.slug,
    name: o.name,
    license: normalizeLicense(o.license),
    rating: Number(o.rating ?? 0),
    payout: o.payout ?? "",
    payoutHours: o.payoutHours ?? undefined,
    methods: Array.isArray(o.methods) ? o.methods : [],
    link: o.link ?? undefined,                 // null -> undefined
    enabled: o.enabled ?? true,
    position: o.position ?? undefined,
  };
}

/**
 * Источник офферов:
 *  - Supabase (offers, enabled=true, сортировка по position/name)
 *  - fallback: локальные offersNormalized (с нормализацией лицензии)
 */
export async function getOffers(): Promise<NormalizedOffer[]> {
  try {
    if (!HAS_SUPABASE) {
      return offersNormalized.map(localToNormalized);
    }

    const { data, error } = await (supabase as any)
      .from("offers")
      .select("*")
      .eq("enabled", true)
      .order("position", { ascending: true, nullsFirst: true })
      .order("name", { ascending: true });

    if (error || !data) {
      return offersNormalized.map(localToNormalized);
    }

    return (data as DbOffer[]).map(rowToNormalized);
  } catch {
    return offersNormalized.map(localToNormalized);
  }
}

/** Поиск одного оффера по slug c тем же источником/фолбэком */
export async function getOfferBySlug(slug: string): Promise<NormalizedOffer | null> {
  const list = await getOffers();
  return list.find((o) => o.slug === slug) ?? null;
}


