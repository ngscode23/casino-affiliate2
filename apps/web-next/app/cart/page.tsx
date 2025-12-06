"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@shared/ecom/lib/cart";
import { CartAnalytics } from "@/components/analytics/EcommerceEvents";

function formatPrice(value: number, currency = "USD") {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 2,
    }).format(value ?? 0);
  } catch {
    return `${value?.toFixed?.(2) ?? "0.00"} ${currency}`;
  }
}

export default function CartPage() {
  const { items, subtotal, update, remove, clear } = useCart();
  const empty = items.length === 0;
  const cartCurrency = "USD";
  const analyticsItems = items.map((row) => ({
    id: row.product.id,
    title: row.product.title,
    price: row.product.price,
    currency: cartCurrency,
    category: row.product.category,
    quantity: row.qty,
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <CartAnalytics items={analyticsItems} currency={cartCurrency} />
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold sm:text-4xl">Cart</h1>
        {!empty ? (
          <button
            type="button"
            onClick={clear}
            className="text-sm text-blue-600 transition hover:text-blue-500"
          >
            Clear cart
          </button>
        ) : null}
      </div>

      {empty ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-neutral-600">Your cart is empty.</p>
          <Link href="/products" className="mt-2 inline-flex text-sm text-blue-600 hover:underline">
            Browse products
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-4 md:col-span-2">
            {items.map((row) => {
              const primaryImage = row.product.imageUrl || row.product.images?.[0] || "/og.svg";
              return (
                <div
                  key={row.id}
                  className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="relative h-20 w-24 overflow-hidden rounded-lg bg-neutral-100">
                    <Image
                      src={primaryImage}
                      alt={row.product.title}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-1 font-medium text-slate-900" title={row.product.title}>
                      {row.product.title}
                    </div>
                    <div className="text-sm text-neutral-500">{formatPrice(row.product.price || 0)} each</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      aria-label={`Quantity for ${row.product.title}`}
                      type="number"
                      min={1}
                      value={row.qty}
                      onChange={(event) => {
                        const next = Number(event.currentTarget.value);
                        if (Number.isFinite(next) && next > 0) {
                          update(row.id, Math.floor(next));
                        } else {
                          update(row.id, 1);
                        }
                      }}
                      className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                    <div className="w-24 text-right font-medium text-slate-900">
                      {formatPrice(row.lineTotal)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(row.id)}
                    className="rounded-md border border-slate-200 px-3 py-1 text-xs text-neutral-600 transition hover:bg-slate-100"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>

          <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-lg font-semibold text-slate-900">Summary</div>
            <div className="flex items-center justify-between text-sm">
              <span>Subtotal</span>
              <span className="font-medium text-slate-900">{formatPrice(subtotal)}</span>
            </div>
            <div className="text-xs text-neutral-500">
              Taxes and shipping are calculated at checkout.
            </div>
            <Link
              href="/checkout"
              className="inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Checkout
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
