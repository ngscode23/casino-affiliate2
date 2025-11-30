"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";

import Input from "@ui/components/common/input";
import Button from "@ui/components/common/button";
import Skeleton from "@ui/components/common/skeleton";
import { useDebounce } from "@shared/hooks/useDebounce";
import {
  AdminPageLayout,
  AdminContentWrapper,
  AdminStack,
  AdminSurface,
  AdminInfoPanel,
} from "@/components/admin/layout";

type CustomerRow = {
  userId: string;
  email: string | null;
  name: string | null;
  ordersCount: number;
  totalSpent: number;
  currency: string;
  lastOrderAt: string | null;
  firstOrderAt: string | null;
  averageOrderValue: number | null;
  stripeCustomerId: string | null;
  stripeCreatedAt: string | null;
};

type CustomersResponse = {
  ok: boolean;
  items: CustomerRow[];
  count: number;
  page: number;
  pageSize: number;
  days: number;
  sampleSize: number;
  truncated: boolean;
  orderWindow: { days: number; since: string };
  totals: {
    uniqueCustomers: number;
    ordersProcessed: number;
    grossRevenue: number;
    topSpender: { userId: string; totalSpent: number; email: string | null } | null;
  };
};

const PAGE_SIZE = 25;
const DAY_OPTIONS = [
  { value: 30, label: "30 дней" },
  { value: 90, label: "90 дней" },
  { value: 180, label: "180 дней" },
  { value: 365, label: "365 дней" },
];

