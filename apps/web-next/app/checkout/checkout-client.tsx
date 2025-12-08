"use client";

// moved from page.tsx to keep the page a Server Component
import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { useCart } from "@shared/ecom/lib/cart";
import { getProductBySlug, getProductsByIds, placeOrder } from "@shared/ecom/api/client";
import type { PlaceOrderCheckout } from "@shared/ecom/api/client";
import { getValidAccessToken } from "@shared/lib/auth";
import { HAS_SUPABASE } from "@shared/config";
import { CheckoutAnalytics } from "@/components/analytics/EcommerceEvents";
import FormField from "@/components/ui/form-field";
import ErrorBanner from "@/components/ui/ErrorBanner";

const StripeElementsProvider = dynamic(
  () => import("@/components/stripe/StripeElementsProvider").then((m) => m.StripeElementsProvider),
  { ssr: false },
);
const CheckoutPaymentForm = dynamic(() => import("./payment-form").then((m) => m.CheckoutPaymentForm), {
  ssr: false,
});

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

type CheckoutSnapshot = { items: ReturnType<typeof useCart>["items"]; subtotal: number; currency: string };
type CheckoutStep = "form" | "payment" | "complete";

const REQUIRE_AUTH_FOR_CHECKOUT = true;
const AUTO_REDIRECT_EMPTY_CART = false;

