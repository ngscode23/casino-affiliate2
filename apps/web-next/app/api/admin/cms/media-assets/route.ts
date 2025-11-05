import { randomUUID } from "crypto";

import { json } from "@/app/api/orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

const DEFAULT_BUCKET = "public-media";

type MediaAssetPayload = {
  id?: unknown;
  bucket?: unknown;
  storage_key?: unknown;
  storageKey?: unknown;
  mime_type?: unknown;
  mimeType?: unknown;
  width?: unknown;
  height?: unknown;
  size_bytes?: unknown;
  sizeBytes?: unknown;
  alt?: unknown;
  description?: unknown;
  remove_object?: unknown;
  removeObject?: unknown;
};

function normalizeString(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return fallback;
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
    return fallback;
  }
  if (typeof value === "number") {
    if (Number.isNaN(value)) return fallback;
    return value !== 0;
  }
  if (value === null || value === undefined) return fallback;
  return fallback;
}

function toInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return Math.round(parsed);
  }
  return null;
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const url = new URL(request.url);
  const search = url.searchParams.get("search");
  const limitParam = url.searchParams.get("limit");
  const pageParam = url.searchParams.get("page");

  let limit = Number(limitParam ?? 50);
  if (!Number.isFinite(limit) || limit <= 0) limit = 50;
  limit = Math.min(limit, 200);
  const page = Math.max(Number(pageParam ?? 0) || 0, 0);
  const from = page * limit;
  const to = from + limit - 1;

  const supabase = getAdminClient();
  let query = supabase
    .from("media_assets")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (search) {
    const term = `%${search.trim()}%`;
    query = query.or(
      [
        `storage_key.ilike.${term}`,
        `alt.ilike.${term}`,
        `description.ilike.${term}`,
      ].join(","),
    );
  }

  const { data, error, count } = await query;

  if (error) {
    return json(
      { ok: false, error: "list_failed", message: error.message },
      500,
    );
  }

  return json({
    ok: true,
    items: data ?? [],
    total: count ?? null,
    page,
    limit,
  });
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  let payload: MediaAssetPayload;
  try {
    payload = (await request.json()) as MediaAssetPayload;
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const bucket = normalizeString(payload.bucket) || DEFAULT_BUCKET;
  const storageKey =
    normalizeString(payload.storage_key) || normalizeString(payload.storageKey);

  if (!storageKey) {
    return json({ ok: false, error: "storage_key_required" }, 400);
  }

  const id =
    typeof payload.id === "string" && payload.id.trim()
      ? payload.id.trim()
      : randomUUID();

  const mimeType =
    normalizeString(payload.mime_type) || normalizeString(payload.mimeType) || null;
  const width = toInteger(payload.width);
  const height = toInteger(payload.height);
  const sizeBytes = toInteger(payload.size_bytes ?? payload.sizeBytes);
  const alt = normalizeString(payload.alt) || null;
  const description = normalizeString(payload.description) || null;

  const supabase = getAdminClient();

  const record = {
    id,
    bucket,
    storage_key: storageKey,
    mime_type: mimeType,
    width,
    height,
    size_bytes: sizeBytes,
    alt,
    description,
    uploaded_by: auth.user.id ?? null,
  };

  const { data, error } = await supabase
    .from("media_assets")
    .upsert(record, { onConflict: "bucket,storage_key" })
    .select()
    .single();

  if (error) {
    return json(
      { ok: false, error: "upsert_failed", message: error.message },
      500,
    );
  }

  return json({ ok: true, item: data });
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  let payload: MediaAssetPayload;
  try {
    payload = (await request.json()) as MediaAssetPayload;
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const id = normalizeString(payload.id);
  const bucket = normalizeString(payload.bucket) || DEFAULT_BUCKET;
  const storageKey =
    normalizeString(payload.storage_key) || normalizeString(payload.storageKey);

  if (!id && !storageKey) {
    return json(
      { ok: false, error: "id_or_storage_key_required" },
      400,
    );
  }

  const supabase = getAdminClient();

  const deleteBuilder = supabase.from("media_assets").delete().select();
  const filtered =
    id != null && id
      ? deleteBuilder.eq("id", id).maybeSingle()
      : deleteBuilder.eq("bucket", bucket).eq("storage_key", storageKey).maybeSingle();

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

  const removeObject = toBoolean(payload.remove_object ?? payload.removeObject, false);
  if (removeObject) {
    try {
      const storage = supabase.storage.from(bucket);
      await storage.remove([data.storage_key]);
    } catch (removeError) {
      console.warn("[cms][media-assets] storage remove failed", removeError);
    }
  }

  return json({ ok: true, deleted: true });
}
