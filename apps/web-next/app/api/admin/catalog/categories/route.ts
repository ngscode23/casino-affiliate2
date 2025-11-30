import { revalidateTag } from "next/cache";

import { json } from "@/app/api/orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { createAuthenticatedClient } from "@/utils/supabase/authenticated";
import { HEADER_CATEGORIES_TAG } from "@/lib/catalog/categories";

const CATEGORY_FIELDS = "id, slug, title, description, parent_id, sort_order, is_active";

function normalizeString(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.trim();
}

function normalizeSlug(input: unknown, fallbackTitle?: string): string {
  const base = normalizeString(input) || normalizeString(fallbackTitle ?? "");
  if (!base) return "";
  const normalized = base
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s-_]/g, "")
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return normalized || "";
}

function normalizeDescription(input: unknown): string | null {
  if (input == null) return null;
  const value = normalizeString(input);
  return value || null;
}

function normalizeSort(input: unknown): number {
  if (typeof input === "number" && Number.isFinite(input)) return Math.round(input);
  const parsed = Number(input);
  if (!Number.isFinite(parsed)) return 100;
  return Math.round(parsed);
}

function normalizeBoolean(input: unknown, fallback: boolean): boolean {
  if (typeof input === "boolean") return input;
  if (typeof input === "string") {
    const value = input.trim().toLowerCase();
    if (!value) return fallback;
    if (["1", "true", "yes", "on"].includes(value)) return true;
    if (["0", "false", "no", "off"].includes(value)) return false;
    return fallback;
  }
  if (typeof input === "number") return input !== 0;
  return fallback;
}

async function revalidateHeaderCategories() {
  try {
    revalidateTag(HEADER_CATEGORIES_TAG, "default");
  } catch (error) {
    console.warn("[catalog][categories] failed to revalidate header tag", error);
  }
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const url = new URL(request.url);
  const limitParam = Number(url.searchParams.get("limit"));
  const includeInactive = normalizeBoolean(url.searchParams.get("include_inactive"), true);
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(Math.floor(limitParam), 1), 200) : 200;

  // Admin UI uses the public `categories` view exposed via REST.
  const supabase = createAuthenticatedClient(auth.accessToken, "catalog-admin");
  let query = supabase
    .from("categories")
    .select(CATEGORY_FIELDS)
    .is("parent_id", null)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("title", { ascending: true })
    .limit(limit);

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) {
    return json({ ok: false, error: "fetch_failed", message: error.message }, 500);
  }

  return json({ ok: true, items: data ?? [] }, 200);
}

type CategoryPayload = {
  id?: string;
  slug?: string;
  title?: string;
  description?: string | null;
  sort_order?: number;
  is_active?: boolean;
};

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  let payload: CategoryPayload;
  try {
    payload = (await request.json()) as CategoryPayload;
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const title = normalizeString(payload.title);
  if (!title) {
    return json({ ok: false, error: "title_required" }, 400);
  }

  const slug = normalizeSlug(payload.slug, title);
  if (!slug) {
    return json({ ok: false, error: "slug_required" }, 400);
  }

  const description = normalizeDescription(payload.description);
  const sortOrder = normalizeSort(payload.sort_order);
  const isActive = normalizeBoolean(payload.is_active, true);
  const id = normalizeString(payload.id) || undefined;

  const supabase = createAuthenticatedClient(auth.accessToken, "catalog-admin");
  const record = {
    slug,
    title,
    description,
    sort_order: sortOrder,
    is_active: isActive,
    parent_id: null,
  };

  const query = id
    ? supabase.from("categories").update(record).eq("id", id).select(CATEGORY_FIELDS).maybeSingle()
    : supabase.from("categories").insert(record).select(CATEGORY_FIELDS).maybeSingle();

  const { data, error } = await query;

  if (error) {
    const status = error.code === "23505" ? 409 : 500;
    const code = error.code === "23505" ? "duplicate_slug" : "save_failed";
    return json({ ok: false, error: code, message: error.message }, status);
  }

  if (!data) {
    return json({ ok: false, error: "not_found" }, 404);
  }

  await revalidateHeaderCategories();
  return json({ ok: true, item: data }, 200);
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  let payload: CategoryPayload;
  try {
    payload = (await request.json()) as CategoryPayload;
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const id = normalizeString(payload.id);
  if (!id) {
    return json({ ok: false, error: "id_required" }, 400);
  }

  const supabase = createAuthenticatedClient(auth.accessToken, "catalog-admin");
  const { data, error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .select(CATEGORY_FIELDS)
    .maybeSingle();

  if (error) {
    return json({ ok: false, error: "delete_failed", message: error.message }, 500);
  }

  if (!data) {
    return json({ ok: false, error: "not_found" }, 404);
  }

  await revalidateHeaderCategories();
  return json({ ok: true, deleted: true }, 200);
}
