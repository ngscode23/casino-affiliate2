import { json } from "../../../orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

const PAGE_SIZE_DEFAULT = 50;
const PAGE_SIZE_MAX = 200;

export async function GET(request: Request) {
  const adminToken = process.env.ADMIN_TOKEN?.trim() ?? "";
  const headerToken =
    (request.headers.get("x-admin-token") || request.headers.get("X-Admin-Token") || "").trim();

  if (!adminToken || headerToken !== adminToken) {
    const auth = await requireAdmin(request);
    if ("response" in auth) return auth.response;
  }

  const url = new URL(request.url);
  const typeFilter = (url.searchParams.get("type") || "").trim();
  const stateFilter = (url.searchParams.get("state") || "").trim();
  const mismatchFilter = (url.searchParams.get("mismatch") || "").trim();
  const pageRaw = Number(url.searchParams.get("page") || "0");
  const pageSizeRaw = Number(url.searchParams.get("pageSize") || "");

  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 0;
  const pageSize = Number.isFinite(pageSizeRaw) && pageSizeRaw > 0
    ? Math.min(Math.floor(pageSizeRaw), PAGE_SIZE_MAX)
    : PAGE_SIZE_DEFAULT;

  try {
    const supabase = getAdminClient();
    const from = page * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("stripe_webhooks")
      .select(
        "id,type,created_utc,livemode,mismatch_reason,processing_state,processing_error,notified_succeeded,notified_failed,notified_refunded,notified_desync,notified_requires_action,stripe_amount_cents,stripe_currency,expected_amount_cents,expected_currency"
      )
      .order("created_utc", { ascending: false })
      .range(from, to);

    if (typeFilter) query = query.ilike("type", `%${typeFilter}%`);
    if (stateFilter) query = query.eq("processing_state", stateFilter);
    if (mismatchFilter) query = query.eq("mismatch_reason", mismatchFilter);

    const { data, error } = await query;
    if (error) return json({ ok: false, code: "db", message: error.message }, 500);

    return json({ ok: true, rows: (data as any[]) ?? [] });
  } catch (err: any) {
    return json({ ok: false, code: "internal", message: String(err?.message ?? err) }, 500);
  }
}
