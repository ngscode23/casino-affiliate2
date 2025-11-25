import { createClient } from "@/utils/supabase/server";

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

export async function getActiveHero(options: FetchOptions = {}): Promise<HeroPayload | null> {
  const nowIso = options.now ?? new Date().toISOString();
  const supabase = await createClient();

  const orEnd = `end_at.is.null,end_at.gte.${nowIso}`;
  const orStart = `start_at.is.null,start_at.lte.${nowIso}`;

  const { data, error } = await supabase
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
    .limit(1);

  if (error) {
    console.error("[hero] fetch failed", error?.message ?? error);
    return null;
  }

  const row = data?.[0];
  if (!row) return null;

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
