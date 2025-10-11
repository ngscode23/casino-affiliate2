import Link from "next/link";

type SellerRecord = {
  id: string;
  display_name: string;
  slug: string | null;
  status: string;
  contact_email: string | null;
};

type SellerProduct = {
  product_id: string;
  slug: string | null;
  title: string;
  status: string;
  price: number;
  currency: string;
  qty_available: number;
  created_at: string;
  updated_at: string;
};

type SellerSummary = {
  product_id: string;
  slug: string | null;
  title: string;
  units_sold: number;
  gross_revenue: number;
  last_order_at: string | null;
  currency?: string | null;
};

type SellerOrder = {
  order_id: string;
  created_at: string;
  status: string;
  items_count: number;
  seller_revenue: number;
  currency?: string | null;
};

type SellerDashboardProps = {
  seller: SellerRecord | null;
  products: SellerProduct[];
  summary: SellerSummary[];
  orders: SellerOrder[];
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: currency || "EUR",
    maximumFractionDigits: 2,
  }).format(amount ?? 0);
}

function formatDate(value: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("ru-RU");
  } catch {
    return value;
  }
}

export default function SellerDashboard({ seller, products, summary, orders }: SellerDashboardProps) {
  const activeProducts = products.filter((item) => item.status === "active");
  const totalRevenue = summary.reduce((sum, row) => sum + Number(row.gross_revenue ?? 0), 0);
  const totalUnits = summary.reduce((sum, row) => sum + Number(row.units_sold ?? 0), 0);
  const primaryCurrency =
    summary.find((row) => row.currency)?.currency ??
    orders.find((order) => order.currency)?.currency ??
    products[0]?.currency ??
    "EUR";

  return (
    <div className="space-y-6 text-white">
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs uppercase tracking-widest text-white/40">Продавец</div>
          <div className="mt-2 text-lg font-semibold text-white">{seller?.display_name ?? "—"}</div>
          <div className="mt-2 text-sm text-white/60">
            Статус:{" "}
            <span
              className={
                seller?.status === "active"
                  ? "text-emerald-300"
                  : seller?.status === "pending"
                    ? "text-amber-300"
                    : "text-red-300"
              }
            >
              {seller?.status ?? "неизвестно"}
            </span>
          </div>
          {seller?.contact_email ? (
            <div className="mt-2 text-xs text-white/50">{seller.contact_email}</div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs uppercase tracking-widest text-white/40">Активные товары</div>
          <div className="mt-2 text-3xl font-semibold text-white">{activeProducts.length}</div>
          <div className="mt-1 text-xs text-white/50">
            Всего товаров: <span className="text-white/70">{products.length}</span>
          </div>
          <Link
            href="/seller/products"
            className="mt-3 inline-flex items-center gap-2 text-sm text-sky-300 underline underline-offset-4 hover:text-sky-200"
          >
            Управлять товарами
          </Link>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs uppercase tracking-widest text-white/40">Продажи</div>
          <div className="mt-2 text-3xl font-semibold text-white">
            {formatCurrency(totalRevenue, primaryCurrency ?? "EUR")}
          </div>
          <div className="mt-1 text-xs text-white/50">
            Заказов: <span className="text-white/70">{orders.length}</span> · Единиц:{" "}
            <span className="text-white/70">{totalUnits}</span>
          </div>
          <Link
            href="/seller/orders"
            className="mt-3 inline-flex items-center gap-2 text-sm text-sky-300 underline underline-offset-4 hover:text-sky-200"
          >
            Смотреть заказы
          </Link>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/60">Топ товаров</h2>
            <Link href="/seller/products" className="text-xs text-sky-300 hover:text-sky-200">
              Все товары →
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {summary.length === 0 ? (
              <p className="text-sm text-white/50">Продаж пока нет.</p>
            ) : (
              summary.slice(0, 5).map((row) => (
                <div
                  key={row.product_id}
                  className="rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-sm text-white/80"
                >
                  <div className="font-medium text-white">
                    {row.title}
                    {row.slug ? <span className="ml-2 text-xs text-white/40">/{row.slug}</span> : null}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-white/50">
                    <span>Продано: {row.units_sold ?? 0}</span>
                    <span>
                      Выручка: {formatCurrency(row.gross_revenue ?? 0, row.currency ?? primaryCurrency ?? "EUR")}
                    </span>
                    <span>Последний заказ: {formatDate(row.last_order_at)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/60">Последние заказы</h2>
            <Link href="/seller/orders" className="text-xs text-sky-300 hover:text-sky-200">
              Все заказы →
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {orders.length === 0 ? (
              <p className="text-sm text-white/50">Заказов пока нет.</p>
            ) : (
              orders.slice(0, 5).map((order) => (
                <div
                  key={order.order_id}
                  className="rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-sm text-white/80"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white/90">#{order.order_id}</span>
                    <span className="text-xs uppercase tracking-widest text-white/50">{order.status}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-white/50">
                    <span>{formatDate(order.created_at)}</span>
                    <span>Позиции: {order.items_count ?? 0}</span>
                    <span>
                      Ваша доля: {formatCurrency(order.seller_revenue ?? 0, order.currency ?? primaryCurrency ?? "EUR")}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
