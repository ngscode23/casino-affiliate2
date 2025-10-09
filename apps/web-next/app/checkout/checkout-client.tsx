"use client";

// moved from page.tsx to keep the page a Server Component
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useCart } from "@shared/ecom/lib/cart";
import { getProductBySlug, placeOrder } from "@shared/ecom/api/client";
import type { PlaceOrderCheckout } from "@shared/ecom/api/client";
import { getValidAccessToken } from "@shared/lib/auth";
import { HAS_SUPABASE } from "@shared/config";

const StripeElementsProvider = dynamic(
  () => import("@/components/stripe/StripeElementsProvider").then((m) => m.StripeElementsProvider),
  { ssr: false },
);
const CheckoutPaymentForm = dynamic(() => import("./payment-form").then((m) => m.CheckoutPaymentForm), {
  ssr: false,
});

function formatPrice(value: number, currency = "EUR") {
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

type CheckoutSnapshot = { items: ReturnType<typeof useCart>["items"]; subtotal: number; currency: string };
type CheckoutStep = "form" | "payment" | "complete";

const REQUIRE_AUTH_FOR_CHECKOUT = true;
const AUTO_REDIRECT_EMPTY_CART = false;

export default function CheckoutClient() {
  const router = useRouter();
  const { items, subtotal, clear } = useCart();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>("form");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<CheckoutSnapshot | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isStripeProcessing, setIsStripeProcessing] = useState(false);
  const [isAuthVerified, setIsAuthVerified] = useState(
    !HAS_SUPABASE || !REQUIRE_AUTH_FOR_CHECKOUT,
  );
  const isCartEmpty = items.length === 0;
  const orderCurrency = "EUR";

  useEffect(() => {
    if (orderId) return;
    if (!AUTO_REDIRECT_EMPTY_CART) return;
    if (typeof window !== "undefined" && items.length === 0) {
      router.replace("/cart");
    }
  }, [items.length, router, orderId]);

  useEffect(() => {
    if (!HAS_SUPABASE || orderId || !REQUIRE_AUTH_FOR_CHECKOUT || isAuthVerified) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getValidAccessToken();
        if (!cancelled && token) {
          setIsAuthVerified(true);
          return;
        }
      } catch {}

      try {
        const response = await fetch("/api/auth/session", {
          method: "GET",
          headers: { accept: "application/json" },
          cache: "no-store",
          credentials: "include",
        });
        if (!cancelled && response.ok) {
          setIsAuthVerified(true);
          return;
        }
      } catch {}

      if (!cancelled) {
        router.replace(`/login?redirect=${encodeURIComponent("/checkout")}`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId, router, isAuthVerified]);

  async function createPaymentIntent(order: string, accessToken: string | null) {
    const headers = new Headers({ "content-type": "application/json", accept: "application/json" });
    if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);
    const response = await fetch("/api/payments/create", {
      method: "POST",
      headers,
      body: JSON.stringify({ order_id: order }),
    });
    const json = await response.json().catch(() => ({} as any));
    if (!response.ok || !json?.ok || !json?.client_secret) {
      const message = json?.message || json?.error || `Failed to create payment intent (${response.status})`;
      throw new Error(message);
    }
    return json.client_secret as string;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!items.length || isSubmitting) return;

    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const snapshotCopy = { items: items.map((row) => ({ ...row })), subtotal, currency: orderCurrency } as CheckoutSnapshot;

    try {
      let accessToken: string | null = null;
      if (HAS_SUPABASE && REQUIRE_AUTH_FOR_CHECKOUT) {
        accessToken = await getValidAccessToken().catch(() => null);
        if (!accessToken && !isAuthVerified) {
          setError("Authenticating session, please retry.");
          setIsSubmitting(false);
          return;
        }
      }

      let normalizedItems: Array<{ id: string; qty: number }> = [];

      if (HAS_SUPABASE) {
        const mapped = await Promise.all(
          items.map(async (row) => {
            const rawId = String(row.product?.id ?? row.id ?? "");
            if (uuidPattern.test(rawId)) {
              return row.qty > 0 ? { id: rawId, qty: row.qty } : null;
            }
            const slug = String(row.product?.slug ?? "");
            if (!slug || row.qty <= 0) return null;
            try {
              const prod = await getProductBySlug(slug);
              if (prod && uuidPattern.test(prod.id)) {
                return { id: prod.id, qty: row.qty };
              }
            } catch {}
            return null;
          }),
        );
        normalizedItems = mapped.filter((e): e is { id: string; qty: number } => Boolean(e));
      } else {
        normalizedItems = items.filter((row) => row.qty > 0).map((row) => ({ id: String(row.id), qty: row.qty }));
      }

      if (!normalizedItems.length) {
        throw new Error("Could not match cart items with products. Please refresh and try again.");
      }

      const contactFullName = formData.get("fullName")?.toString().trim() ?? "";
      const contactEmail = formData.get("email")?.toString().trim() ?? "";
      const shippingAddress = formData.get("address")?.toString().trim() ?? "";
      const shippingCity = formData.get("city")?.toString().trim() ?? "";
      const shippingPostal = formData.get("zip")?.toString().trim() ?? "";
      const shippingNotes = formData.get("notes")?.toString().trim() ?? "";

      const checkout: PlaceOrderCheckout = {};
      if (contactFullName || contactEmail) {
        checkout.contact = {
          ...(contactFullName ? { fullName: contactFullName } : {}),
          ...(contactEmail ? { email: contactEmail } : {}),
        };
      }
      if (shippingAddress || shippingCity || shippingPostal || shippingNotes) {
        checkout.shipping = {
          ...(shippingAddress ? { address: shippingAddress } : {}),
          ...(shippingCity ? { city: shippingCity } : {}),
          ...(shippingPostal ? { postalCode: shippingPostal } : {}),
          ...(shippingNotes ? { notes: shippingNotes } : {}),
        };
      }

      const checkoutPayload = checkout.contact || checkout.shipping ? checkout : undefined;
      const result = await placeOrder(normalizedItems, { currency: orderCurrency, checkout: checkoutPayload });
      const createdOrderId = result.order_id;

      if (!HAS_SUPABASE) {
        setSnapshot(snapshotCopy);
        setOrderId(createdOrderId);
        setCheckoutStep("complete");
        clear();
        (event.currentTarget as HTMLFormElement).reset();
        return;
      }

      const secret = await createPaymentIntent(createdOrderId, accessToken);
      setSnapshot(snapshotCopy);
      setOrderId(createdOrderId);
      setClientSecret(secret);
      setPaymentError(null);
      setCheckoutStep("payment");
      (event.currentTarget as HTMLFormElement).reset();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to place order.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const handlePaymentSuccess = () => {
    setPaymentError(null);
    setIsStripeProcessing(false);
    setCheckoutStep("complete");
    clear();
  };

  const handlePaymentError = (message: string) => {
    setIsStripeProcessing(false);
    setPaymentError(message || null);
  };

  if (checkoutStep === "complete" && orderId && snapshot) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-2 text-center sm:text-left">
          <h1 className="text-3xl font-semibold sm:text-4xl">Thank you for your order</h1>
          <p className="text-sm text-neutral-600">
            Order ID: <span className="font-mono text-neutral-800">{orderId}</span>
          </p>
          <p className="text-sm text-neutral-600">We&apos;ve recorded your payment request and will email updates shortly.</p>
        </div>
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-lg font-semibold text-slate-900">Order summary</div>
          <ul className="space-y-3">
            {snapshot.items.map((row) => (
              <li key={row.id} className="flex items-start justify-between gap-3 text-sm text-neutral-600">
                <span className="flex-1 truncate" title={row.product.title}>
                  {row.product.title} x {row.qty}
                </span>
                <span className="text-right font-medium text-slate-900">{formatPrice(row.lineTotal, snapshot.currency)}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-sm text-neutral-600">
            <span>Total</span>
            <span className="font-semibold text-slate-900">{formatPrice(snapshot.subtotal, snapshot.currency)}</span>
          </div>
          <div className="text-xs text-neutral-500">Keep this page for your records.</div>
        </section>
        <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
          <Link href="/products" className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-slate-800">
            Continue shopping
          </Link>
          <Link href="/account/orders" className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
            View orders
          </Link>
        </div>
      </div>
    );
  }

  if (checkoutStep === "payment" && orderId && snapshot && clientSecret) {
    const amountLabel = formatPrice(snapshot.subtotal, snapshot.currency);
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <div className="space-y-2 text-center sm:text-left">
          <h1 className="text-3xl font-semibold sm:text-4xl">Complete your payment</h1>
          <p className="text-sm text-neutral-600">Order ID: <span className="font-mono text-neutral-800">{orderId}</span></p>
        </div>
        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <StripeElementsProvider clientSecret={clientSecret}>
            <CheckoutPaymentForm
              orderId={orderId}
              amountLabel={amountLabel}
              onProcessing={() => {
                setIsStripeProcessing(true);
                setPaymentError(null);
              }}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
            />
          </StripeElementsProvider>
          {paymentError ? <p className="text-sm text-rose-500">{paymentError}</p> : null}
          {isStripeProcessing ? <p className="text-sm text-neutral-600">Waiting for confirmation...</p> : null}
        </section>
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-lg font-semibold text-slate-900">Order summary</div>
          <ul className="space-y-3">
            {snapshot.items.map((row) => (
              <li key={row.id} className="flex items-start justify-between gap-3 text-sm text-neutral-600">
                <span className="flex-1 truncate" title={row.product.title}>
                  {row.product.title} x {row.qty}
                </span>
                <span className="text-right font-medium text-slate-900">{formatPrice(row.lineTotal, snapshot.currency)}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-sm text-neutral-600">
            <span>Total</span>
            <span className="font-semibold text-slate-900">{amountLabel}</span>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold sm:text-4xl">Checkout</h1>
          <p className="text-sm text-neutral-600">Confirm your details and place the order securely.</p>
        </div>
        <Link href="/cart" className="text-sm text-blue-600 transition hover:text-blue-500">Back to cart</Link>
      </div>
      {isCartEmpty ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-neutral-600">Your cart is empty. Add items before checking out.</p>
          <Link href="/products" className="mt-3 inline-flex text-sm text-blue-600 hover:underline">Explore products</Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          <form className="space-y-5 md:col-span-2" onSubmit={handleSubmit} noValidate>
            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-lg font-semibold text-slate-900">Contact</div>
              <label className="grid gap-2 text-sm text-neutral-600">
                Full name
                <input className="h-11 rounded-lg border border-slate-200 px-3 text-sm shadow-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200" name="fullName" placeholder="Ada Lovelace" autoComplete="name" required disabled={isSubmitting} />
              </label>
              <label className="grid gap-2 text-sm text-neutral-600">
                Email
                <input className="h-11 rounded-lg border border-slate-200 px-3 text-sm shadow-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200" type="email" name="email" placeholder="you@example.com" autoComplete="email" required disabled={isSubmitting} />
              </label>
            </section>
            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-lg font-semibold text-slate-900">Shipping</div>
              <label className="grid gap-2 text-sm text-neutral-600">
                Address
                <input className="h-11 rounded-lg border border-slate-200 px-3 text-sm shadow-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200" name="address" placeholder="123 Main Street" autoComplete="street-address" required disabled={isSubmitting} />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm text-neutral-600">
                  City
                  <input className="h-11 rounded-lg border border-slate-200 px-3 text-sm shadow-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200" name="city" autoComplete="address-level2" required disabled={isSubmitting} />
                </label>
                <label className="grid gap-2 text-sm text-neutral-600">
                  Postal code
                  <input className="h-11 rounded-lg border border-slate-200 px-3 text-sm shadow-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200" name="zip" autoComplete="postal-code" required disabled={isSubmitting} />
                </label>
              </div>
              <label className="grid gap-2 text-sm text-neutral-600">
                Notes (optional)
                <textarea className="min-h-[120px] rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200" name="notes" placeholder="Delivery instructions" disabled={isSubmitting} />
              </label>
            </section>
            <button type="submit" className="inline-flex h-11 items-center justify-center rounded-lg bg-slate-900 px-6 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70" disabled={isSubmitting}>
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
