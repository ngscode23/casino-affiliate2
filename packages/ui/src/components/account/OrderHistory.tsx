import { useEffect, useMemo, useState, Fragment } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { listOrders, getOrder, getProductsByIds, confirmPayment, cancelOrder } from "@shared/ecom/api/client";
import { toast } from "sonner";
import { useAuthState } from "@shared/lib/authStore";
import { sanitizeSearchParam } from "@shared/lib/sanitize";

const IS_DEV = process.env.NODE_ENV !== "production";

type OrderRow = {
  id?: string | number;
  order_id?: string | number;
  order_no?: string | number;
  created_at?: string;
  ts?: string;
  date?: string;
  status?: string;
  payment_status?: string | null;
  amount?: number | string;
  total?: number | string;
  currency?: string;
  user_id?: string;
};

type OrderItemRow = {
  order_id: string;
  product_id?: string;
  title?: string;
  qty?: number;
  unit_price?: number;
  total?: number;
};

function normalize(row: OrderRow) {
  const oid = (row.order_id ?? row.id ?? "").toString();
  const orderNo = (row.order_no ?? row.order_id ?? row.id ?? "").toString();
  const dateRaw = row.created_at ?? row.ts ?? row.date ?? "";
  const date = dateRaw ? new Date(dateRaw) : null;
  const status = (row.status ?? "").toString();
  const amountNum = Number(row.amount ?? row.total ?? 0);
  const currency = (row.currency ?? "").toString() || "EUR";
  return { oid, orderNo, date, status, payment_status: row.payment_status ?? null, amount: amountNum, currency };
}

