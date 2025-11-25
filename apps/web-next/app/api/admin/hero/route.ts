import { revalidate as revalidateTag } from "@/lib/cache";
import { HERO_TAG } from "@/lib/hero";
import { json } from "@/app/api/orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

type HeroPayload = {
  id?: string;
  title?: string;
  eyebrow?: string | null;
  body?: string | null;
  primary_cta_label?: string | null;
  primary_cta_href?: string | null;
  secondary_cta_label?: string | null;
  secondary_cta_href?: string | null;
  image_url?: string | null;
  image_alt?: string | null;
  theme?: string | null;
  priority?: number | null;
  start_at?: string | null;
  end_at?: string | null;
  segment_locale?: string | null;
  segment_country?: string | null;
  segment_currency?: string | null;
  variant?: string | null;
  tracking_id?: string | null;
  published?: boolean | null;
};

function normalizeString(input: unknown): string {
  return typeof input === "string" ? input.trim() : "";
}

function normalizeNullableString(input: unknown): string | null {
  if (input == null) return null;
  const value = normalizeString(input);
  return value || null;
}

function normalizeBoolean(input: unknown, fallback = false): boolean {
  if (typeof input === "boolean") return input;
  if (typeof input === "string") {
    const v = input.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(v)) return true;
    if (["0", "false", "no", "off"].includes(v)) return false;
  }
  if (typeof input === "number") return input !== 0;
  return fallback;
}

function normalizeNumber(input: unknown, fallback = 0): number {
  if (typeof input === "number" && Number.isFinite(input)) return Math.round(input);
  const parsed = Number(input);
  return Number.isFinite(parsed) ? Math.round(parsed) : fallback;
}

function normalizeDateString(input: unknown): string | null {
  if (input == null) return null;
  if (typeof input === "string" && input.trim()) {
    const date = new Date(input);
    return Number.isFinite(date.valueOf()) ? date.toISOString() : null;
  }
  return null;
}

async function revalidateHeroTag() {
  try {
    await revalidateTag(HERO_TAG);
  } catch (error) {
    console.warn("[hero][revalidate] failed", error);
  }
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const url = new URL(request.url);
  const includeInactive = normalizeBoolean(url.searchParams.get("include_inactive"), true);
  const limitParam = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(Math.floor(limitParam), 1), 200) : 200;

  const supabase = getAdminClient();
  let query = supabase
    .from("hero_campaigns")
    .select("*")
    .order("priority", { ascending: false })
    .order("start_at", { ascending: false })
    .limit(limit);

  if (!includeInactive) {
    const nowIso = new Date().toISOString();
    query = query
      .eq("published", true)
      .lte("start_at", nowIso)
      .or(`end_at.is.null,end_at.gte.${nowIso}`);
  }

  const { data, error } = await query;
  if (error) {
    return json({ ok: false, error: "fetch_failed", message: error.message }, 500);
  }
  return json({ ok: true, items: data ?? [] }, 200);
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  let payload: HeroPayload;
  try {
    payload = (await request.json()) as HeroPayload;
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const title = normalizeString(payload.title);
  if (!title) {
    return json({ ok: false, error: "title_required" }, 400);
  }

  const record = {
    title,
    eyebrow: normalizeNullableString(payload.eyebrow),
    body: normalizeNullableString(payload.body),
    primary_cta_label: normalizeNullableString(payload.primary_cta_label),
    primary_cta_href: normalizeNullableString(payload.primary_cta_href),
    secondary_cta_label: normalizeNullableString(payload.secondary_cta_label),
    secondary_cta_href: normalizeNullableString(payload.secondary_cta_href),
    image_url: normalizeNullableString(payload.image_url),
    image_alt: normalizeNullableString(payload.image_alt),
    theme: normalizeNullableString(payload.theme) ?? "dark",
    priority: normalizeNumber(payload.priority, 0),
    start_at: normalizeDateString(payload.start_at),
    end_at: normalizeDateString(payload.end_at),
    segment_locale: normalizeNullableString(payload.segment_locale),
    segment_country: normalizeNullableString(payload.segment_country),
    segment_currency: normalizeNullableString(payload.segment_currency),
    variant: normalizeNullableString(payload.variant) ?? "A",
    tracking_id: normalizeNullableString(payload.tracking_id),
    published: normalizeBoolean(payload.published, false),
  };

  const supabase = getAdminClient();
  const id = normalizeString(payload.id) || undefined;
  const query = id
    ? supabase.from("hero_campaigns").update(record).eq("id", id).select("*").maybeSingle()
    : supabase.from("hero_campaigns").insert(record).select("*").maybeSingle();

  const { data, error } = await query;

  if (error) {
    return json({ ok: false, error: "save_failed", message: error.message }, 500);
  }
  if (!data) {
    return json({ ok: false, error: "not_found" }, 404);
  }

  await revalidateHeroTag();
  return json({ ok: true, item: data }, 200);
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  let payload: HeroPayload;
  try {
    payload = (await request.json()) as HeroPayload;
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const id = normalizeString(payload.id);
  if (!id) {
    return json({ ok: false, error: "id_required" }, 400);
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase.from("hero_campaigns").delete().eq("id", id).select("*").maybeSingle();
  if (error) {
    return json({ ok: false, error: "delete_failed", message: error.message }, 500);
  }
  if (!data) {
    return json({ ok: false, error: "not_found" }, 404);
  }

  await revalidateHeroTag();
  return json({ ok: true, deleted: true }, 200);
}
