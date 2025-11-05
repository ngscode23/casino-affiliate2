"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

import Skeleton from "@ui/components/common/skeleton";
import Input from "@ui/components/common/input";
import Button from "@ui/components/common/button";
import { getValidAccessToken } from "@shared/lib/auth";
import { useDebounce } from "@shared/hooks/useDebounce";
import {
  AdminContentWrapper,
  AdminInfoPanel,
  AdminPageLayout,
  AdminStack,
  AdminSurface,
} from "@/components/admin/layout";

const LazyOrdersTable = dynamic(() => import("./OrdersTable"), { ssr: false });

const DEFAULT_ADMIN_TOKEN = process.env.NEXT_PUBLIC_ADMIN_TOKEN ?? "";

interface Payment {
  id: string;
  status: string;
  amount: number;
  currency: string | null;
  created_at: string;
}

interface OrderRow {
  id: string;
  created_at: string;
  amount_total: number;
  currency: string;
  status: string;
  payment_status: string | null;
  payment: Payment | null;
}

interface Summary {
  total: number;
  pending: number;
  processing: number;
  succeeded: number;
  failed: number;
  cancelled: number;
  average_check: number;
  failed_share: number;
  conversion: number;
}

function useAdminToken() {
  const [token, setToken] = useState("");

  useEffect(() => {
    let initial = DEFAULT_ADMIN_TOKEN ?? "";
    try {
      const stored = window.localStorage.getItem("admin:token");
      if (stored) initial = stored;
    } catch {
      // ignore storage errors
    }
    setToken(initial);
  }, []);

  const update = (value: string) => {
    setToken(value);
    try {
      window.localStorage.setItem("admin:token", value);
    } catch {
      // ignore storage errors
    }
  };

  return { token, setToken: update };
}