function formatCurrency(value: number, currency = "EUR") {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

function formatDate(value: string | null) {
  if (!value) return "―";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

async function fetchCustomers(params: { page: number; search: string; days: number }) {
  const url = new URL("/api/admin/customers", window.location.origin);
  url.searchParams.set("page", String(params.page));
  url.searchParams.set("pageSize", String(PAGE_SIZE));
  url.searchParams.set("days", String(params.days));
  if (params.search) {
    url.searchParams.set("search", params.search);
  }
  const response = await fetch(url.toString(), {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Request failed (${response.status})`);
  }
  return (await response.json()) as CustomersResponse;
}

function SummaryCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="rounded-2xl border border-admin-border bg-white px-5 py-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-admin-textSubtle">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-admin-text">{value}</div>
      {helper ? <div className="text-xs text-admin-textSubtle">{helper}</div> : null}
    </div>
  );
}

export default function CustomersClient() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [days, setDays] = useState(120);
  const debouncedSearch = useDebounce(searchInput, 400);

  const [data, setData] = useState<CustomersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchCustomers({ page, search: debouncedSearch, days })
      .then((payload) => {
        if (cancelled) return;
        setData(payload);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Не удалось загрузить клиентов");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, debouncedSearch, days]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, days]);

  const totals = data?.totals;
  const stats = useMemo(() => {
    if (!totals) {
      return {
        customers: "―",
        ordersProcessed: "―",
        grossRevenue: "―",
        topSpender: "―",
      };
    }
    return {
      customers: totals.uniqueCustomers.toLocaleString(),
      ordersProcessed: totals.ordersProcessed.toLocaleString(),
      grossRevenue: formatCurrency(totals.grossRevenue),
      topSpender: totals.topSpender
        ? `${totals.topSpender.email ?? totals.topSpender.userId} · ${formatCurrency(
            totals.topSpender.totalSpent,
          )}`
        : "―",
    };
  }, [totals]);

  const showTableSkeleton = loading && !data;
  const items = data?.items ?? [];

  return (
    <AdminPageLayout
      title="Customers"
      description="Обзор покупателей, их активность и суммарные заказы за выбранный период."
    >
      <AdminContentWrapper>
        <AdminStack gap="lg">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="Активные клиенты" value={stats.customers} helper={`За ${days} дней`} />
            <SummaryCard
              label="Обработано заказов"
              value={stats.ordersProcessed}
              helper={data?.truncated ? "Показаны последние 4000 записей" : undefined}
            />
            <SummaryCard label="Выручка периода" value={stats.grossRevenue} />
            <SummaryCard label="Топ клиент" value={stats.topSpender} />
          </div>

          <AdminSurface>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-1 items-center gap-3">
                <Input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Поиск по email, имени или user_id"
                  className="flex-1"
                />
                <select
                  className="rounded-xl border border-admin-border bg-white px-3 py-2 text-sm text-admin-text focus:border-admin-primary focus:outline-none"
                  value={days}
                  onChange={(event) => setDays(Number(event.target.value))}
                >
                  {DAY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-xs text-admin-textSubtle">
                {data
                  ? `Уникальных клиентов: ${data.count.toLocaleString()} · выборка заказов: ${data.sampleSize.toLocaleString()}`
                  : " "}
              </div>
            </div>

            {error ? (
              <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                <div className="font-semibold">Не удалось загрузить данные</div>
                <p className="mt-1">{error}</p>
                <Button variant="secondary" className="mt-3" onClick={() => setPage((prev) => prev)}>
                  Повторить запрос
                </Button>
              </div>
            ) : null}

            {showTableSkeleton ? (
              <div className="mt-6 space-y-3">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <Skeleton key={`customers-skeleton-${idx}`} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="mt-6 overflow-x-auto">
                <table className="min-w-[720px] w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-[0.24em] text-admin-textSubtle">
                      <th className="px-3 py-2">Клиент</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Заказы</th>
                      <th className="px-3 py-2">Сумма</th>
                      <th className="px-3 py-2">Avg чек</th>
                      <th className="px-3 py-2">Последний заказ</th>
                      <th className="px-3 py-2">Stripe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-6 text-center text-admin-textSubtle">
                          {loading ? "Загрузка..." : "Покупатели за выбранный период не найдены"}
                        </td>
                      </tr>
                    ) : (
                      items.map((row) => (
                        <tr key={row.userId} className="border-t border-admin-border/70">
                          <td className="px-3 py-3">
                            <div className="font-semibold text-admin-text">
                              {row.name || row.email || row.userId}
                            </div>
                            <div className="text-xs text-admin-textSubtle">{row.userId}</div>
                          </td>
                          <td className="px-3 py-3 text-admin-text">{row.email ?? "—"}</td>
                          <td className="px-3 py-3 text-admin-text">
                            {row.ordersCount.toLocaleString()}
                            <div className="text-xs text-admin-textSubtle">
                              с {formatDate(row.firstOrderAt)}
                            </div>
                          </td>
                          <td className="px-3 py-3 font-semibold text-admin-text">
                            {formatCurrency(row.totalSpent, row.currency)}
                          </td>
                          <td className="px-3 py-3 text-admin-text">
                            {row.averageOrderValue != null
                              ? formatCurrency(row.averageOrderValue, row.currency)
                              : "—"}
                          </td>
                          <td className="px-3 py-3 text-admin-text">
                            {formatDate(row.lastOrderAt)}
                          </td>
                          <td className="px-3 py-3">
                            {row.stripeCustomerId ? (
                              <a
                                href={`https://dashboard.stripe.com/customers/${row.stripeCustomerId}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-500"
                              >
                                {row.stripeCustomerId.slice(0, 10)}…
                                <ExternalLink size={14} />
                              </a>
                            ) : (
                              <span className="text-xs text-admin-textSubtle">Нет данных</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 border-t border-admin-border pt-4 text-sm text-admin-text md:flex-row md:items-center md:justify-between">
              <div>
                {data
                  ? `Показано ${
                      items.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
                    }–${(page - 1) * PAGE_SIZE + items.length} из ${data.count}`
                  : ""}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="soft"
                  disabled={page === 1 || loading}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  className="flex items-center gap-1"
                >
                  <ChevronLeft size={16} />
                  Назад
                </Button>
                <Button
                  type="button"
                  variant="soft"
                  disabled={loading || (data ? page * PAGE_SIZE >= data.count : false)}
                  onClick={() => setPage((prev) => prev + 1)}
                  className="flex items-center gap-1"
                >
                  Вперёд
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          </AdminSurface>

          <AdminInfoPanel title="Подсказки">
            <ul className="list-disc space-y-1 pl-4 text-sm text-admin-text">
              <li>Данные собираются по заказам за выбранный период (максимум 4000 последних записей).</li>
              <li>Чтобы увидеть клиентов без заказов, импортируйте их в Stripe — список подтянется автоматически.</li>
              <li>Ссылка Stripe открывает карточку клиента в dashboard в новой вкладке.</li>
            </ul>
          </AdminInfoPanel>
        </AdminStack>
      </AdminContentWrapper>
    </AdminPageLayout>
  );
}
