import { json } from "../../../orders/utils";
import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

const PAGE_SIZE_DEFAULT = 50;
const PAGE_SIZE_MAX = 200;

type SortColumn = "created_at" | "event_type" | "event_id" | "log_status";

type WebhookLogRowRaw = {
  id: string | null;
  event_type: string | null;
  event_id: string | null;
  created_at: string | null;
  log_status: string | number | null;
  source: string | null;
  message?: string | null;
  error: unknown;
  status: number | null;
};

const SORTABLE_COLUMNS: ReadonlySet<SortColumn> = new Set(["created_at", "event_type", "event_id", "log_status"]);

function toNullableNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function serializeError(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || url.searchParams.get("query") || "").trim();
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
    const eventTypeFilter = (url.searchParams.get("eventType") || url.searchParams.get("type") || q).trim();
    const eventIdFilter = (url.searchParams.get("eventId") || "").trim();
    const logStatusFilter = (url.searchParams.get("logStatus") || url.searchParams.get("status") || "").trim();
    const source = (url.searchParams.get("source") || "").trim();
    const sortRaw = (url.searchParams.get("sort") || "created_at.desc").trim().toLowerCase();

    const [sortColumnRaw, sortDirectionRaw] = sortRaw.split(".");
    const candidateColumn = (sortColumnRaw ?? "") as SortColumn;
    const sortColumn: SortColumn = SORTABLE_COLUMNS.has(candidateColumn) ? candidateColumn : "created_at";
    const ascending = (sortDirectionRaw || "desc") === "asc";

    let query = supabase
      .from("webhook_logs_app")
      .select("id,event_type,event_id,created_at,log_status,source,error,status", { count: "exact" })
      .order(sortColumn as string, { ascending })
      .range(from, to);

    if (eventTypeFilter) query = query.ilike("event_type", `%${eventTypeFilter}%`);
    if (eventIdFilter) query = query.eq("event_id", eventIdFilter);
    if (logStatusFilter) query = query.eq("log_status", Number.isFinite(Number(logStatusFilter)) ? Number(logStatusFilter) : logStatusFilter);
    if (source) query = query.eq("source", source);

    const { data, error, count } = await query;
    if (error) return json({ ok: false, code: "db", message: error.message }, 500);
    const rows = ((data as WebhookLogRowRaw[]) ?? []).map((row) => ({
      id: row.id ? String(row.id) : "",
      event_type: row.event_type ?? null,
      event_id: row.event_id ?? null,
      created_at: row.created_at ?? null,
      log_status: toNullableNumber(row.log_status),
      source: row.source ?? null,
      message: row.message ?? null,
      status: toNullableNumber(row.status),
      error: serializeError(row.error),
    }));

    return json({
      ok: true,
      rows,
      meta: {
        total: count ?? null,
        sort: { column: sortColumn, direction: ascending ? "asc" : "desc" },
      },
    });
  } catch (err: any) {
    return json({ ok: false, code: "internal", message: String(err?.message ?? err) }, 500);
  }
}
