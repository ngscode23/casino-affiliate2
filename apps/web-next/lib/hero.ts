import { createClient } from "@/utils/supabase/server";
import { safeQuery } from "./db/safeQuery";

export type HeroPayload = {
  id: string;
  title: string;
  eyebrow: string | null;
  body: string | null;
  primaryCta?: { label: string; href: string } | null;
  secondaryCta?: { label: string; href: string } | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  theme?: string | null;
  trackingId?: string | null;
};

export const HERO_TAG = "hero";

type FetchOptions = {
  locale?: string | null;
  country?: string | null;
  currency?: string | null;
  now?: string; // ISO for testing
};

function mapRowToHero(row: any): HeroPayload {
  return {
    id: row.id,
    title: row.title,
    eyebrow: row.eyebrow,
    body: row.body,
    primaryCta:
      row.primary_cta_label && row.primary_cta_href
        ? { label: row.primary_cta_label, href: row.primary_cta_href }
        : null,
    secondaryCta:
      row.secondary_cta_label && row.secondary_cta_href
        ? { label: row.secondary_cta_label, href: row.secondary_cta_href }
        : null,
    imageUrl: row.image_url,
    imageAlt: row.image_alt,
    theme: row.theme,
    trackingId: row.tracking_id,
  };
}

export async function getActiveHeroes(options: FetchOptions = {}, limit = 5): Promise<HeroPayload[]> {
  const nowIso = options.now ?? new Date().toISOString();
  const supabase = await createClient();

  const orEnd = `end_at.is.null,end_at.gte.${nowIso}`;
  const orStart = `start_at.is.null,start_at.lte.${nowIso}`;

  const { data, error } = await safeQuery<HeroPayload[]>(
    supabase
      .from("hero_campaigns")
      .select(
        `
        id, title, eyebrow, body,
        primary_cta_label, primary_cta_href,
        secondary_cta_label, secondary_cta_href,
        image_url, image_alt, theme, tracking_id
      `,
      )
      .eq("published", true)
      .or(orStart)
      .or(orEnd)
      .order("priority", { ascending: false })
      .order("start_at", { ascending: false })
      .limit(limit) as unknown as Promise<{ data: HeroPayload[]; error: any }>,
  );

  if (error) {
    console.error("[hero] fetch failed", error);
    return [];
  }

  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }

  return data.map((row) => mapRowToHero(row));
}

export async function getActiveHero(options: FetchOptions = {}): Promise<HeroPayload | null> {
  const heroes = await getActiveHeroes(options, 1);
  return heroes[0] ?? null;
}
