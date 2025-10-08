// src/features/offers/api/getOffers.ts
import { supabase } from "@shared/lib/supabase";
import { offersNormalized } from "@shared/lib/offers"; // только данные, не типы!
import { HAS_SUPABASE } from "@shared/config";

// каноничные типы берем отсюда
import type { NormalizedOffer } from "@shared/lib/offers";

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
// Cache pinned slugs for 5 minutes to reduce RPC calls
let __pinnedCache: { data: string[]; ts: number } | null = null;
const PINNED_TTL_MS = 5 * 60 * 1000;

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

    // Pinned slugs via RPC (security definer) with 5m cache
    // Try to fetch meta (slug+plan) for UI badges; fall back to slugs
    let pinned: string[] = [];
    const pinnedPlan = new Map<string, string>();
    const now = Date.now();
    if (__pinnedCache && now - __pinnedCache.ts < PINNED_TTL_MS) {
      pinned = __pinnedCache.data;
    } else {
      try {
        const rmeta = await (supabase as any).rpc("pinned_offer_meta");
        if (!rmeta.error && Array.isArray(rmeta.data)) {
          for (const row of (rmeta.data as any[])) {
            const slug = String((row && (row.offer_slug ?? row.slug)) || "");
            const plan = row?.plan ? String(row.plan) : undefined;
            if (!slug) continue;
            pinned.push(slug);
            if (plan) pinnedPlan.set(slug, plan);
          }
        } else {
          const r = await (supabase as any).rpc("pinned_offer_slugs");
          if (!r.error && Array.isArray(r.data)) pinned = r.data as string[];
        }
        __pinnedCache = { data: pinned, ts: now };
      } catch { /* noop */ }
    }

    const list = (data as DbOffer[]).map(rowToNormalized).map((o) => {
      const plan = pinnedPlan.get(o.slug);
      const isPinned = pinned.includes(o.slug);
      return (plan || isPinned) ? ({ ...o, pinned: isPinned, pinnedPlan: plan } as any) : o;
    });
    if (pinned.length) {
      const set = new Set(pinned);
      return list.sort((a,b) => (set.has(a.slug) === set.has(b.slug)) ? 0 : (set.has(a.slug) ? -1 : 1));
    }
    return list;
  } catch {
    return offersNormalized.map(localToNormalized);
  }
}

/** Поиск одного оффера по slug c тем же источником/фолбэком */
export async function getOfferBySlug(slug: string): Promise<NormalizedOffer | null> {
  const list = await getOffers();
  return list.find((o) => o.slug === slug) ?? null;
}



