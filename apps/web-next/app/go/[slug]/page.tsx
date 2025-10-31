import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

const ALLOWED_PARAMS = new Set([
  "subid",
  "sub_id",
  "aff_sub",
  "aff_sub2",
  "click_id",
  "cid",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "ref",
]);

function generateClickId(): string {
  try {
    return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  } catch {
    return Date.now().toString();
  }
}

function coerceSearchParams(raw?: Record<string, string | string[] | undefined>) {
  const out: Record<string, string> = {};
  if (!raw) return out;
  for (const [key, value] of Object.entries(raw)) {
    if (!ALLOWED_PARAMS.has(key)) continue;
    if (Array.isArray(value)) {
      const first = value.find(Boolean);
      if (first) out[key] = String(first);
      continue;
    }
    if (typeof value === "string" && value.trim()) {
      out[key] = value.trim();
    }
  }
  return out;
}

function mergeTrackingParams(target: string, extraParams: Record<string, string>) {
  try {
    const url = new URL(target);
    const existing = new URLSearchParams(url.search);
    for (const [key, value] of Object.entries(extraParams)) {
      if (!existing.has(key)) existing.set(key, value);
    }
    url.search = existing.toString();
    return url.toString();
  } catch {
    const sep = target.includes("?") ? "&" : "?";
    const qs = new URLSearchParams(extraParams).toString();
    return `${target}${sep}${qs}`;
  }
}

export default async function GoRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  if (!slug) {
    notFound();
  }

  const offer = await fetchOfferBySlug(slug);
  const target = offer?.link;
  if (!target) {
    notFound();
  }

  const allowed = coerceSearchParams((await searchParams) ?? {});
  if (!allowed.click_id) {
    const clickId = generateClickId();
    allowed.click_id = clickId;
    if (!allowed.subid) allowed.subid = clickId;
  }

  const finalUrl = mergeTrackingParams(target, allowed);

  try {
    const supabase = await createClient();
    const headerStore = await headers();
    await supabase.from("offer_clicks").insert({
      slug,
      click_id: allowed.click_id,
      target_url: target,
      target_url_final: finalUrl,
      target_host: (() => {
        try {
          return new URL(target).host;
        } catch {
          return null;
        }
      })(),
      params: allowed,
      referrer: headerStore.get("referer"),
      user_agent: headerStore.get("user-agent"),
    });
  } catch {
    // Swallow logging errors – user redirect should still proceed.
  }

  redirect(finalUrl);
}

async function fetchOfferBySlug(slug: string) {
  try {
    const supabase = getAdminClient();
    const { data } = await supabase
      .from("offers")
      .select("id, slug, link, enabled")
      .eq("slug", slug)
      .limit(1)
      .maybeSingle();

    const enabled = Boolean(data?.enabled);
    if (!data || !data.link || !enabled) {
      return null;
    }

    return {
      id: data.id ?? null,
      slug: data.slug as string,
      link: data.link as string,
      enabled,
    };
  } catch {
    return null;
  }
}
