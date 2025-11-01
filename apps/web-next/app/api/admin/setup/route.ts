import { NextResponse } from "next/server";

import { normalizeSetupSettings } from "@/lib/admin/setup-shared";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

const TABLE = "app_settings";
const KEY = "setup.v1";
const HEADERS = { "cache-control": "no-store, max-age=0, must-revalidate" };

function fail(message: string, status = 500) {
  return NextResponse.json(
    { ok: false, message },
    {
      status,
      headers: HEADERS,
    },
  );
}

function succeed(payload: Record<string, unknown>) {
  return NextResponse.json(
    { ok: true, ...payload },
    {
      headers: HEADERS,
    },
  );
}

function safeParse<T>(value: string | null | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from(TABLE)
      .select("value, updated_at")
      .eq("key", KEY)
      .maybeSingle();

    if (error) {
      return fail(error.message);
    }

    const raw = safeParse<Record<string, unknown>>(data?.value ?? null);
    const settings = normalizeSetupSettings(raw ?? undefined);
    const updatedAt = data?.updated_at ?? null;

    return succeed({ settings, updatedAt });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return fail(message);
  }
}

export async function PUT(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON payload";
    return fail(message, 400);
  }

  const rawSettings =
    payload && typeof payload === "object" && "settings" in payload
      ? (payload as Record<string, unknown>).settings
      : payload;

  const settings = normalizeSetupSettings(rawSettings ?? undefined);

  try {
    const supabase = getAdminClient();
    const encoded = JSON.stringify(settings);

    const { data, error } = await supabase
      .from(TABLE)
      .upsert(
        {
          key: KEY,
          value: encoded,
        },
        { onConflict: "key" },
      )
      .select("value, updated_at")
      .single();

    if (error) {
      return fail(error.message);
    }

    const stored = safeParse<Record<string, unknown>>(data?.value ?? null) ?? settings;
    const normalized = normalizeSetupSettings(stored);
    const updatedAt = data?.updated_at ?? new Date().toISOString();

    return succeed({ settings: normalized, updatedAt });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return fail(message);
  }
}
