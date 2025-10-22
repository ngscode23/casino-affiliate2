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

    return json({
      ok: true,
      rows: (data as WebhookLogRowRaw[]) ?? [],
      meta: {
        total: count ?? null,
        sort: { column: sortColumn, direction: ascending ? "asc" : "desc" },
      },
    });
  } catch (err: any) {
    return json({ ok: false, code: "internal", message: String(err?.message ?? err) }, 500);
  }
}
