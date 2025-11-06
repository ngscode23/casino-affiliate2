import { supabase } from "@shared/lib/supabase";
import { offersNormalized } from "@shared/lib/offers";
import { HAS_SUPABASE } from "@shared/config";
import type { NormalizedOffer } from "@shared/lib/offers";

type RemoteOfferRow = {
  slug: string;
  title: string | null;
  rating: number | null;
  attributes: Record<string, unknown> | null;
};

const PINNED_TTL_MS = 5 * 60 * 1000;
const REMOTE_LIMIT = 500;

let pinnedCache: { data: string[]; ts: number } | null = null;
let pinnedMetaCache: { data: Map<string, string>; ts: number; key: string } | null = null;

function cloneFallback(): NormalizedOffer[] {
  return offersNormalized.map((offer) => ({ ...offer }));
}

function normalizeLicense(raw: unknown): NormalizedOffer["license"] {
  if (typeof raw !== "string") return "Other";
  const trimmed = raw.trim();
  if (!trimmed) return "Other";
  const ascii = trimmed
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  if (ascii === "mga") return "MGA";
  if (ascii === "ukgc") return "UKGC";
  if (/^cura(c|k)ao$/.test(ascii)) return "Curaçao";
  return trimmed;
}

function normalizeMethods(raw: unknown): string[] {
  const values = Array.isArray(raw) ? raw : raw == null ? [] : [raw];
  const result: string[] = [];
  for (const value of values) {
    const str = String(value ?? "").trim();
    if (!str) continue;
    if (!result.includes(str)) result.push(str);
  }
  return result;
}

function parsePayoutHours(raw: unknown): number | undefined {
  if (raw == null) return undefined;
  const num = Number(raw);
  return Number.isFinite(num) ? num : undefined;
}

function mapRemote(row: RemoteOfferRow): NormalizedOffer {
  const attrs = (row.attributes ?? {}) as Record<string, unknown>;
  const payout = typeof attrs.payout === "string" ? attrs.payout : "";
  const link = typeof attrs.url === "string" ? attrs.url : typeof attrs.link === "string" ? attrs.link : undefined;
  const enabled = attrs.enabled == null ? undefined : Boolean(attrs.enabled);
  const positionValue = Number((attrs.position as number) ?? Number.NaN);
  const position = Number.isFinite(positionValue) ? positionValue : undefined;
  return {
    slug: String(row.slug),
    name: row.title ?? row.slug,
    license: normalizeLicense(attrs.compliance_license),
    rating: Number(row.rating ?? 0),
    payout,
    payoutHours: parsePayoutHours(attrs.payout_time_hours),
    methods: normalizeMethods(attrs.payout_methods),
    link,
    enabled,
    position,
  } as NormalizedOffer;
}

function applyPinned(list: NormalizedOffer[], pinned: string[], meta: Map<string, string>): NormalizedOffer[] {
  if (!pinned.length) return list;
  const set = new Set(pinned.map((slug) => String(slug)));
  const withTag = list.map((offer) => {
    if (!set.has(offer.slug)) return offer;
    const plan = meta.get(offer.slug);
    const extras = plan ? { pinned: true, pinnedPlan: plan } : { pinned: true };
    return { ...offer, ...extras } as any;
  });
  return withTag.sort((a, b) => {
    const aPinned = set.has(a.slug);
    const bPinned = set.has(b.slug);
    if (aPinned === bPinned) return 0;
    return aPinned ? -1 : 1;
  });
}

async function loadPinnedSlugs(): Promise<string[]> {
  const now = Date.now();
  if (pinnedCache && now - pinnedCache.ts < PINNED_TTL_MS) {
    return pinnedCache.data;
  }
  try {
    const { data, error } = await (supabase as any).rpc("pinned_offer_slugs");
    const slugs = !error && Array.isArray(data) ? (data as any[]).map((slug) => String(slug)) : [];
    pinnedCache = { data: slugs, ts: now };
    return slugs;
  } catch {
    pinnedCache = { data: [], ts: now };
    return [];
  }
}

async function loadPinnedMeta(slugs: string[]): Promise<Map<string, string>> {
  if (!slugs.length) {
    return new Map();
  }
  const key = slugs.join("|");
  const now = Date.now();
  if (pinnedMetaCache && now - pinnedMetaCache.ts < PINNED_TTL_MS && pinnedMetaCache.key === key) {
    return new Map(pinnedMetaCache.data);
  }

  const meta = new Map<string, string>();
  for (const slug of slugs) {
    try {
      const { data, error } = await (supabase as any).rpc("pinned_offer_meta", { slug });
      if (error || !data) continue;
      const payload = Array.isArray(data) ? data[0] : data;
      if (!payload) continue;
      const planCandidate =
        payload.plan ??
        payload.plan_name ??
        payload.planName ??
        payload.plan_code ??
        payload.planCode ??
        payload.plan_slug ??
        payload.planSlug;
      const plan = planCandidate == null ? "" : String(planCandidate).trim();
      if (plan) {
        meta.set(String(slug), plan);
      }
    } catch {
      // ignore per-slug errors to keep best-effort behaviour
    }
  }

  pinnedMetaCache = { data: meta, ts: now, key };
  return new Map(meta);
}

export async function getOffers(): Promise<NormalizedOffer[]> {
  if (!HAS_SUPABASE) {
    return cloneFallback();
  }

  const pinned = await loadPinnedSlugs();
  const pinnedMeta = await loadPinnedMeta(pinned);

  try {
    const { data, error } = await (supabase as any)
      .from("v_products_flat")
      .select("slug,title,rating,attributes")
      .order("rating", { ascending: false, nullsLast: true })
      .order("title", { ascending: true })
      .limit(REMOTE_LIMIT);

    if (error || !data) {
      return applyPinned(cloneFallback(), pinned, pinnedMeta);
    }

    const list = (data as RemoteOfferRow[]).map(mapRemote);
    return applyPinned(list, pinned, pinnedMeta);
  } catch {
    return applyPinned(cloneFallback(), pinned, pinnedMeta);
  }
}

export async function getOfferBySlug(slug: string): Promise<NormalizedOffer | null> {
  const list = await getOffers();
  return list.find((offer) => offer.slug === slug) ?? null;
}
