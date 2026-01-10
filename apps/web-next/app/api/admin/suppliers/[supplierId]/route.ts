import { NextRequest } from "next/server";

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

function normalizeOptionalString(input: unknown): string | null {
  const value = normalizeString(input);
  return value || null;
}

function normalizeStatus(input: unknown): "active" | "paused" | "inactive" | null {
  if (typeof input !== "string") return null;
  const value = input.trim().toLowerCase();
  if (!value) return null;
  return STATUS_VALUES.has(value) ? (value as "active" | "paused" | "inactive") : null;
}

function normalizeCurrency(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const value = input.trim().toUpperCase();
  return value || null;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ supplierId: string }> },
) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const { supplierId } = await context.params;
  const normalizedId = normalizeString(supplierId);
  if (!normalizedId) {
    return json({ ok: false, error: "id_required" }, 400);
  }

  let payload: SupplierPayload;
  try {
    payload = (await request.json()) as SupplierPayload;
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const updates: Record<string, unknown> = {};

  if ("name" in payload) {
    const name = normalizeString(payload.name);
    if (!name) return json({ ok: false, error: "name_required" }, 400);
    updates.name = name;
  }

  if ("code" in payload) {
    const code = normalizeString(payload.code).toLowerCase();
    if (!code) return json({ ok: false, error: "code_required" }, 400);
    updates.code = code;
  }

  if ("status" in payload) {
    const status = normalizeStatus(payload.status);
    if (!status) return json({ ok: false, error: "status_invalid" }, 400);
    updates.status = status;
  }

  if ("default_currency" in payload) {
    const currency = normalizeCurrency(payload.default_currency);
    if (!currency) return json({ ok: false, error: "currency_invalid" }, 400);
    updates.default_currency = currency;
  }

  if ("contact_email" in payload) {
    updates.contact_email = normalizeOptionalString(payload.contact_email);
  }

  if ("api_base_url" in payload) {
    updates.api_base_url = normalizeOptionalString(payload.api_base_url);
  }

  if ("metadata" in payload) {
    updates.metadata = payload.metadata ?? {};
  }

  if (!Object.keys(updates).length) {
    return json({ ok: false, error: "no_updates" }, 400);
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("suppliers")
    .update(updates)
    .eq("id", normalizedId)
    .select(SUPPLIER_FIELDS)
    .maybeSingle();

  if (error) {
    const status = error.code === "23505" ? 409 : 500;
    const code = error.code === "23505" ? "duplicate" : "update_failed";
    return json({ ok: false, error: code, message: error.message }, status);
  }

  if (!data) {
    return json({ ok: false, error: "not_found" }, 404);
  }

  return json({ ok: true, item: data }, 200);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ supplierId: string }> },
) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const { supplierId } = await context.params;
  const normalizedId = normalizeString(supplierId);
  if (!normalizedId) {
    return json({ ok: false, error: "id_required" }, 400);
  }

  const supabase = getAdminClient();
  const { count } = await supabase
    .from("supplier_skus")
    .select("id", { count: "exact", head: true })
    .eq("supplier_id", normalizedId);

  if (typeof count === "number" && count > 0) {
    return json({ ok: false, error: "has_skus", message: "Supplier has linked SKUs." }, 409);
  }

  const { data, error } = await supabase
    .from("suppliers")
    .update({ status: "inactive" })
    .eq("id", normalizedId)
    .select(SUPPLIER_FIELDS)
    .maybeSingle();

  if (error) {
    return json({ ok: false, error: "delete_failed", message: error.message }, 500);
  }

  if (!data) {
    return json({ ok: false, error: "not_found" }, 404);
  }

  return json({ ok: true, item: data }, 200);
}