export default function CheckoutClient() {
  const router = useRouter();
  const { items, subtotal, clear, remove } = useCart();
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
  const analyticsItems = useMemo(
    () =>
      items.map((row) => ({
        id: row.product.id,
        title: row.product.title,
        price: row.product.price,
        currency: orderCurrency,
        category: row.product.category,
        quantity: row.qty,
      })),
    [items, orderCurrency],
  );

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
      } catch {
        // ignore fallthrough
      }

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
      } catch {
        // ignore fallthrough
      }

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
      const currencySource = HAS_SUPABASE ? "products" : "local_fallback";

      const invalidCartIds: string[] = [];
      const resolvedItems: Array<{ cartId: string; productId: string; qty: number }> = [];

      for (const row of items) {
        const qty = Number.isFinite(row.qty) ? Math.floor(row.qty) : 0;
        if (qty <= 0) {
          invalidCartIds.push(row.id);
          continue;
        }

        let resolvedId = "";
        if (UUID_PATTERN.test(String(row.id))) {
          resolvedId = String(row.id);
        } else if (row.product?.id && UUID_PATTERN.test(row.product.id)) {
          resolvedId = row.product.id;
        } else if (row.product?.slug) {
          try {
            const prod = await getProductBySlug(row.product.slug);
            if (prod?.id && UUID_PATTERN.test(prod.id)) {
              resolvedId = prod.id;
            }
          } catch {
            // ignore lookup failures
          }
        }

        if (!resolvedId) {
          if (!HAS_SUPABASE) {
            resolvedId = String(row.id);
          } else {
            invalidCartIds.push(row.id);
            continue;
          }
        }

        resolvedItems.push({ cartId: row.id, productId: resolvedId, qty });
      }

      if (invalidCartIds.length) {
        console.warn("[cart:validation]", {
          stage: "invalid_cart_ids",
          cart_items_in: items.length,
          cart_items_valid: resolvedItems.length,
          missing_ids: invalidCartIds,
          aggregated_items: resolvedItems.map(({ productId, qty }) => ({ productId, qty })),
          currency_source: currencySource,
        });
        invalidCartIds.forEach((cartId) => remove(cartId));
        setError("Removed unavailable or invalid items from your cart. Please review and try again.");
        setIsSubmitting(false);
        return;
      }

      const aggregated = new Map<string, { qty: number; cartIds: Set<string> }>();
      for (const entry of resolvedItems) {
        const current = aggregated.get(entry.productId);
        if (current) {
          current.qty += entry.qty;
          current.cartIds.add(entry.cartId);
        } else {
          aggregated.set(entry.productId, { qty: entry.qty, cartIds: new Set([entry.cartId]) });
        }
      }

      const uniqueProductIds = Array.from(aggregated.keys());
      // Build normalized items once and reuse below (for logs and placeOrder)
      const normalizedItems = uniqueProductIds.map((id) => ({
        id,
        qty: aggregated.get(id)!.qty,
      }));

      if (!uniqueProductIds.length) {
        setError("Your cart is empty.");
        setIsSubmitting(false);
        return;
      }

      if (HAS_SUPABASE) {
        let catalogProducts: Awaited<ReturnType<typeof getProductsByIds>>;
        try {
          catalogProducts = await getProductsByIds(uniqueProductIds);
        } catch (lookupError) {
          const message = lookupError instanceof Error ? lookupError.message : "Unable to verify products.";
          setError(message);
          setIsSubmitting(false);
          return;
        }

        const availableIds = new Set(catalogProducts.map((product) => product.id));
        const missingInCatalog = uniqueProductIds.filter((id) => !availableIds.has(id));
        if (missingInCatalog.length) {
          console.warn("[cart:validation]", {
            stage: "missing_catalog",
            cart_items_in: items.length,
            cart_items_valid: normalizedItems.length,
            missing_ids: missingInCatalog,
            aggregated_items: normalizedItems,
            currency_source: currencySource,
          });
          missingInCatalog.forEach((productId) => {
            const record = aggregated.get(productId);
            if (record) {
              record.cartIds.forEach((cartId) => remove(cartId));
            }
          });
          setError("Some items are no longer available and were removed from your cart.");
          setIsSubmitting(false);
          return;
        }
      }

      // normalizedItems already computed above

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
      const snapshotCopy = {
        items: items.map((row) => ({ ...row })),
        subtotal,
        currency: orderCurrency,
      } as CheckoutSnapshot;

      console.info("[cart:validation]", {
        stage: "ready_for_checkout",
        cart_items_in: items.length,
        cart_items_valid: normalizedItems.length,
        missing_ids: [],
        aggregated_items: normalizedItems,
        currency_source: currencySource,
      });

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
      const unknownMatch = typeof message === "string" ? message.match(/unknown_product_ids:\s*(\[[^\]]*\])/i) : null;
      if (unknownMatch) {
        try {
          const parsed = JSON.parse(unknownMatch[1]);
          if (Array.isArray(parsed)) {
            parsed.map(String).forEach((productId) => {
              const cartEntry = items.find((row) => row.product?.id === productId || row.id === productId);
              if (cartEntry) remove(cartEntry.id);
            });
            console.warn("[cart:error]", {
              code: "unknown_product_ids",
              ids: parsed,
            });
          }
        } catch {
          // ignore parse failures
        }
        setError("Some items are no longer available and were removed from your cart.");
      } else {
        setError(message);
      }
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
      <>
        <CheckoutAnalytics items={analyticsItems} currency={orderCurrency} />
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
      </>
    );
  }

  if (checkoutStep === "payment" && orderId && snapshot && clientSecret) {
    const amountLabel = formatPrice(snapshot.subtotal, snapshot.currency);
    return (
      <>
        <CheckoutAnalytics items={analyticsItems} currency={orderCurrency} />
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
      </>
    );
  }

  return (
    <>
      <CheckoutAnalytics items={analyticsItems} currency={orderCurrency} />
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold sm:text-4xl">Checkout</h1>
          <p className="text-sm text-neutral-600">Confirm your details and place the order securely.</p>
        </div>
        <Link href="/cart" className="text-sm text-blue-600 transition hover:text-blue-500">Back to cart</Link>
      </div>
      {error ? (
        <ErrorBanner
          description={error}
          onRetry={() => setError(null)}
        />
      ) : null}
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
              <FormField id="checkout-fullName" label="Full name" required>
                <input
                  className="h-11 rounded-lg border border-slate-200 px-3 text-sm shadow-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  name="fullName"
                  placeholder="Ada Lovelace"
                  autoComplete="name"
                  required
                  disabled={isSubmitting}
                />
              </FormField>
              <FormField id="checkout-email" label="Email" required>
                <input
                  className="h-11 rounded-lg border border-slate-200 px-3 text-sm shadow-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  disabled={isSubmitting}
                />
              </FormField>
            </section>
            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-lg font-semibold text-slate-900">Shipping</div>
              <FormField id="checkout-address" label="Address" required>
                <input
                  className="h-11 rounded-lg border border-slate-200 px-3 text-sm shadow-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  name="address"
                  placeholder="123 Main Street"
                  autoComplete="street-address"
                  required
                  disabled={isSubmitting}
                />
              </FormField>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField id="checkout-city" label="City" required className="text-sm text-neutral-600">
                  <input
                    className="h-11 rounded-lg border border-slate-200 px-3 text-sm shadow-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    name="city"
                    autoComplete="address-level2"
                    required
                    disabled={isSubmitting}
                  />
                </FormField>
                <FormField id="checkout-zip" label="Postal code" required className="text-sm text-neutral-600">
                  <input
                    className="h-11 rounded-lg border border-slate-200 px-3 text-sm shadow-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    name="zip"
                    autoComplete="postal-code"
                    required
                    disabled={isSubmitting}
                  />
                </FormField>
              </div>
              <FormField id="checkout-notes" label="Notes" description="Optional instructions for courier">
                <textarea
                  className="min-h-[120px] rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  name="notes"
                  placeholder="Delivery instructions"
                  disabled={isSubmitting}
                />
              </FormField>
            </section>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-900 px-6 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
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
    </>
  );
}
