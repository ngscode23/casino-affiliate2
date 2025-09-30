import { NextResponse } from "next/server";

import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

const DAY_MS = 86_400_000;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function clampDays(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) return 30;
  const normalized = Math.round(parsed);
  return Math.min(Math.max(normalized, 1), 365);
}

function formatRangeEnd(value: string): string {
  if (!value) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  date.setUTCHours(23, 59, 59, 999);
  return date.toISOString();
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  try {
    const supabase = getAdminClient();
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    if (searchParams.has("days")) {
      const days = clampDays(searchParams.get("days"));
      const since = new Date(Date.now() - days * DAY_MS).toISOString();
      const { data, error } = await supabase
        .from("order_v2")
        .select("status, amount_total")
        .gte("created_at", since);

      if (error) {
        return json({ ok: false, error: error.message || "db" }, 500);
      }

      const rows = Array.isArray(data) ? data : [];
      let total = 0;
      let pending = 0;
      let processing = 0;
      let succeeded = 0;
      let failed = 0;
      let cancelled = 0;
      let amountSum = 0;

      for (const row of rows) {
        total += 1;
        const status = (row as any).status ? String((row as any).status).toLowerCase() : "";
        const amount = Number((row as any).amount_total || 0);
        if (Number.isFinite(amount)) amountSum += amount;
        if (status === "pending") pending += 1;
        else if (status === "processing") processing += 1;
        else if (status === "succeeded") succeeded += 1;
        else if (status === "failed") failed += 1;
        else if (status === "cancelled") cancelled += 1;
      }

      const averageCheck = total ? amountSum / total : 0;
      const failedShare = total ? (failed / total) * 100 : 0;
      const conversion = total ? (succeeded / total) * 100 : 0;

      return json({
        ok: true,
        days,
        total,
        pending,
        processing,
        succeeded,
        failed,
        cancelled,
        average_check: Number(averageCheck.toFixed(2)),
        failed_share: Number(failedShare.toFixed(2)),
        conversion: Number(conversion.toFixed(2)),
      });
    }

    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(Math.max(Number(searchParams.get("pageSize")) || 25, 1), 100);
    const statusFilter = searchParams.get("status")?.trim().toLowerCase();
    const query = searchParams.get("q")?.trim();
    const from = searchParams.get("from")?.trim();
    const to = searchParams.get("to")?.trim();

    const rangeStart = (page - 1) * pageSize;
    const rangeEnd = rangeStart + pageSize - 1;

    let builder: any = supabase
      .from("order_v2")
      .select("id, created_at, amount_total, currency, status, payment_status", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(rangeStart, rangeEnd);

    if (statusFilter && statusFilter !== "all") {
      builder = builder.eq("status", statusFilter);
    }
    if (query) {
      builder = builder.ilike("id", `%${query}%`);
    }
    if (from) {
      const fromIso = new Date(from).toISOString();
      if (!Number.isNaN(new Date(fromIso).getTime())) {
        builder = builder.gte("created_at", fromIso);
      }
    }
    if (to) {
      const toIso = formatRangeEnd(to);
      if (!Number.isNaN(new Date(toIso).getTime())) {
        builder = builder.lte("created_at", toIso);
      }
    }

    const { data, error, count } = await builder;
    if (error) {
      return json({ ok: false, error: error.message || "db" }, 500);
    }

    const items = Array.isArray(data) ? data : [];
    const orderIds = items.map((row: any) => row.id).filter(Boolean);
    let paymentsMap = new Map<string, { id: string; status: string; amount: number; created_at: string; currency: string | null }>();

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
              id: row.id,
              status: row.status,
              amount: Number(row.amount || 0),
              created_at: row.created_at,
              currency: row.currency ?? null,
            });
          }
          return acc;
        }, new Map<string, { id: string; status: string; amount: number; created_at: string; currency: string | null }>());
      }
    }

    const enriched = items.map((row: any) => ({
      id: row.id,
      created_at: row.created_at,
      amount_total: Number(row.amount_total || 0),
      currency: row.currency || "EUR",
      status: row.status,
      payment_status: row.payment_status,
      payment: paymentsMap.get(String(row.id)) || null,
    }));

    return json({
      ok: true,
      items: enriched,
      count: count ?? enriched.length,
      page,
      pageSize,
    });
  } catch (error: unknown) {
    return json({ ok: false, error: String((error as Error)?.message ?? error) }, 500);
  }
}
