"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@shared/ecom/lib/cart";
import { getProductBySlug, placeOrder } from "@shared/ecom/api/client";
import { getValidAccessToken } from "@shared/lib/auth";

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

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clear } = useCart();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const empty = items.length === 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!items.length || isSubmitting) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const token = await getValidAccessToken();
      if (!token) {
        router.replace(`/login?redirect=${encodeURIComponent("/checkout")}`);
        return;
      }

      const mapped = await Promise.all(
        items.map(async (row) => {
          const rawId = String(row.product.id || row.id || "");
          if (uuidPattern.test(rawId)) {
            return { id: rawId, qty: row.qty };
          }
          const slug = String(row.product.slug || "");
          if (!slug) return null;
          const prod = await getProductBySlug(slug);
          if (prod && uuidPattern.test(prod.id)) {
            return { id: prod.id, qty: row.qty };
          }
          return null;
        })
      );

      const payload = mapped.filter((entry): entry is { id: string; qty: number } => Boolean(entry));
      if (!payload.length) {
        throw new Error("Could not match cart items with products. Please refresh and try again.");
      }

      await placeOrder(payload, "EUR");
      clear();
      router.push("/account/orders");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to place order.";
      if (message.toLowerCase().includes("not authenticated")) {
        router.replace(`/login?redirect=${encodeURIComponent("/checkout")}`);
        return;
      }
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold sm:text-4xl">Checkout</h1>
          <p className="text-sm text-neutral-600">Confirm your details and place the order securely.</p>
        </div>
        <Link href="/cart" className="text-sm text-blue-600 transition hover:text-blue-500">
          Back to cart
        </Link>
      </div>

      {empty ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-neutral-600">Your cart is empty. Add items before checking out.</p>
          <Link href="/products" className="mt-3 inline-flex text-sm text-blue-600 hover:underline">
            Explore products
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          <form className="space-y-5 md:col-span-2" onSubmit={handleSubmit} noValidate>
            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-lg font-semibold text-slate-900">Contact</div>
              <label className="grid gap-2 text-sm text-neutral-600">
                Full name
                <input
                  className="h-11 rounded-lg border border-slate-200 px-3 text-sm shadow-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  name="fullName"
                  placeholder="Ada Lovelace"
                  autoComplete="name"
                  required
                  disabled={isSubmitting}
                />
              </label>
              <label className="grid gap-2 text-sm text-neutral-600">
                Email
                <input
                  className="h-11 rounded-lg border border-slate-200 px-3 text-sm shadow-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  disabled={isSubmitting}
                />
              </label>
            </section>

            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-lg font-semibold text-slate-900">Shipping</div>
              <label className="grid gap-2 text-sm text-neutral-600">
                Address
                <input
                  className="h-11 rounded-lg border border-slate-200 px-3 text-sm shadow-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  name="address"
                  placeholder="123 Main Street"
                  autoComplete="street-address"
                  required
                  disabled={isSubmitting}
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm text-neutral-600">
                  City
                  <input
                    className="h-11 rounded-lg border border-slate-200 px-3 text-sm shadow-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    name="city"
                    autoComplete="address-level2"
                    required
                    disabled={isSubmitting}
                  />
                </label>
                <label className="grid gap-2 text-sm text-neutral-600">
                  Postal code
                  <input
                    className="h-11 rounded-lg border border-slate-200 px-3 text-sm shadow-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    name="zip"
                    autoComplete="postal-code"
                    required
                    disabled={isSubmitting}
                  />
                </label>
              </div>
              <label className="grid gap-2 text-sm text-neutral-600">
                Notes (optional)
                <textarea
                  className="min-h-[120px] rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  name="notes"
                  placeholder="Delivery instructions"
                  disabled={isSubmitting}
                />
              </label>
            </section>

            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-slate-900 px-6 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Placing order..." : "Place order"}
            </button>
          </form>

          <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-lg font-semibold text-slate-900">Summary</div>
            <ul className="space-y-3">
              {items.map((row) => (
                <li key={row.id} className="flex items-start justify-between gap-3 text-sm text-neutral-600">
                  <span className="flex-1 truncate" title={row.product.title}>
                    {row.product.title} x {row.qty}
                  </span>
                  <span className="text-right font-medium text-slate-900">{formatPrice(row.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-sm text-neutral-600">
              <span>Subtotal</span>
              <span className="font-semibold text-slate-900">{formatPrice(subtotal)}</span>
            </div>
            <p className="text-xs text-neutral-500">Taxes and shipping are calculated at fulfillment.</p>
            {error ? <p className="text-sm text-rose-500">{error}</p> : null}
          </aside>
        </div>
      )}
    </div>
  );
}