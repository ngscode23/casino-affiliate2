import { normalizeSort, qsNumber, formatRangeEnd, toNumber, json } from "./utils";
import { requireAuth } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if ("response" in auth) return auth.response;
  const { user } = auth;

  const supabase = getAdminClient();
  const url = new URL(request.url);
  const params = url.searchParams;

  const statusFilter = (params.get("status") ?? "").trim().toLowerCase();
  const query = (params.get("q") ?? "").trim();
  const fromRaw = params.get("from")?.trim() ?? null;
  const toRaw = params.get("to")?.trim() ?? null;
  const sort = normalizeSort(params.get("sort"));
  const page = qsNumber(params.get("page"), 1, { min: 1, round: true });
  const pageSize = qsNumber(params.get("page_size"), 20, { min: 1, max: 100, round: true });

  const fromIdx = (page - 1) * pageSize;
  const toIdx = fromIdx + pageSize - 1;

  try {
    const rangeParams: { from?: string; to?: string } = {};
    if (fromRaw) {
      const fromDate = new Date(fromRaw);
      if (!Number.isNaN(fromDate.getTime())) {
        rangeParams.from = fromDate.toISOString();
      }
    }
    const toIso = formatRangeEnd(toRaw);
    if (toIso) rangeParams.to = toIso;

    let queryBuilder: any = supabase
      .from("order_v2")
      .select(
        "id, user_id, created_at, amount_total, currency, status, payment_status",
        { count: "exact" },
      )
      .eq("user_id", user.id)
      .order(sort.column, { ascending: sort.ascending })
      .range(fromIdx, toIdx);

    if (statusFilter && statusFilter !== "all") {
      queryBuilder = queryBuilder.eq("status", statusFilter);
    }
    if (query) {
      queryBuilder = queryBuilder.ilike("id", `%${query}%`);
    }
    if (rangeParams.from) {
      queryBuilder = queryBuilder.gte("created_at", rangeParams.from);
    }
    if (rangeParams.to) {
      queryBuilder = queryBuilder.lte("created_at", rangeParams.to);
    }

    const { data, error, count } = await queryBuilder;

    if (!error) {
      const rows = Array.isArray(data) ? data : [];
      const orderIds = rows.map((row: { id: string }) => row?.id).filter(Boolean);
      let paymentsMap = new Map<string, {
        id: string;
        status: string;
        amount: number;
        created_at: string;
        currency: string | null;
      }>();

      if (orderIds.length) {
        const { data: payments, error: paymentsError } = await supabase
          .from("payments")
          .select("id, order_id, status, amount, currency, created_at")
          .in("order_id", orderIds)
          .order("created_at", { ascending: false });

        if (!paymentsError && Array.isArray(payments)) {
          paymentsMap = payments.reduce((acc, row: any) => {
            const orderId = String(row.order_id);
            if (!acc.has(orderId)) {
              acc.set(orderId, {
                id: String(row.id),
                status: String(row.status || ""),
                amount: toNumber(row.amount),
                currency: row.currency ?? null,
                created_at: String(row.created_at || new Date().toISOString()),
              });
            }
            return acc;
          }, new Map<string, {
            id: string;
            status: string;
            amount: number;
            created_at: string;
            currency: string | null;
          }>());
        }
      }

      const items = rows.map((row: any) => ({
        id: String(row.id),
        created_at: String(row.created_at),
        amount_total: toNumber(row.amount_total),
        currency: (row.currency as string) || "EUR",
        status: String(row.status || ""),
        payment_status: row.payment_status ? String(row.payment_status) : null,
        payment: paymentsMap.get(String(row.id)) ?? null,
      }));

      return json({ ok: true, items, count: count ?? items.length, page, page_size: pageSize });
    }
  } catch (error) {
    return json({ ok: false, code: "internal", message: String((error as Error)?.message ?? error) }, 500);
  }

  // Fallback to orders table when order_v2 is unavailable or produced an error above
  try {
    const { column, ascending } = sort;
    const orderColumn = column === "amount_total" ? "grand_total" : column;
    let builder: any = supabase
      .from("orders")
      .select(
        "id, user_id, created_at, status, grand_total, subtotal, discount_total, shipping_total, currency",
        { count: "exact" },
      )
      .eq("user_id", user.id)
      .order(orderColumn, { ascending })
      .range(fromIdx, toIdx);

    if (statusFilter && statusFilter !== "all") {
      builder = builder.eq("status", statusFilter);
    }
    if (query) {
      builder = builder.ilike("id", `%${query}%`);
    }
    if (fromRaw) {
      const fromDate = new Date(fromRaw);
      if (!Number.isNaN(fromDate.getTime())) {
        builder = builder.gte("created_at", fromDate.toISOString());
      }
    }
    const toIso = formatRangeEnd(toRaw);
    if (toIso) {
      builder = builder.lte("created_at", toIso);
    }

    const { data, error, count } = await builder;
    if (error) {
      return json({ ok: false, code: "db", message: error.message || "db" }, 500);
    }

    const rows = Array.isArray(data) ? data : [];
    const items = rows.map((row: any) => {
      const subtotal = toNumber(row.subtotal);
      const discount = toNumber(row.discount_total);
      const shipping = toNumber(row.shipping_total);
      const grand = toNumber(row.grand_total);
      const amountTotal = grand || subtotal - discount + shipping;
      return {
        id: String(row.id),
        created_at: String(row.created_at),
        amount_total: amountTotal,
        currency: (row.currency as string) || "EUR",
        status: String(row.status || ""),
        payment_status: null as string | null,
        payment: null,
      };
    });

    return json({ ok: true, items, count: count ?? items.length, page, page_size: pageSize });
  } catch (error) {
    return json({ ok: false, code: "internal", message: String((error as Error)?.message ?? error) }, 500);
  }
}
