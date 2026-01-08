import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getAdminClient } from "@/utils/supabase/admin";

const EXPERIMENT_COOKIE = process.env.EXPERIMENT_COOKIE_NAME || "exp";
const SECURE_COOKIE = process.env.NODE_ENV !== "development";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

async function resolveProfileContext() {
  const headerStore = new Headers(await headers());
  const getCookie = (name: string): string | null => {
    const cookieHeader = headerStore.get("cookie") || "";
    const match = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
    return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
  };
  const anonId = getCookie("anon_id") || headerStore.get("x-anon-id") || null;
  const experimentVariant = getCookie(EXPERIMENT_COOKIE) || null;
  return { anonId, experimentVariant };
}

export async function DELETE() {
  const { anonId } = await resolveProfileContext();

  if (!anonId) {
    return NextResponse.json({ ok: false, error: "anon_id cookie is missing" }, { status: 400 });
  }

  const admin = getAdminClient();
  const nowIso = new Date().toISOString();

  const profilePayload = {
    anon_id: anonId,
    opt_out: true,
    cold_start: false,
    last_seen: nowIso,
    updated_at: nowIso,
    experiment_variant: "control",
  };

  const { error: profileError } = await admin
    .from("user_profiles")
    .upsert(profilePayload, { onConflict: "anon_id" });

  if (profileError) {
    return NextResponse.json({ ok: false, error: profileError.message }, { status: 500 });
  }

  // Best-effort event purge for this anon_id
  const { error: deleteError } = await admin.from("user_events").delete().eq("anon_id", anonId);
  if (deleteError) {
    // Keep status 200; surface warning for observability
    console.warn?.("[profile:opt-out] purge failed", { message: deleteError.message });
  }

  const response = NextResponse.json(
    { ok: true, opt_out: true },
    { headers: { "Cache-Control": "no-store" } },
  );

  response.cookies.set(EXPERIMENT_COOKIE, "control", {
    httpOnly: true,
    sameSite: "lax",
    secure: SECURE_COOKIE,
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });

  return response;
}

export async function POST() {
  const { anonId, experimentVariant } = await resolveProfileContext();

  if (!anonId) {
    return NextResponse.json({ ok: false, error: "anon_id cookie is missing" }, { status: 400 });
  }

  const admin = getAdminClient();
  const nowIso = new Date().toISOString();

  const profilePayload = {
    anon_id: anonId,
    opt_out: false,
    cold_start: false,
    last_seen: nowIso,
    updated_at: nowIso,
    experiment_variant: experimentVariant ?? null,
  };

  const { error: profileError } = await admin
    .from("user_profiles")
    .upsert(profilePayload, { onConflict: "anon_id" });

  if (profileError) {
    return NextResponse.json({ ok: false, error: profileError.message }, { status: 500 });
  }

  return NextResponse.json(
    { ok: true, opt_out: false },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET() {
  const { anonId } = await resolveProfileContext();

  if (!anonId) {
    return NextResponse.json(
      { ok: false, error: "anon_id cookie is missing" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("user_profiles")
    .select("opt_out, experiment_variant")
    .eq("anon_id", anonId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      opt_out: Boolean(data?.opt_out),
      experiment_variant: data?.experiment_variant ?? null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
