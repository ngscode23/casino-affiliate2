import type { Json } from "@shared/lib/database.types";

import { json } from "@/app/api/orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { createAuthenticatedClient } from "@/utils/supabase/authenticated";

type TranslationPayload = {
  id?: unknown;
  locale?: unknown;
  tkey?: unknown;
  namespace?: unknown;
  value?: unknown;
  value_text?: unknown;
  value_json?: unknown;
  valueMode?: unknown;
};

function normalizeString(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function parseValue(payload: TranslationPayload): {
  valueJson: Json | null;
  valueText: string | null;
} {
  if (payload.value_json !== undefined) {
    return { valueJson: payload.value_json as Json, valueText: null };
  }

  if (payload.value_text !== undefined) {
    return { valueJson: null, valueText: String(payload.value_text ?? "") };
  }

  const raw = payload.value;
  const mode =
    typeof payload.valueMode === "string" ? payload.valueMode.toLowerCase() : undefined;

  if (typeof raw === "string") {
    if (mode === "json") {
      try {
        return { valueJson: JSON.parse(raw), valueText: null };
      } catch {
        throw new Error("value_parse_error");
      }
    }
    if (mode === "text") {
      return { valueJson: null, valueText: raw };
    }
    // auto-detect: try JSON, fall back to text
    try {
      return { valueJson: JSON.parse(raw) as Json, valueText: null };
    } catch {
      return { valueJson: null, valueText: raw };
    }
  }

  if (raw === null || raw === undefined) {
    return { valueJson: null, valueText: null };
  }

  return { valueJson: raw as Json, valueText: null };
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;
  if (!auth.accessToken) {
    return json({ ok: false, error: "missing_access_token" }, 401);
  }

  let payload: TranslationPayload;
  try {
    payload = (await request.json()) as TranslationPayload;
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const locale = normalizeString(payload.locale) || "en";
  const tkey = normalizeString(payload.tkey);
  if (!tkey) {
    return json({ ok: false, error: "tkey_required" }, 400);
  }

  const namespace = normalizeString(payload.namespace) || undefined;

  let valueJson: Json | null;
  let valueText: string | null;
  try {
    const parsed = parseValue(payload);
    valueJson = parsed.valueJson;
    valueText = parsed.valueText;
  } catch (error: any) {
    if (error?.message === "value_parse_error") {
      return json({ ok: false, error: "value_parse_error" }, 400);
    }
    return json({ ok: false, error: "value_invalid" }, 400);
  }

  const supabase = createAuthenticatedClient(auth.accessToken, "cms-translations");

  const { data: upsertResult, error: rpcError } = await supabase.rpc("cms_upsert_translation", {
    p_locale: locale,
    p_tkey: tkey,
    p_namespace: namespace,
    p_value_json: valueJson ?? undefined,
    p_value_text: valueText ?? undefined,
  });

  if (rpcError) {
    return json(
      { ok: false, error: "upsert_failed", message: rpcError.message },
      500,
    );
  }

  let item = null;
  if (upsertResult) {
    const { data, error } = await supabase
      .from("translations")
      .select("*")
      .eq("id", upsertResult)
      .maybeSingle();
    if (!error && data) {
      item = data;
    }
  }

  try {
    await supabase.rpc("cms_enqueue_publish", {
      p_target: "tag:content",
      p_action: "revalidate",
      p_payload: {
        type: "translation",
        locale,
        key: tkey,
        namespace: namespace ?? null,
      },
    });
  } catch (publishError) {
    console.warn("[cms][translations] enqueue publish failed", publishError);
  }

  return json({ ok: true, item });
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;
  if (!auth.accessToken) {
    return json({ ok: false, error: "missing_access_token" }, 401);
  }

  let payload: TranslationPayload;
  try {
    payload = (await request.json()) as TranslationPayload;
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const id = normalizeString(payload.id);
  const locale = normalizeString(payload.locale);
  const tkey = normalizeString(payload.tkey);
  const namespace = normalizeString(payload.namespace) || undefined;

  if (!id && (!locale || !tkey)) {
    return json(
      { ok: false, error: "id_or_locale_key_required" },
      400,
    );
  }

  const supabase = createAuthenticatedClient(auth.accessToken, "cms-translations");
  const deleteBuilder = supabase.from("translations").delete().select();

  const filtered = id
    ? deleteBuilder.eq("id", id).maybeSingle()
    : deleteBuilder
        .eq("locale", locale)
        .eq("tkey", tkey)
        .eq("ns_norm", namespace || "")
        .maybeSingle();

  const { data, error } = await filtered;

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
        type: "translation",
        locale: data.locale ?? null,
        key: data.tkey ?? null,
        namespace: data.namespace ?? null,
      },
    });
  } catch (publishError) {
    console.warn("[cms][translations] enqueue publish failed", publishError);
  }

  return json({ ok: true, deleted: true });
}
