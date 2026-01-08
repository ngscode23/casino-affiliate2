import { json } from "@/app/api/orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

const BRAND_FIELDS = "id, slug, name, description, website, created_at, status, is_active";

type BrandPayload = {
  id?: string;
  name?: string;
  slug?: string;
  description?: string | null;
  website?: string | null;
  status?: string | null;
  is_active?: boolean | null;
};

function normalizeString(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.trim();
}

function normalizeDescription(input: unknown): string | null {
  const value = normalizeString(input);
  return value || null;
}

function normalizeSlug(input: unknown, fallback?: string): string {
  const base = normalizeString(input) || normalizeString(fallback ?? "");
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

function normalizeBoolean(input: unknown): boolean | null {
  if (typeof input === "boolean") return input;
  if (typeof input === "string") {
    const value = input.trim().toLowerCase();
    if (value === "true") return true;
    if (value === "false") return false;
  }
  return null;
}

function resolveStatusFromPayload(payload: BrandPayload): "active" | "archived" {
  const normalizedStatus = normalizeString(payload.status).toLowerCase();
  const isActive = normalizeBoolean(payload.is_active);

  if (normalizedStatus === "archived") return "archived";
  if (normalizedStatus === "active") return "active";

  if (isActive === false) return "archived";
  return "active";
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("catalog_brands")
    .select(BRAND_FIELDS)
    .order("name", { ascending: true });

  if (error) {
    return json({ ok: false, error: "fetch_failed", message: error.message }, 500);
  }

  return json({ ok: true, items: data ?? [] }, 200);
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  let payload: BrandPayload;
  try {
    payload = (await request.json()) as BrandPayload;
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const name = normalizeString(payload.name);
  if (!name) {
    return json({ ok: false, error: "name_required" }, 400);
  }

  const slug = normalizeSlug(payload.slug, name);
  if (!slug) {
    return json({ ok: false, error: "slug_required" }, 400);
  }

  const description = normalizeDescription(payload.description);
  const website = normalizeDescription(payload.website);
  const id = normalizeString(payload.id) || undefined;
  const status = resolveStatusFromPayload(payload);

  const supabase = getAdminClient();
  const record = {
    name,
    slug,
    description,
    website,
    status,
  };

  const query = id
    ? supabase.from("catalog_brands").update(record).eq("id", id).select(BRAND_FIELDS).maybeSingle()
    : supabase.from("catalog_brands").insert(record).select(BRAND_FIELDS).maybeSingle();

  const { data, error } = await query;
  if (error) {
    const statusCode = error.code === "23505" ? 409 : 500;
    const message = error.code === "23505" ? "duplicate_slug" : "save_failed";
    return json({ ok: false, error: message, message: error.message }, statusCode);
  }

  if (!data) {
    return json({ ok: false, error: "not_found" }, 404);
  }

  return json({ ok: true, item: data }, 200);
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  let payload: BrandPayload;
  try {
    payload = (await request.json()) as BrandPayload;
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const id = normalizeString(payload.id);
  if (!id) {
    return json({ ok: false, error: "id_required" }, 400);
  }

  const supabase = getAdminClient();

    // Guard: block deletion when catalog products exist
  const { count: productCount } = await supabase
    .from("catalog_products")
    .select("id", { count: "exact", head: true })
    .eq("brand_id", id);
  if (typeof productCount === "number" && productCount > 0) {
    return json(
      { ok: false, error: "has_products", message: "У бренда есть товары. Сначала удалите их." },
      409,
    );
  }

  const { data, error } = await supabase
    .from("catalog_brands")
    .update({ status: "archived" })
    .eq("id", id)
    .select(BRAND_FIELDS)
    .maybeSingle();

  if (error) {
    return json({ ok: false, error: "delete_failed", message: error.message }, 500);
  }

  if (!data) {
    return json({ ok: false, error: "not_found" }, 404);
  }

  return json({ ok: true, item: data }, 200);
}
