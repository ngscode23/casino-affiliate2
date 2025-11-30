import { NextResponse } from "next/server";

import { requireAdmin } from "@/utils/auth/guard";
import { getAdminClient } from "@/utils/supabase/admin";

const DAY_MS = 86_400_000;
const MAX_WINDOW_DAYS = 365;
const MIN_WINDOW_DAYS = 7;
const MAX_PAGE_SIZE = 100;
const MAX_ORDER_ROWS = 4000;

type OrderRow = {
  id: string;
  user_id: string;
  created_at: string;
  grand_total: number | string | null;
  currency: string | null;
  contact_email: string | null;
};

function clampDays(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 120;
  const normalized = Math.round(parsed);
  if (normalized < MIN_WINDOW_DAYS) return MIN_WINDOW_DAYS;
  if (normalized > MAX_WINDOW_DAYS) return MAX_WINDOW_DAYS;
  return normalized;
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const pageSize = Math.min(Math.max(Number(url.searchParams.get("pageSize")) || 25, 5), MAX_PAGE_SIZE);
  const search = (url.searchParams.get("search") || "").trim().toLowerCase();
  const days = clampDays(url.searchParams.get("days"));
  const sinceIso = new Date(Date.now() - days * DAY_MS).toISOString();

  const supabase = getAdminClient();

  const { data: orders, error: ordersError, count } = await supabase
    .from("orders")
    .select("id,user_id,grand_total,currency,created_at,contact_email", { count: "exact" })
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(MAX_ORDER_ROWS);

  if (ordersError) {
    return json({ ok: false, error: ordersError.message || "orders_query_failed" }, 500);
  }

  const rows: OrderRow[] = Array.isArray(orders) ? (orders as OrderRow[]) : [];
  const customers = new Map<
    string,
    {
      userId: string;
      email: string | null;
      emailLower: string | null;
      ordersCount: number;
      totalSpent: number;
      lastOrderAt: string | null;
      firstOrderAt: string | null;
      currency: string | null;
    }
  >();

  let totalOrders = 0;
  let grossRevenue = 0;
  for (const row of rows) {
    if (!row?.user_id) continue;
    totalOrders += 1;
    const amount = Number(row.grand_total ?? 0) || 0;
    if (Number.isFinite(amount)) grossRevenue += amount;
    let current = customers.get(row.user_id);
    if (!current) {
      const email = row.contact_email && row.contact_email.trim() ? row.contact_email.trim() : null;
      current = {
        userId: row.user_id,
        email,
        emailLower: email ? email.toLowerCase() : null,
        ordersCount: 0,
        totalSpent: 0,
        lastOrderAt: null,
        firstOrderAt: null,
        currency: row.currency || null,
      };
      customers.set(row.user_id, current);
    }
    current.ordersCount += 1;
    if (Number.isFinite(amount)) current.totalSpent += amount;
    if (!current.currency && row.currency) current.currency = row.currency;
    const createdAt = row.created_at;
    if (!current.lastOrderAt || (createdAt && createdAt > current.lastOrderAt)) {
      current.lastOrderAt = createdAt;
      if (!current.email && row.contact_email) {
        const email = row.contact_email.trim();
        current.email = email || null;
        current.emailLower = email ? email.toLowerCase() : null;
      }
    }
    if (!current.firstOrderAt || (createdAt && createdAt < current.firstOrderAt)) {
      current.firstOrderAt = createdAt;
    }
  }

  const userIds = Array.from(customers.keys());
  const profileMap = new Map<string, { full_name: string | null; username: string | null }>();
  if (userIds.length) {
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, username")
      .in("id", userIds)
      .limit(userIds.length);
    if (!profileError && Array.isArray(profiles)) {
      for (const profile of profiles) {
        profileMap.set(profile.id, { full_name: profile.full_name, username: profile.username });
      }
    }
  }

  const emails = Array.from(
    new Set(
      Array.from(customers.values())
        .map((value) => value.emailLower)
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const stripeMap = new Map<
    string,
    { id: string; name: string | null; description: string | null; created: string | null }
  >();
  if (emails.length) {
    const { data: stripeRows } = await supabase
      .from("stripe_customers_cache")
      .select("id,email,name,description,created")
      .in("email", emails)
      .limit(emails.length);
    if (Array.isArray(stripeRows)) {
      for (const stripe of stripeRows) {
        const key = typeof stripe.email === "string" ? stripe.email.toLowerCase() : null;
        if (!key) continue;
        stripeMap.set(key, {
          id: stripe.id,
          name: stripe.name ?? null,
          description: stripe.description ?? null,
          created: stripe.created ?? null,
        });
      }
    }
  }

  const list = Array.from(customers.values()).map((value) => {
    const profile = profileMap.get(value.userId);
    const stripe = value.emailLower ? stripeMap.get(value.emailLower) : undefined;
    const name = profile?.full_name || stripe?.name || profile?.username || null;
    const averageOrderValue =
      value.ordersCount > 0 ? Number((value.totalSpent / value.ordersCount).toFixed(2)) : null;
    return {
      userId: value.userId,
      email: value.email,
      name,
      ordersCount: value.ordersCount,
      totalSpent: Number(value.totalSpent.toFixed(2)),
      currency: value.currency || "EUR",
      lastOrderAt: value.lastOrderAt,
      firstOrderAt: value.firstOrderAt,
      averageOrderValue,
      stripeCustomerId: stripe?.id ?? null,
      stripeCreatedAt: stripe?.created ?? null,
    };
  });

  list.sort((a, b) => {
    const aTime = a.lastOrderAt ? Date.parse(a.lastOrderAt) : 0;
    const bTime = b.lastOrderAt ? Date.parse(b.lastOrderAt) : 0;
    return bTime - aTime;
  });

  let filtered = list;
  if (search) {
    filtered = list.filter((row) => {
      const bucket = [
        row.email?.toLowerCase() ?? "",
        row.name?.toLowerCase() ?? "",
        row.userId.toLowerCase(),
        row.stripeCustomerId?.toLowerCase() ?? "",
      ];
      return bucket.some((value) => value.includes(search));
    });
  }

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  const topSpender = list.reduce<{ userId: string; totalSpent: number; email: string | null } | null>(
    (acc, row) => {
      if (!acc || row.totalSpent > acc.totalSpent) {
        return { userId: row.userId, totalSpent: row.totalSpent, email: row.email };
      }
      return acc;
    },
    null,
  );

  return json({
    ok: true,
    items,
    count: total,
    page,
    pageSize,
    days,
    sampleSize: rows.length,
    orderWindow: { days, since: sinceIso },
    truncated: typeof count === "number" ? count > rows.length : rows.length >= MAX_ORDER_ROWS,
    totals: {
      uniqueCustomers: customers.size,
      ordersProcessed: totalOrders,
      grossRevenue: Number(grossRevenue.toFixed(2)),
      topSpender,
    },
  });
}
