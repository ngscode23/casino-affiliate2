"use server";

import { cache } from "react";
import { HAS_SUPABASE } from "@shared/config";
import { getAdminClient } from "@/utils/supabase/admin";
import { safeQuery } from "./db/safeQuery";

export type BannerRecord = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  href: string;
  priority: number;
  activeFrom: string | null;
  activeTo: string | null;
};

const BLOCKED_REMOTE_IMAGE_HOSTS = new Set(["cdn.example.com"]);

const FALLBACK_BANNERS: BannerRecord[] = [
  {
    id: "demo-1",
    title: "Launch your next campaign in minutes",
    subtitle: "Preview the slider with placeholder content while banners are being added.",
    imageUrl: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1600&q=80",
    href: "/products",
    priority: 10,
    activeFrom: null,
    activeTo: null,
  },
];

type RawBannerRow = {
  id: string | number;
  title: string | null;
  subtitle: string | null;
  image_url: string | null;
  href: string | null;
  priority: number | null;
  active_from: string | null;
  active_to: string | null;
  is_active: boolean | null;
};

function normalizeBanner(row: RawBannerRow): BannerRecord | null {
  const id = String(row.id ?? "").trim();
  const title = String(row.title ?? "").trim();
  const imageUrlRaw = String(row.image_url ?? "").trim();
  const href = String(row.href ?? "").trim();

  if (!id || !title || !imageUrlRaw || !href) {
    return null;
  }

  const imageUrl = sanitizeImageUrl(imageUrlRaw);
  if (!imageUrl) {
    return null;
  }

  const priority = Number.isFinite(row.priority) ? Number(row.priority) : 0;

  return {
    id,
    title,
    subtitle: row.subtitle ? String(row.subtitle) : null,
    imageUrl,
    href,
    priority,
    activeFrom: row.active_from,
    activeTo: row.active_to,
  };
}

function sanitizeImageUrl(value: string): string | null {
  if (!value) return null;
  if (/^https?:/i.test(value)) {
    try {
      const parsed = new URL(value);
      if (BLOCKED_REMOTE_IMAGE_HOSTS.has(parsed.hostname) || parsed.hostname.endsWith(".example.com")) {
        return null;
      }
      return value;
    } catch {
      return null;
    }
  }
  return value;
}

export const getActiveBanners = cache(async (): Promise<BannerRecord[]> => {
  if (!HAS_SUPABASE) {
    return sortBanners(FALLBACK_BANNERS);
  }

  const nowIso = new Date().toISOString();
  try {
    const supabase = getAdminClient();
    const { data, error } = await safeQuery(
      supabase
        .from("banners")
        .select("id, title, subtitle, image_url, href, priority, active_from, active_to, is_active")
        .eq("is_active", true)
        .or(`active_from.is.null,active_from.lte.${nowIso}`)
        .or(`active_to.is.null,active_to.gte.${nowIso}`)
        .order("priority", { ascending: false })
        .order("id", { ascending: false }) as unknown as Promise<{ data: RawBannerRow[] | null; error: any }>,
    );

    if (error) {
      console.warn("[banners] Failed to fetch from Supabase:", error);
      return sortBanners(FALLBACK_BANNERS);
    }

    if (!Array.isArray(data)) {
      return sortBanners(FALLBACK_BANNERS);
    }

    const filtered = data
      .map(normalizeBanner)
      .filter((banner): banner is BannerRecord => Boolean(banner));

    return filtered.length ? sortBanners(filtered) : sortBanners(FALLBACK_BANNERS);
  } catch (error) {
    console.warn("[banners] Unexpected error:", error);
    return sortBanners(FALLBACK_BANNERS);
  }
});

function sortBanners(list: BannerRecord[]): BannerRecord[] {
  return [...list].sort((a, b) => {
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }
    return b.id.localeCompare(a.id);
  });
}
