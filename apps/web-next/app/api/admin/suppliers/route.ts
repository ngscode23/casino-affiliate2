import { json } from "@/app/api/orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

const SUPPLIER_FIELDS =
  "id, code, name, status, default_currency, contact_email, api_base_url, metadata, created_at, updated_at";
const STATUS_VALUES = new Set(["active", "paused", "inactive"]);

type SupplierPayload = {
  code?: string;
  name?: string;
  status?: string;
  default_currency?: string;
  contact_email?: string | null;
  api_base_url?: string | null;
  metadata?: Record<string, unknown> | null;
};

function normalizeString(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.trim();
}

function normalizeStatus(input: unknown): "active" | "paused" | "inactive" {
  const value = normalizeString(input).toLowerCase();
  if (STATUS_VALUES.has(value)) return value as "active" | "paused" | "inactive";
  return "active";
}

function normalizeCurrency(input: unknown): string {
  const value = normalizeString(input).toUpperCase();
  return value || "USD";
}

function normalizeOptionalString(input: unknown): string | null {
  const value = normalizeString(input);
  return value || null;
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const url = new URL(request.url);
  const qRaw = normalizeString(url.searchParams.get("q"));
  const supabase = getAdminClient();
  let query = supabase.from("suppliers").select(SUPPLIER_FIELDS).order("name", { ascending: true });

  if (qRaw) {
    const pattern = `%${qRaw.replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
    query = query.or(`name.ilike.${pattern},code.ilike.${pattern}`);
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

  let payload: SupplierPayload;
  try {
    payload = (await request.json()) as SupplierPayload;
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const name = normalizeString(payload.name);
  if (!name) {
    return json({ ok: false, error: "name_required" }, 400);
  }

  const code = normalizeString(payload.code).toLowerCase();
  if (!code) {
    return json({ ok: false, error: "code_required" }, 400);
  }

  const record = {
    code,
    name,
    status: normalizeStatus(payload.status),
    default_currency: normalizeCurrency(payload.default_currency),
    contact_email: normalizeOptionalString(payload.contact_email),
    api_base_url: normalizeOptionalString(payload.api_base_url),
    metadata: payload.metadata ?? {},
  };

  const supabase = getAdminClient();
  const { data, error } = await supabase.from("suppliers").insert(record).select(SUPPLIER_FIELDS).maybeSingle();

  if (error) {
    const status = error.code === "23505" ? 409 : 500;
    const code = error.code === "23505" ? "duplicate" : "create_failed";
    return json({ ok: false, error: code, message: error.message }, status);
  }

  if (!data) {
    return json({ ok: false, error: "not_found" }, 404);
  }

  return json({ ok: true, item: data }, 200);
}
