import { json } from "@/app/api/orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { createAuthenticatedClient } from "@/utils/supabase/authenticated";

type SiteSettingPayload = {
  key?: unknown;
  locale?: unknown;
  value?: unknown;
  value_json?: unknown;
  valueMode?: unknown;
  isPublic?: unknown;
};

function normalizeLocale(input: unknown): string {
  if (typeof input !== "string") return "en";
  const trimmed = input.trim();
  return trimmed || "en";
}

function parseValue(payload: SiteSettingPayload): unknown {
  if (payload.value_json !== undefined) {
    return payload.value_json;
  }

  const mode = typeof payload.valueMode === "string" ? payload.valueMode : undefined;
  const raw = payload.value;

  if (typeof raw === "string") {
    if (mode === "text") {
      return raw;
    }
    try {
      return JSON.parse(raw);
    } catch (error) {
      if (mode === "json") {
        throw new Error("value_parse_error");
      }
      return raw;
    }
  }

  return raw ?? null;
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;
  if (!auth.accessToken) {
    return json({ ok: false, error: "missing_access_token" }, 401);
  }

  let payload: SiteSettingPayload;
  try {
    payload = (await request.json()) as SiteSettingPayload;
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const key = typeof payload.key === "string" ? payload.key.trim() : "";
  if (!key) {
    return json({ ok: false, error: "key_required" }, 400);
  }

  const locale = normalizeLocale(payload.locale);
  let valueJson: unknown;
  try {
    valueJson = parseValue(payload);
  } catch (error: any) {
    if (error?.message === "value_parse_error") {
      return json({ ok: false, error: "value_parse_error" }, 400);
    }
    return json({ ok: false, error: "value_invalid" }, 400);
  }

  const isPublic =
    payload.isPublic === undefined ? true : Boolean(payload.isPublic);

  const supabase = createAuthenticatedClient(auth.accessToken, "cms-site-settings");

  const { error } = await supabase.rpc("cms_upsert_setting", {
    p_key: key,
    p_locale: locale,
    p_value: valueJson as any,
    p_is_public: isPublic,
  });

  if (error) {
    return json(
      {
        ok: false,
        error: "upsert_failed",
        message: error.message,
      },
      500,
    );
  }

  return json({ ok: true });
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  let payload: SiteSettingPayload;
  try {
    payload = (await request.json()) as SiteSettingPayload;
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const key = typeof payload.key === "string" ? payload.key.trim() : "";
  if (!key) {
    return json({ ok: false, error: "key_required" }, 400);
  }

  const locale = normalizeLocale(payload.locale);

  const supabase = createAuthenticatedClient(auth.accessToken, "cms-site-settings");

  const { data, error } = await supabase
    .from("site_settings")
    .delete()
    .eq("key", key)
    .eq("locale", locale)
    .select()
    .maybeSingle();

  if (error) {
    return json(
      { ok: false, error: "delete_failed", message: error.message },
      500,
    );
  }

  if (!data) {
    return json({ ok: false, error: "not_found" }, 404);
  }

  try {
    await supabase.rpc("cms_enqueue_publish", {
      p_target: "tag:content",
      p_action: "revalidate",
      p_payload: {
        type: "site_setting",
        key,
        locale,
      },
    });
  } catch (publishError) {
    console.warn("[cms][site-settings] enqueue publish failed", publishError);
  }

  return json({ ok: true, deleted: true });
}
