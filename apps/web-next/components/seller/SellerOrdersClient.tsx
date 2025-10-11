"use client";

import { useState } from "react";
import clsx from "clsx";

type SellerOrder = {
  order_id: string;
  created_at: string;
  status: string;
  items_count: number;
  seller_revenue: number;
  currency?: string | null;
};

type SellerOrdersClientProps = {
  orders: SellerOrder[];
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: currency || "EUR",
  }).format(Number(amount) || 0);
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString("ru-RU");
  } catch {
    return value;
  }
}

const STATUS_COLORS: Record<string, string> = {
  paid: "bg-emerald-500/20 text-emerald-200 border-emerald-400/40",
  pending: "bg-amber-500/20 text-amber-200 border-amber-400/40",
  cancelled: "bg-rose-500/20 text-rose-200 border-rose-400/40",
};

export default function SellerOrdersClient({ orders }: SellerOrdersClientProps) {
  const [sortKey, setSortKey] = useState<"created_at" | "revenue">("created_at");

  const sortedOrders = [...orders].sort((a, b) => {
    if (sortKey === "revenue") {
      return Number(b.seller_revenue ?? 0) - Number(a.seller_revenue ?? 0);
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="space-y-6 text-white">
      <header className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-neutral-900/70 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Заказы</h1>
          <p className="text-sm text-white/60">Сводка заказов, в которых есть ваши товары.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/60">
          Сортировать:
          <button
            type="button"
            onClick={() => setSortKey("created_at")}
            className={clsx(
              "rounded-full border px-3 py-1 transition",
              sortKey === "created_at"
                ? "border-white/30 bg-white/15 text-white"
                : "border-white/10 text-white/70 hover:border-white/20",
            )}
          >
            по дате
          </button>
          <button
            type="button"
            onClick={() => setSortKey("revenue")}
            className={clsx(
              "rounded-full border px-3 py-1 transition",
              sortKey === "revenue"
                ? "border-white/30 bg-white/15 text-white"
                : "border-white/10 text-white/70 hover:border-white/20",
            )}
          >
            по выручке
          </button>
        </div>
      </header>

      <section className="rounded-2xl border border-white/10 bg-neutral-900/60">
        <div className="grid grid-cols-1 divide-y divide-white/5">
          {sortedOrders.length === 0 ? (
            <div className="px-4 py-6 text-sm text-white/50">Заказов ещё нет.</div>
          ) : (
            sortedOrders.map((order) => {
              const badge = STATUS_COLORS[order.status] ?? "bg-white/10 text-white/70 border-white/15";
              return (
                <div key={order.order_id} className="grid gap-3 px-4 py-4 text-sm text-white/80 md:grid-cols-[1fr_auto]">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-base font-semibold text-white">#{order.order_id}</span>
                      <span className={clsx("rounded-full border px-2 py-0.5 text-xs uppercase tracking-widest", badge)}>
                        {order.status}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-white/50">
                      <span>{formatDate(order.created_at)}</span>
                      <span>Позиции: {order.items_count ?? 0}</span>
                      <span>
                        Ваша выручка: {formatCurrency(order.seller_revenue ?? 0, order.currency ?? "EUR")}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-end text-xs text-white/50">
                    Заказ закрыт в статусе: <span className="ml-2 text-white/70">{order.status}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

