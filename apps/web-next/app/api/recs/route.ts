import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getRecommendationsForActor } from "@/lib/recs-server";
import { resolveViewerIdentity } from "@/utils/auth/viewer";
import { getAdminClient } from "@/utils/supabase/admin";

const ALLOWED_EVENTS = new Set(["view", "click", "impression", "add_to_cart", "purchase", "search"]);
const ANON_COOKIE_NAME = "anon_id";
const ANON_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year
const UUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const TREATMENT_COOKIE = "recs_treatment";
const TREATMENT_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

async function resolveActor() {
  const cookieStore = await cookies();
  const { userId, anonId } = resolveViewerIdentity(cookieStore);
  let actor = userId ?? anonId ?? null;
  let shouldSetAnonCookie = false;

  if (!actor) {
    actor = crypto.randomUUID();
    shouldSetAnonCookie = true;
  } else if (!UUID_PATTERN.test(actor)) {
    // fallback to generated uuid when cookies contain a non-uuid value
    actor = crypto.randomUUID();
    shouldSetAnonCookie = true;
  }

  return { actor, shouldSetAnonCookie };
}

function parseNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export async function POST(request: Request) {
  const supabase = getAdminClient();
  const { actor, shouldSetAnonCookie } = await resolveActor();

  const payload = (await request.json().catch(() => null)) as any;
  const eventRaw = typeof payload?.event === "string" ? payload.event.toLowerCase().trim() : "";
  if (!ALLOWED_EVENTS.has(eventRaw)) {
    return NextResponse.json({ ok: false, error: "invalid_event" }, { status: 400 });
  }

  const productId = normalizeText(payload?.productId);
  const category = normalizeText(payload?.category);
  const priceCents = parseNumber(payload?.priceCents);
  const weightParsed = parseNumber(payload?.weight);
  const weight = weightParsed != null && weightParsed > 0 ? weightParsed : 1;
  const metadata = payload?.metadata && typeof payload.metadata === "object" ? payload.metadata : null;

  const { error } = await supabase.from("user_events").insert({
    anon_id: actor,
    event: eventRaw,
    product_id: productId,
    category,
    price_cents: priceCents != null ? Math.round(priceCents) : null,
    weight,
    metadata,
  });

  const response = NextResponse.json({ ok: !error, error: error?.message });
  if (shouldSetAnonCookie) {
    response.cookies.set({
      name: ANON_COOKIE_NAME,
      value: actor,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      maxAge: ANON_COOKIE_MAX_AGE,
    });
  }
  return response;
}

export async function GET(request: Request) {
  const { actor, shouldSetAnonCookie } = await resolveActor();
  const url = new URL(request.url);
  const limitParam = Number.parseInt(url.searchParams.get("limit") ?? "", 10);
  const p_limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 12;
  const category = normalizeText(url.searchParams.get("category"));
  const query = normalizeText(url.searchParams.get("q") ?? url.searchParams.get("query"));

  const { items, treatment, error } = await getRecommendationsForActor({
    actor,
    limit: p_limit,
    category: category ?? undefined,
    query: query ?? undefined,
  });

  const response = NextResponse.json({
    ok: true,
    actor,
    treatment,
    recommendations: items,
    error: error ?? null,
  });

  if (shouldSetAnonCookie) {
    response.cookies.set({
      name: ANON_COOKIE_NAME,
      value: actor,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      maxAge: ANON_COOKIE_MAX_AGE,
    });
  }

  response.cookies.set({
    name: TREATMENT_COOKIE,
    value: treatment,
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    secure: true,
    maxAge: TREATMENT_COOKIE_MAX_AGE,
  });

  return response;
}
