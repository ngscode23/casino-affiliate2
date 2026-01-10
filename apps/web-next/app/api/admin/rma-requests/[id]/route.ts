import { json } from "@/app/api/orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

type Payload = {
  status?: string;
  notes?: string | null;
};

function normalizeStatus(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  return ["requested", "approved", "received", "refunded", "rejected"].includes(normalized) ? normalized : null;
}

function normalizeText(value: unknown, max = 1000): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const { id } = await context.params;
  if (!id) return json({ ok: false, error: "id_required" }, 400);

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const updates: Record<string, unknown> = {};
  const status = normalizeStatus(payload.status);
  if (status) updates.status = status;
  if ("notes" in payload) updates.notes = normalizeText(payload.notes, 2000);

  if (!Object.keys(updates).length) return json({ ok: false, error: "no_updates" }, 400);

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("rma_requests")
    .update(updates)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) return json({ ok: false, error: "update_failed", message: error.message }, 500);
  if (!data) return json({ ok: false, error: "not_found" }, 404);
  return json({ ok: true, item: data }, 200);
}
