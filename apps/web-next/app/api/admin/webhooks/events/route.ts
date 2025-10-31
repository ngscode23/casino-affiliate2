import { json } from "../../../orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

const PAGE_SIZE_DEFAULT = 50;
const PAGE_SIZE_MAX = 200;

function parseDateParam(value: string | null | undefined, boundary: "start" | "end"): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Support both bare dates (YYYY-MM-DD) and full ISO timestamps
  let isoCandidate = trimmed;
  if (!trimmed.includes("T")) {
    isoCandidate =
      boundary === "start"
        ? `${trimmed}T00:00:00.000Z`
        : `${trimmed}T23:59:59.999Z`;
  }

  const date = new Date(isoCandidate);
  if (Number.isNaN(date.getTime())) return null;

  if (!trimmed.includes("T")) {
    if (boundary === "start") {
      date.setUTCHours(0, 0, 0, 0);
    } else {
      date.setUTCHours(23, 59, 59, 999);
    }
  }

  return date.toISOString();
}

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
  const idFilter = (url.searchParams.get("id") || url.searchParams.get("eventId") || "").trim();
  const fromIso = parseDateParam(url.searchParams.get("from"), "start");
  const toIso = parseDateParam(url.searchParams.get("to"), "end");
  const modeParam = (url.searchParams.get("mode") || url.searchParams.get("livemode") || "").trim().toLowerCase();
  const livemodeFilter = modeParam === "live" ? true : modeParam === "test" ? false : null;

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
        "id,type,created_utc,livemode,mismatch_reason,processing_state,processing_error,notified_succeeded,notified_failed,notified_refunded,notified_desync,notified_requires_action,stripe_amount_cents,stripe_currency,expected_amount_cents,expected_currency",
        { count: "exact" },
      )
      .order("created_utc", { ascending: false })
      .range(from, to);

    if (typeFilter) query = query.ilike("type", `%${typeFilter}%`);
    if (stateFilter) query = query.eq("processing_state", stateFilter);
    if (mismatchFilter) query = query.eq("mismatch_reason", mismatchFilter);
    if (idFilter) query = query.eq("id", idFilter);
    if (fromIso) query = query.gte("created_utc", fromIso);
    if (toIso) query = query.lte("created_utc", toIso);
    if (livemodeFilter != null) query = query.eq("livemode", livemodeFilter);

    const { data, error, count } = await query;
    if (error) return json({ ok: false, code: "db", message: error.message }, 500);

    return json({
      ok: true,
      rows: (data as any[]) ?? [],
      meta: {
        total: count ?? null,
      },
    });
  } catch (err: any) {
    return json({ ok: false, code: "internal", message: String(err?.message ?? err) }, 500);
  }
}