async function authorizedRequest(path: string, adminToken: string, init?: RequestInit) {
  const accessToken = await getValidAccessToken();

  const headers = new Headers(init?.headers ?? {});
  headers.set("accept", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (adminToken) headers.set("x-admin-token", adminToken);

  // ensure absolute URL to avoid relative-path resolution issues
  const url = path.startsWith("http") ? path : new URL(path, window.location.origin).toString();

  return fetch(url, { ...init, headers, cache: "no-store" });
}

async function fetchSummary(adminToken: string): Promise<Summary | null> {
  // Попытка через авторизованный запрос (если есть access token)
  try {
    const response = await authorizedRequest("/api/admin/orders?days=30", adminToken);
    if (response.ok) {
      const json = (await response.json()) as Summary & { ok?: boolean };
      if (json?.ok === false) return null;
      return json;
    }
    // если 404/500 — упадём в fallback ниже
  } catch (err) {
    console.warn("authorizedRequest failed for summary, will try fallback:", err);
  }

  // Fallback: прямой fetch с использованием только x-admin-token (если сервер принимает)
  try {
    const url = new URL("/api/admin/orders?days=30", window.location.origin).toString();
    const headers: Record<string, string> = { accept: "application/json" };
    if (adminToken) headers["x-admin-token"] = adminToken;
    const res = await fetch(url, { headers, cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as Summary & { ok?: boolean };
    if (json?.ok === false) return null;
    return json;
  } catch (error) {
    console.warn("fetchSummary fallback failed", error);
    return null;
  }
}

interface OrdersQueryParams {
  page: number;
  pageSize: number;
  status?: string;
  q?: string;
  from?: string;
  to?: string;
}

async function fetchOrders(params: OrdersQueryParams, adminToken: string) {
  const url = new URL("/api/admin/orders", window.location.origin);
  url.searchParams.set("page", String(params.page));
  url.searchParams.set("pageSize", String(params.pageSize));
  if (params.status && params.status !== "all") {
    url.searchParams.set("status", params.status);
  }
  if (params.q) url.searchParams.set("q", params.q);
  if (params.from) url.searchParams.set("from", params.from);
  if (params.to) url.searchParams.set("to", params.to);

  const response = await authorizedRequest(url.toString(), adminToken);
  if (!response.ok) {
    throw new Error(await response.text());
  }
  const json = await response.json();
  if (json?.ok === false) {
    throw new Error(String(json?.message || json?.error || "Failed to load orders"));
  }
  return {
    items: (Array.isArray(json?.items) ? json.items : []) as OrderRow[],
    count: Number(json?.count || 0),
  };
}

async function callPayments(path: string, body: unknown, adminToken: string) {
  const response = await authorizedRequest(`/api/payments${path}`, adminToken, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `payments ${path} ${response.status}`);
  }
  return response.json();
}

function formatCurrency(amount: number, currency: string | null | undefined) {
  const cur = (currency || "EUR").toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: cur,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${cur}`;
  }
}

const STATUS_OPTIONS = [
  { value: "all", label: "Все статусы" },
  { value: "pending", label: "Ожидание" },
  { value: "processing", label: "В обработке" },
  { value: "succeeded", label: "Оплачен" },
  { value: "failed", label: "Ошибка" },
  { value: "cancelled", label: "Отменён" },
];

const PAGE_SIZE = 25;

export function OrdersClient() {
  const { token, setToken } = useAdminToken();

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [refreshToken, setRefreshToken] = useState(0);

  const debouncedSearch = useDebounce(search, 400);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, from, to]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await fetchSummary(token);
      if (!cancelled) setSummary(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [token, refreshToken]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const { items, count } = await fetchOrders(
          {
            page,
            pageSize: PAGE_SIZE,
            status,
            q: debouncedSearch ? debouncedSearch : undefined,
            from: from || undefined,
            to: to || undefined,
          },
          token,
        );
        if (!cancelled) {
          setOrders(items);
          setTotal(count);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, status, debouncedSearch, from, to, token, refreshToken]);

  const summaryCards = useMemo(() => {
    if (!summary) return null;
    return [
      { label: "Всего заказов", value: summary.total.toLocaleString() },
      { label: "Конверсия", value: `${summary.conversion.toFixed(2)}%` },
      { label: "Средний чек", value: formatCurrency(summary.average_check, "EUR") },
      { label: "Доля отказов", value: `${summary.failed_share.toFixed(2)}%` },
    ];
  }, [summary]);

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setFrom("");
    setTo("");
  };

  const handleRefresh = () => setRefreshToken((value) => value + 1);

  const hasActiveFilters =
    status !== "all" || Boolean(search.trim()) || Boolean(from) || Boolean(to);

  const toolbarContent = (
    <AdminSurface tone="muted" padded="md">
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_140px_140px]">
          <Input
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            placeholder="Поиск по номеру заказа..."
          />
          <select
            className="h-10 rounded-md border border-admin-border bg-admin-surface px-3 text-sm"
            value={status}
            onChange={(event) => setStatus(event.currentTarget.value)}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.currentTarget.value)}
          />
          <Input
            type="date"
            value={to}
            onChange={(event) => setTo(event.currentTarget.value)}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-admin-textSubtle">
          <span>Фильтры применяются автоматически.</span>
          <Button
            type="button"
            variant="soft"
            className="h-8 px-3"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
          >
            Сбросить фильтры
          </Button>
        </div>
      </div>
    </AdminSurface>
  );

  const sidebarContent = (
    <AdminStack gap="lg">
      <AdminInfoPanel title="Токен администратора">
        <div className="space-y-3">
          <div className="space-y-2">
            <label
              htmlFor="admin-token-input"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-admin-textSubtle"
            >
              x-admin-token
            </label>
            <Input
              id="admin-token-input"
              value={token}
              onChange={(event) => setToken(event.currentTarget.value)}
              placeholder="Вставьте токен"
            />
          </div>
          <p className="text-xs text-admin-textSoft">
            Храним токен в локальном хранилище браузера и используем для запросов к платежному API.
          </p>
        </div>
      </AdminInfoPanel>
      <AdminInfoPanel title="Подсказки">
        <ul className="space-y-2 text-sm text-admin-textSoft">
          <li>Обновление перезагружает данные заказов и сводку за последние 30 дней.</li>
          <li>Фильтры по дате используют локальную таймзону браузера.</li>
        </ul>
      </AdminInfoPanel>
    </AdminStack>
  );

  return (
    <AdminContentWrapper>
      <AdminPageLayout
        title="Заказы"
        description="Контролируйте оплаты, статусы и ручные сценарии."
        breadcrumbs={[
          { label: "Админка", href: "/admin" },
          { label: "Заказы" },
        ]}
        primaryActions={
          <Button type="button" onClick={handleRefresh} disabled={loading}>
            {loading ? "Обновляем..." : "Обновить данные"}
          </Button>
        }
        toolbar={toolbarContent}
        sidebar={sidebarContent}
      >
        {summaryCards ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {summaryCards.map((card) => (
              <AdminSurface key={card.label} tone="muted" padded="lg">
                <div className="text-xs font-medium uppercase tracking-[0.14em] text-admin-textSubtle">
                  {card.label}
                </div>
                <div className="mt-2 text-2xl font-semibold text-admin-text">
                  {card.value}
                </div>
              </AdminSurface>
            ))}
          </div>
        ) : null}

        {loading ? (
          <AdminSurface padded="lg">
            <div className="space-y-3">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </AdminSurface>
        ) : error ? (
          <AdminSurface tone="muted" padded="lg">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-rose-500">{error}</span>
              <Button type="button" variant="soft" onClick={handleRefresh}>
                Повторить
              </Button>
            </div>
          </AdminSurface>
        ) : orders.length === 0 ? (
          <AdminSurface tone="muted" padded="lg">
            <div className="text-sm text-admin-textSoft">Заказы не найдены.</div>
          </AdminSurface>
        ) : (
          <AdminSurface padded="lg" className="overflow-hidden">
            <LazyOrdersTable
              orders={orders}
              total={total}
              page={page}
              totalPages={totalPages}
              setPage={setPage}
              token={token}
              onOrdersChange={setOrders}
              onRefresh={handleRefresh}
            />
          </AdminSurface>
        )}
      </AdminPageLayout>
    </AdminContentWrapper>
  );
}
