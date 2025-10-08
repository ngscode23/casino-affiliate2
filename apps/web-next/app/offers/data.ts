import type { NormalizedOffer } from "@shared/lib/offers";
import { offersNormalized } from "@shared/lib/offers";
import { createClient } from "@/utils/supabase/server";

type DbOffer = {
  slug: string;
  name: string;
  rating: number | null;
  license: string | null;
  payout: string | null;
  payout_hours: number | null;
  methods: string[] | null;
  link: string | null;
  enabled: boolean | null;
  position: number | null;
};

type OfferWithMeta = NormalizedOffer & {
  pinned?: boolean;
  pinnedPlan?: string;
  clicks: number;
};

function normalizeLicense(value?: string | null): NormalizedOffer["license"] {
  if (!value) return "Other";
  const plain = value.normalize("NFKD").replace(/\u0301/g, "").toLowerCase();
  if (plain === "mga") return "MGA";
  if (plain === "ukgc") return "UKGC";
  if (plain === "curacao" || plain === "curaçao" || /cura[ck]ao/.test(plain)) return "Curaçao";
  return value.trim();
}

function mapRow(row: DbOffer): NormalizedOffer {
  const methods = Array.isArray(row.methods) ? row.methods.filter(Boolean).map(String) : [];
  return {
    slug: String(row.slug),
    name: String(row.name),
    rating: row.rating == null ? 0 : Number(row.rating),
    license: normalizeLicense(row.license),
    payout: row.payout ?? "",
    payoutHours: row.payout_hours == null ? undefined : Number(row.payout_hours),
    methods,
    link: row.link ?? undefined,
    enabled: row.enabled ?? true,
    position: row.position == null ? undefined : Number(row.position),
  } as NormalizedOffer;
}

const FALLBACK_LIST: OfferWithMeta[] = offersNormalized
  .filter((offer) => offer.enabled !== false)
  .map((offer) => ({
    ...offer,
    license: normalizeLicense(offer.license),
    clicks: 0,
  }));

export async function fetchOffers(): Promise<OfferWithMeta[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("offers")
      .select("slug,name,rating,license,payout,payout_hours,methods,link,enabled,position")
      .eq("enabled", true)
      .order("position", { ascending: true, nullsFirst: true })
      .order("name", { ascending: true });

    if (error || !data?.length) {
      return FALLBACK_LIST;
    }

    const list = (data as DbOffer[]).map(mapRow);
    const slugs = list.map((offer) => offer.slug);

    let clickCounts = new Map<string, number>();
    if (slugs.length) {
      try {
        const { data: rows, error: clicksError } = await supabase
          .from("offer_clicks")
          .select("slug")
          .in("slug", slugs);
        if (!clicksError) {
          const tmp = new Map<string, number>();
          for (const r of (rows as any[] | null | undefined) ?? []) {
            const s = String((r as any)?.slug || "");
            if (!s) continue;
            tmp.set(s, (tmp.get(s) || 0) + 1);
          }
          clickCounts = tmp;
        }
      } catch {
        /* ignore */
      }
    }

    // pinned flags via RPC (best-effort)
    let pinnedSlugs: string[] = [];
    const pinnedPlan = new Map<string, string>();
    try {
      const meta = await supabase.rpc("pinned_offer_meta");
      if (!meta.error && Array.isArray(meta.data) && meta.data.length) {
        for (const row of meta.data as any[]) {
          const slug = String(row?.offer_slug ?? row?.slug ?? "").trim();
          if (!slug) continue;
          pinnedSlugs.push(slug);
          if (row?.plan) pinnedPlan.set(slug, String(row.plan));
        }
      } else {
        const sl = await supabase.rpc("pinned_offer_slugs");
        if (!sl.error && Array.isArray(sl.data)) {
          pinnedSlugs = sl.data.map((x: any) => String(x));
        }
      }
    } catch (error) {
      console.warn("[offers/data] failed to fetch pinned slugs", error);
    }

    const pinnedSet = new Set(pinnedSlugs.map((s) => s.trim()));

    const withMeta: OfferWithMeta[] = list.map((offer) => ({
      ...offer,
      clicks: clickCounts.get(offer.slug) ?? 0,
      pinned: pinnedSet.has(offer.slug) || undefined,
      pinnedPlan: pinnedPlan.get(offer.slug),
    }));

    if (pinnedSet.size) {
      withMeta.sort((a, b) => {
        const pd = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
        if (pd !== 0) return pd;
        const pa = a.position ?? Number.MAX_SAFE_INTEGER;
        const pb = b.position ?? Number.MAX_SAFE_INTEGER;
        return pa - pb;
      });
    }

    return withMeta;
  } catch {
    return FALLBACK_LIST;
  }
}

export async function fetchOfferBySlug(slug: string): Promise<OfferWithMeta | null> {
  const offers = await fetchOffers();
  return offers.find((offer) => offer.slug === slug) ?? null;
}
