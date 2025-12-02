import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getAdminClient } from "@/utils/supabase/admin";

type IncomingEvent = {
  event?: unknown;
  product_id?: unknown;
  category?: unknown;
  price_bucket?: unknown;
  device?: unknown;
  country?: unknown;
  referrer?: unknown;
  ts?: unknown;
};

const CANONICAL_EVENTS = [
  "view",
  "search",
  "click",
  "impression",
  "add_to_cart",
  "purchase",
] as const;

type AllowedEvent = (typeof CANONICAL_EVENTS)[number];

const PRODUCT_REQUIRED_EVENTS = new Set<AllowedEvent>(["view", "click", "add_to_cart", "purchase"]);

const STATIC_EVENT_ALIASES: Record<string, AllowedEvent> = {
  product_impression: "impression",
  product_click: "click",
  product_click_discount: "click",
  product_view: "view",
};

type NormalizedEvent = {
  anon_id: string;
  event: AllowedEvent;
  product_id: string | null;
  category: string | null;
  price_bucket: string | null;
  device: string | null;
  country: string | null;
  referrer: string | null;
  experiment_variant: string | null;
  metadata: Record<string, unknown> | null;
  ts: string;
};

const EXPERIMENT_COOKIE = process.env.EXPERIMENT_COOKIE_NAME || "exp";
const MAX_EVENTS_PER_REQUEST = 50;

function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
}

function normalizeText(value: unknown, max = 80): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function normalizeTimestamp(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  if (typeof value === "string") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return new Date().toISOString();
}

function resolveEventName(value: unknown): { canonical: AllowedEvent; rawAlias: string | null } | null {
  const trimmed = normalizeText(value, 64);
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();

  if (CANONICAL_EVENTS.includes(lower as AllowedEvent)) {
    const canonical = lower as AllowedEvent;
    return { canonical, rawAlias: trimmed === canonical ? null : trimmed };
  }

  const alias = STATIC_EVENT_ALIASES[lower] ?? resolveProductEventAlias(lower);
  if (alias) {
    return { canonical: alias, rawAlias: trimmed };
  }

  return null;
}

function resolveProductEventAlias(value: string): AllowedEvent | null {
  if (!value.startsWith("product_")) return null;
  if (value.includes("impression")) return "impression";
  if (value.includes("click")) return "click";
  if (value.includes("view")) return "view";
  return null;
}

function normalizeEvent(
  raw: IncomingEvent,
  context: {
    anonId: string;
    defaultCountry: string | null;
    defaultDevice: string | null;
    defaultReferrer: string | null;
    experimentVariant: string | null;
  },
): NormalizedEvent | null {
  const resolvedEvent = resolveEventName(raw.event);
  if (!resolvedEvent) return null;

  const productId = isUuid(raw.product_id) ? raw.product_id : null;
  if (PRODUCT_REQUIRED_EVENTS.has(resolvedEvent.canonical) && !productId) {
    return null;
  }
  const category = normalizeText(raw.category, 64);
  const priceBucket = normalizeText(raw.price_bucket, 32);
  const device = normalizeText(raw.device, 24) ?? context.defaultDevice;
  const country = normalizeText(raw.country, 8)?.toLowerCase() ?? context.defaultCountry;
  const referrer = normalizeText(raw.referrer, 256) ?? context.defaultReferrer;
  const ts = normalizeTimestamp(raw.ts);
  const metadata = resolvedEvent.rawAlias ? { raw_event: resolvedEvent.rawAlias } : null;

  return {
    anon_id: context.anonId,
    event: resolvedEvent.canonical,
    product_id: productId,
    category,
    price_bucket: priceBucket,
    device: device ?? null,
    country: country ?? null,
    referrer: referrer ?? null,
    experiment_variant: context.experimentVariant,
    metadata,
    ts,
  };
}

function parseBody(body: unknown): IncomingEvent[] {
  if (Array.isArray(body)) return body as IncomingEvent[];
  if (body && typeof body === "object") {
    if (Array.isArray((body as { events?: unknown }).events)) {
      return (body as { events: IncomingEvent[] }).events;
    }
    return [body as IncomingEvent];
  }
  return [];
}

export async function POST(request: Request) {
  const headerStore = new Headers(await headers());
  const getCookie = (name: string): string | null => {
    const cookieHeader = headerStore.get("cookie") || "";
    const match = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
    return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
  };

  const anonId = getCookie("anon_id") ?? headerStore.get("x-anon-id") ?? null;
  if (!isUuid(anonId)) {
    return NextResponse.json({ ok: false, error: "anon_id cookie is required" }, { status: 400 });
  }

  const experimentVariant = getCookie(EXPERIMENT_COOKIE) ?? headerStore.get("x-experiment-variant") ?? null;
  const countryHeader =
    headerStore.get("x-geo-country") ||
    headerStore.get("x-country") ||
    headerStore.get("cf-ipcountry") ||
    null;
  const deviceHeader = headerStore.get("x-device-class") || null;
  const referrerHeader = headerStore.get("referer") || headerStore.get("referrer") || null;

  const body = await request.json().catch(() => null);
  const parsedEvents = parseBody(body).slice(0, MAX_EVENTS_PER_REQUEST);
  if (!parsedEvents.length) {
    return NextResponse.json({ ok: false, error: "events payload is empty" }, { status: 400 });
  }

  const normalized: NormalizedEvent[] = [];
  for (const raw of parsedEvents) {
    const event = normalizeEvent(raw, {
      anonId,
      defaultCountry: countryHeader ? countryHeader.toLowerCase() : null,
      defaultDevice: deviceHeader,
      defaultReferrer: referrerHeader,
      experimentVariant,
    });
    if (event) normalized.push(event);
  }

  if (!normalized.length) {
    return NextResponse.json({ ok: false, error: "no valid events" }, { status: 400 });
  }

  const admin = getAdminClient();
  const { data: existingProfile, error: profileError } = await admin
    .from("user_profiles")
    .select("opt_out, visit_count")
    .eq("anon_id", anonId)
    .limit(1)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ ok: false, error: profileError.message }, { status: 500 });
  }

  if (existingProfile?.opt_out) {
    return NextResponse.json({ ok: false, opt_out: true }, { status: 403 });
  }

  const { error: insertError } = await admin.from("user_events").insert(normalized);
  if (insertError) {
    return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
  }

  const nowIso = new Date().toISOString();
  const nextVisitCount = (existingProfile?.visit_count ?? 0) + 1;
  const profilePayload: Record<string, unknown> = {
    anon_id: anonId,
    last_seen: nowIso,
    updated_at: nowIso,
    visit_count: nextVisitCount,
    cold_start: false,
    experiment_variant: experimentVariant ?? null,
  };
  if (!existingProfile) {
    profilePayload.first_seen = nowIso;
  }

  const { error: upsertError } = await admin
    .from("user_profiles")
    .upsert(profilePayload, { onConflict: "anon_id" });

  if (upsertError) {
    return NextResponse.json({ ok: false, error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json(
    { ok: true, recorded: normalized.length },
    { status: 202, headers: { "Cache-Control": "no-store" } },
  );
}