export default function OrderHistory() {
  const [items, setItems] = useState<OrderRow[] | null>(null);
  const { user } = useAuthState();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemMap, setItemMap] = useState<Record<string, OrderItemRow[]>>({});
  const [slugMap, setSlugMap] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  // Фильтры/сортировки/пагинация
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [q, setQ] = useState<string>("");
  const [sort, setSort] = useState<string>("created_at desc");
  const [cursor, setCursor] = useState<string | null>(null);
  const [limit, setLimit] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [payingId, setPayingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Инициализация из URL
  useEffect(() => {
    const s = searchParams.get("status") || "";
    const q0 = sanitizeSearchParam(searchParams.get("q"));
    const sort0 = searchParams.get("sort") || "created_at desc";
    const cursor0 = searchParams.get("cursor");
    const limit0 = Math.max(1, parseInt(searchParams.get("page_size") || searchParams.get("limit") || "10", 10) || 10);
    setStatusFilter(s);
    setQ(q0);
    setSort(sort0);
    setCursor(cursor0);
    setLimit(limit0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        if (!user) {
          if (IS_DEV) {
            const demo: OrderRow[] = [
              { order_no: "DEMO-1001", created_at: new Date().toISOString(), status: "succeeded", amount: 29.9, currency: "EUR" },
            ];
            if (mounted) setItems(demo);
          } else {
            if (mounted) {
              setItems([]);
              setError("Для просмотра заказов войдите в аккаунт.");
            }
          }
          return;
        }
        const resp = await listOrders({
          status: statusFilter || undefined,
          q: q || undefined,
          sort,
          cursor: cursor || undefined,
          page_size: limit,
        });
        const orders = resp.items.map((r) => ({
          id: r.id,
          order_id: r.id,
          order_no: r.id,
          created_at: r.created_at,
          status: r.status,
          payment_status: r.payment_status || null,
          amount: r.amount_total,
          currency: r.currency,
        })) as OrderRow[];
        if (mounted) {
          setItems((prev) => {
            if (!cursor) {
              return orders;
            }
            return [...(prev ?? []), ...orders];
          });
          if (!cursor) {
            setItemMap({});
            setSlugMap({});
            setExpanded({});
          }
          setTotal(resp.count || orders.length);
          setHasMore(Boolean(resp.hasMore));
          setNextCursor(resp.nextCursor ?? null);
          const sp: Record<string, string> = {};
          if (statusFilter) sp.status = statusFilter;
          if (q) sp.q = q;
          if (sort) sp.sort = sort;
          if (cursor) sp.cursor = cursor;
          sp.page_size = String(limit);
          setSearchParams(sp, { replace: true });
        }
      } catch (e: any) {
        if (mounted) setError(e?.message || "Не удалось загрузить заказы");
        if (mounted) setItems([]);
        if (mounted) setItemMap({});
        if (mounted) setSlugMap({});
        if (mounted) setTotal(0);
        if (mounted) setHasMore(false);
        if (mounted) setNextCursor(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user, statusFilter, q, sort, cursor, limit, setSearchParams]);

  const rows = useMemo(() => (items ?? []).map(normalize), [items]);

  if (loading) return <div className="p-4 text-sm text-[var(--text-dim)]">Загрузка…</div>;
  if (!rows.length)
    return (
      <div className="p-4 text-sm text-[var(--text-dim)]">
        {error ? error : "У вас пока нет заказов"}
      </div>
    );

  const fmtC = (c?: string) => new Intl.NumberFormat(undefined, { style: "currency", currency: c || rows[0]?.currency || "EUR" });
  const dtFmt = (d: Date | null) => (d ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(d) : "");

  // Привлекательные ярлыки и цвета для статусов
  const statusLabel = (s?: string | null) => {
    const v = String(s || '').toLowerCase();
    if (v === 'pending') return 'в ожидании';
    if (v === 'processing') return 'обрабатывается';
    if (v === 'succeeded' || v === 'paid') return 'оплачено';
    if (v === 'failed') return 'ошибка оплаты';
    if (v === 'cancelled' || v === 'canceled') return 'отменён';
    if (v === 'authorized') return 'холд';
    if (v === 'requires_action') return 'требует подтверждения';
    if (v === 'refunded') return 'возврат';
    return v || '-';
  };
  const statusClass = (s?: string | null) => {
    const v = String(s || '').toLowerCase();
    if (v === 'succeeded' || v === 'paid') return 'bg-emerald-500/15 text-emerald-300';
    if (v === 'failed') return 'bg-rose-500/15 text-rose-300';
    if (v === 'requires_action') return 'bg-amber-500/15 text-amber-300';
    if (v === 'processing' || v === 'authorized') return 'bg-sky-500/15 text-sky-300';
    if (v === 'cancelled' || v === 'canceled') return 'bg-white/10 text-neutral-300';
    return 'bg-white/10 text-neutral-200';
  };

  return (
    <div className="overflow-x-auto">
      <div className="mb-3 flex flex-wrap items-end gap-2 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-[var(--text-dim)]">Статус</span>
          <select
            className="bg-transparent border border-white/10 rounded px-2 py-1"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCursor(null); }}
          >
            <option value="">Любой</option>
            <option value="pending">pending</option>
            <option value="processing">processing</option>
            <option value="succeeded">succeeded</option>
            <option value="failed">failed</option>
            <option value="cancelled">cancelled</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[var(--text-dim)]">Поиск (ID)</span>
          <input
            className="bg-transparent border border-white/10 rounded px-2 py-1"
            placeholder="Введите ID заказа"
            value={q}
            onChange={(e) => { setQ(e.target.value); setCursor(null); }}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[var(--text-dim)]">Сортировка</span>
          <select
            className="bg-transparent border border-white/10 rounded px-2 py-1"
            value={sort}
            onChange={(e) => { setSort(e.target.value); setCursor(null); }}
          >
            <option value="created_at desc">Дата ↓</option>
            <option value="created_at asc">Дата ↑</option>
            <option value="amount_total desc">Сумма ↓</option>
            <option value="amount_total asc">Сумма ↑</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[var(--text-dim)]">Лимит</span>
          <select
            className="bg-transparent border border-white/10 rounded px-2 py-1"
            value={limit}
            onChange={(e) => { setLimit(parseInt(e.target.value, 10) || 10); setCursor(null); }}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </label>
        <div className="ml-auto flex flex-col items-end gap-1 text-xs text-[var(--text-dim)]">
          <div>Показано {rows.length} из {total}</div>
          <div className="flex items-center gap-2">
            {cursor ? (
              <button
                className="text-xs rounded-md border border-white/10 px-2 py-1 disabled:opacity-50"
                onClick={() => setCursor(null)}
              >
                Сбросить пагинацию
              </button>
            ) : null}
            {hasMore ? (
              <button
                className="text-xs rounded-md border border-white/10 px-2 py-1 disabled:opacity-50"
                disabled={!nextCursor || loading}
                onClick={() => {
                  if (nextCursor) setCursor(nextCursor);
                }}
              >
                Загрузить ещё →
              </button>
            ) : (
              <span className="text-[var(--text-dim)]">Все заказы загружены</span>
            )}
          </div>
        </div>
      </div>
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="text-left text-sm text-[var(--text-dim)] border-b border-border">
            <th className="py-2 pr-4">№ заказа</th>
            <th className="py-2 pr-4">Дата</th>
            <th className="py-2 pr-4">Статус</th>
            <th className="py-2 pr-4">Сумма</th>
            <th className="py-2 pr-4">Действия</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const orderItems = itemMap[r.oid] || [];
            const itemsSum = orderItems.reduce(
              (acc, it) => acc + Number(it.total ?? (Number(it.unit_price || 0) * Number(it.qty || 0))),
              0
            );
            const orderSum = Number(r.amount || 0);
            const diff = orderSum - itemsSum;
            const isOpen = !!expanded[r.oid];
            const onToggle = async () => {
              // load items on first expand
              if (!expanded[r.oid] && !itemMap[r.oid]) {
                try {
                  const detail = await getOrder(r.oid);
                  const listRaw = detail.items || [];
                  const list: OrderItemRow[] = listRaw.map((it) => ({
                    order_id: r.oid,
                    product_id: String(it.product_id || ""),
                    title: it.title,
                    qty: Number(it.qty || 0),
                    unit_price: Number(it.unit_price || 0),
                    total: Number(it.total || 0),
                  }));
                  setItemMap((m) => ({ ...m, [r.oid]: list }));
                  const productIds = Array.from(new Set(list.map((it) => String(it.product_id || "")).filter(Boolean)));
                  if (productIds.length) {
                    const prods = await getProductsByIds(productIds);
                    const m: Record<string, string> = {};
                    for (const p of prods) m[String(p.id)] = String(p.slug || "");
                    setSlugMap((sm) => ({ ...sm, ...m }));
                  }
                } catch {
                  // ignore, UI will show empty
                }
              }
              setExpanded((m) => ({ ...m, [r.oid]: !m[r.oid] }));
            };

            const canPay = r.status === "pending" || r.status === "processing";
            const canCancel = r.status === "pending";
            const isPaying = payingId === r.oid;
            const isCancelling = cancellingId === r.oid;
            const pay = r.payment_status || null;
            const showPayBadge = !!pay && !(
              ((pay === 'succeeded' || pay === 'paid') && r.status === 'succeeded') ||
              (pay === 'authorized' && r.status === 'processing')
            );

            const doPay = async () => {
              try {
                setPayingId(r.oid);
                // первый шаг: authorized (холд)
                await confirmPayment(String(r.oid), "authorized");
                // второй шаг: capture (используем отсутствующий сценарий => backend интерпретирует как authorized по умолчанию,
                // но нам нужен именно успешный платёж. Вызываем без сценария, чтобы сервер применил дефолтный флоу.)
                await confirmPayment(String(r.oid), "succeeded");
                // локально обновим статус
                setItems((list) => (list || []).map((x) => (String(x.id || x.order_id) === r.oid ? { ...x, status: "succeeded", payment_status: "succeeded" } : x)));
                toast.success("Оплата прошла успешно");
              } catch (e: any) {
                const msg = e?.message || "Оплата не удалась";
                setError(msg);
                toast.error(msg);
              } finally {
                setPayingId(null);
              }
            };

            const doCancel = async () => {
              try {
                setCancellingId(r.oid);
                await cancelOrder(String(r.oid));
                setItems((list) => (list || []).map((x) => (String(x.id || x.order_id) === r.oid ? { ...x, status: "cancelled" } : x)));
                toast.success("Заказ отменён");
              } catch (e: any) {
                const msg = e?.message || "Отмена не удалась";
                setError(msg);
                toast.error(msg);
              } finally {
                setCancellingId(null);
              }
            };
            return (
              <Fragment key={`frag-${r.oid || i}`}>
                <tr key={`order-${r.oid || i}`} className="border-b border-white/10">
                  <td className="py-2 pr-4 font-medium">{r.orderNo}</td>
                  <td className="py-2 pr-4">{dtFmt(r.date)}</td>
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={"inline-flex rounded-full px-2 py-0.5 text-xs " + statusClass(r.status)}
                      >
                        {statusLabel(r.status)}
                      </span>
                      {showPayBadge && (
                        <span
                          className={"inline-flex rounded-full px-2 py-0.5 text-xs " + statusClass(r.payment_status)}
                          title="Статус платежа"
                        >
                          {statusLabel(r.payment_status)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    {fmtC(r.currency).format(orderSum)}
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <button
                        className="text-xs rounded-md border border-white/10 px-2 py-1 hover:bg-white/10 disabled:opacity-50"
                        onClick={onToggle}
                        disabled={isPaying || isCancelling}
                      >
                        {isOpen ? "Скрыть позиции" : orderItems.length > 0 ? `Показать позиции (${orderItems.length})` : "Показать позиции"}
                      </button>
                      {canPay && (
                        <button
                          className="text-xs rounded-md border border-emerald-500/30 px-2 py-1 hover:bg-emerald-500/10 disabled:opacity-50"
                          onClick={doPay}
                          disabled={isPaying || isCancelling}
                        >
                          {isPaying ? "Оплата…" : "Оплатить"}
                        </button>
                      )}
                      {canCancel && (
                        <button
                          className="text-xs rounded-md border border-rose-500/30 px-2 py-1 hover:bg-rose-500/10 disabled:opacity-50"
                          onClick={doCancel}
                          disabled={isPaying || isCancelling}
                        >
                          {isCancelling ? "Отмена…" : "Отменить"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                {orderItems.length > 0 && isOpen && (
                  <tr className="border-b border-white/10">
                    <td colSpan={5} className="py-2 pr-4">
                      <div className="text-xs text-[var(--text-dim)] mb-1">Позиции</div>
                      <div className="text-xs text-[var(--text-dim)] mb-1">Товары</div>
                      <ul className="space-y-1">
                        {orderItems.map((it, idx) => (
                          <li key={`${it.product_id || idx}`} className="flex items-center justify-between text-sm">
                            <div className="truncate">
                              {slugMap[String(it.product_id || "")] ? (
                                <Link
                                  to={`/product/${slugMap[String(it.product_id || "")]}`}
                                  className="text-neutral-200 underline-offset-2 hover:underline"
                                >
                                  {it.title || it.product_id}
                                </Link>
                              ) : (
                                <span className="text-neutral-200">{it.title || it.product_id}</span>
                              )}
                              <span className="text-[var(--text-dim)]"> × {it.qty ?? 1}</span>
                              <span className="text-[var(--text-dim)]"> @ {fmtC(r.currency).format(Number(it.unit_price || 0))}</span>
                            </div>
                            <div className="whitespace-nowrap ml-4">
                              {fmtC(r.currency).format(Number(it.total ?? (Number(it.unit_price || 0) * Number(it.qty || 0))))}
                            </div>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3 flex justify-end">
                        <div className="text-sm text-right space-y-0.5">
                          <div className="text-[var(--text-dim)]">
                            Итого по позициям: <span className="text-neutral-200">{fmtC(r.currency).format(itemsSum)}</span>
                          </div>
                          <div className="text-[var(--text-dim)]">
                            Сумма заказа: <span className="text-neutral-200">{fmtC(r.currency).format(orderSum)}</span>
                          </div>
                          {Math.abs(diff) > 0.009 && (
                            <div className="text-[var(--text-dim)]">
                              Разница: <span className={diff >= 0 ? "text-emerald-300" : "text-rose-300"}>{fmtC(r.currency).format(diff)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
