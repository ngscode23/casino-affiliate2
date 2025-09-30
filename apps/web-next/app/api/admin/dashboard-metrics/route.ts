import { NextResponse } from "next/server";

import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

interface OrderRow {
  created_at: string;
  amount_total: number | string | null;
  amount_discounts: number | string | null;
  amount_tax: number | string | null;
  status: string | null;
  payment_status: string | null;
}

interface MonthBucket {
  key: string;
  label: string;
}

const MONTHLY_GOAL = 20000;
const MONTH_COUNT = 12;
const DAY_MS = 86_400_000;

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function buildMonthBuckets(reference: Date): MonthBucket[] {
  const buckets: MonthBucket[] = [];
  for (let index = MONTH_COUNT - 1; index >= 0; index -= 1) {
    const date = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() - index, 1));
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    buckets.push({
      key,
      label: date.toLocaleString(undefined, { month: "short" }),
    });
  }
  return buckets;
}

function buildDailyBuckets(reference: Date): Array<{ key: string; label: string }> {
  const buckets: Array<{ key: string; label: string }> = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate() - offset));
    const key = date.toISOString().slice(0, 10);
    buckets.push({ key, label: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }) });
  }
  return buckets;
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  try {
    const supabase = getAdminClient();
    const now = new Date();
    const monthBuckets = buildMonthBuckets(now);
    const earliestMonth = monthBuckets[0];
    const monthMap = new Map<string, { sales: number; expenses: number }>();
    monthBuckets.forEach((bucket) => {
      monthMap.set(bucket.key, { sales: 0, expenses: 0 });
    });

    const dailyBuckets = buildDailyBuckets(now);
    const dailyMap = new Map<string, number>();
    dailyBuckets.forEach((bucket) => dailyMap.set(bucket.key, 0));

    const startMonthIso = `${earliestMonth.key}-01T00:00:00.000Z`;

    const { data, error } = await supabase
      .from("order_v2")
      .select("created_at, amount_total, amount_discounts, amount_tax, status, payment_status")
      .gte("created_at", startMonthIso);

    if (error) {
      return NextResponse.json(
        { ok: false, error: "db", message: error.message },
        { status: 500, headers: { "cache-control": "no-store" } },
      );
    }

    const orders: OrderRow[] = Array.isArray(data) ? (data as OrderRow[]) : [];

    let cash = 0;
    let forecast = 0;
    let succeededLast7 = 0;
    let succeededPrevious7 = 0;
    let pendingCount = 0;
    let processingCount = 0;
    let succeededCount = 0;

    const nowMs = now.getTime();
    const sevenDaysAgoMs = nowMs - DAY_MS * 6;
    const thirtyDaysAgoMs = nowMs - DAY_MS * 29;
    
    const fourteenDaysAgoMs = nowMs - DAY_MS * 13;

    for (const row of orders) {
      const createdAt = row.created_at ? new Date(row.created_at) : null;
      if (!createdAt || Number.isNaN(createdAt.getTime())) continue;

      const amountTotal = toNumber(row.amount_total);
      const expenseValue = toNumber(row.amount_discounts) + toNumber(row.amount_tax);
      const status = (row.status || "").toLowerCase();
      const monthKey = `${createdAt.getUTCFullYear()}-${String(createdAt.getUTCMonth() + 1).padStart(2, "0")}`;
      const bucket = monthMap.get(monthKey);
      if (bucket) {
        if (status === "succeeded") {
          bucket.sales += amountTotal;
          bucket.expenses += expenseValue;
        } else if (status === "failed" || status === "cancelled" || status === "refunded") {
          bucket.expenses += expenseValue;
        }
      }

      const createdMs = createdAt.getTime();
      const dayKey = createdAt.toISOString().slice(0, 10);
      if (dailyMap.has(dayKey) && status === "succeeded") {
        dailyMap.set(dayKey, (dailyMap.get(dayKey) || 0) + amountTotal);
      }

      if (status === "pending") pendingCount += 1;
      if (status === "processing") processingCount += 1;
      if (status === "succeeded") succeededCount += 1;

      if (status === "succeeded" && createdMs >= sevenDaysAgoMs) {
        cash += amountTotal;
      }

      if ((status === "pending" || status === "processing") && createdMs >= nowMs - DAY_MS * 30) {
        forecast += amountTotal;
      }

      if (status === "succeeded") {
        if (createdMs >= sevenDaysAgoMs) {
          succeededLast7 += amountTotal;
        } else if (createdMs >= fourteenDaysAgoMs) {
          succeededPrevious7 += amountTotal;
        }
      }
    }

    const currentMonthKey = monthBuckets[monthBuckets.length - 1]?.key;
    const currentMonthSales = currentMonthKey ? (monthMap.get(currentMonthKey)?.sales ?? 0) : 0;
    const goalPct = MONTHLY_GOAL > 0 ? Math.min(100, Math.round((currentMonthSales / MONTHLY_GOAL) * 100)) : 0;
    const productivityPct = (() => {
      if (succeededPrevious7 <= 0 && succeededLast7 <= 0) return 0;
      if (succeededPrevious7 <= 0) return 100;
      const ratio = (succeededLast7 / succeededPrevious7) * 100;
      return Math.max(0, Math.min(200, Math.round(ratio)));
    })();

    const cashflow = dailyBuckets.map(({ key, label }) => ({
      label,
      value: Math.round(dailyMap.get(key) || 0),
    }));

    const sales = monthBuckets.map(({ key, label }) => ({
      label,
      value: Math.round(monthMap.get(key)?.sales ?? 0),
    }));
    const expenses = monthBuckets.map(({ key, label }) => ({
      label,
      value: Math.round(monthMap.get(key)?.expenses ?? 0),
    }));
    const profit = monthBuckets.map(({ key, label }) => {
      const totals = monthMap.get(key) ?? { sales: 0, expenses: 0 };
      return {
        label,
        value: Math.max(0, Math.round(totals.sales - totals.expenses)),
      };
    });

    return NextResponse.json(
      {
        ok: true,
        metrics: {
          kpis: {
            cash: Math.round(cash),
            cashflowForecast: Math.round(forecast),
            goalPct,
            cards: {
              pending: pendingCount,
              inProgress: processingCount,
              done: succeededCount,
            },
            productivityPct,
          },
          sales,
          expenses,
          profit,
          cashflow,
          updatedAt: new Date().toISOString(),
        },
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error: unknown) {
    return NextResponse.json(
      { ok: false, error: "internal", message: String((error as Error)?.message ?? error) },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }
}
