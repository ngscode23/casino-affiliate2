import PageShell from "@ui/components/ui/PageShell";
import Seo from "@ui/components/Seo";
import { useCart } from "@shared/ecom/lib/cart";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { placeOrder, getProductBySlug } from "@shared/ecom/api/client";
import { getValidAccessToken } from "@shared/lib/auth";

export default function CheckoutPage() {
  const { items, subtotal, clear } = useCart();
  const [done, setDone] = useState(false);
  const navigate = useNavigate();
  const [err, setErr] = useState<string | null>(null);

  return (
    <PageShell>
      <Seo title="Checkout" description="Complete your order" ogImage="/og.svg" />
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-2">Checkout</h1>
      {done ? (
        <div className="rounded-2xl border border-white/10 bg-[var(--bg-1)] p-6">
          <div className="text-lg font-medium">Thank you!</div>
          <div className="text-[var(--text-dim)]">Your order has been placed.</div>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          <form
            className="md:col-span-2 space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setErr(null);
              if (!items.length) return;
              try {
                // ensure authenticated
                const token = await getValidAccessToken();
                if (!token) {
                  navigate("/auth/login", { replace: true });
                  return;
                }
                // Normalize cart items to DB UUID ids; if an item comes from the local showcase
                // dataset (ids like "p1"), resolve its slug to the real DB product id.
                const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                const mapped = await Promise.all(
                  items.map(async (row) => {
                    const id = String(row.product.id || row.id || "");
                    if (uuidRe.test(id)) return { id, qty: row.qty };
                    // Try to resolve by slug via API
                    const slug = String(row.product.slug || "");
                    if (!slug) return null;
                    const prod = await getProductBySlug(slug);
                    if (prod && uuidRe.test(prod.id)) return { id: prod.id, qty: row.qty };
                    return null;
                  })
                );
                const payload = mapped.filter((x): x is { id: string; qty: number } => !!x);
                if (!payload.length) {
                  throw new Error("Не удалось сопоставить товары каталогу. Попробуйте добавить товары со страницы товара.");
                }
                const { order_id } = await placeOrder(payload, "EUR");
                clear();
                // redirect to orders page so user sees their order
                navigate("/account/orders");
                return;
              } catch (err) {
                const msg = (err as any)?.message || "Ошибка оформления";
                setErr(String(msg));
              }
              setDone(true);
            }}
          >
            <div className="rounded-2xl border border-white/10 bg-[var(--bg-1)] p-4 space-y-3">
              <div className="text-lg font-medium">Contact</div>
              <input required className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2" placeholder="Full name" />
              <input required type="email" className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2" placeholder="Email" />
            </div>
            <div className="rounded-2xl border border-white/10 bg-[var(--bg-1)] p-4 space-y-3">
              <div className="text-lg font-medium">Shipping</div>
              <input required className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2" placeholder="Address" />
              <div className="grid grid-cols-2 gap-3">
                <input required className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2" placeholder="City" />
                <input required className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2" placeholder="Zip" />
              </div>
              <input className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2" placeholder="Notes (optional)" />
            </div>
            <button className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 hover:bg-white/20">Place order</button>
          </form>
          <div className="rounded-2xl border border-white/10 bg-[var(--bg-1)] p-4 space-y-2">
            <div className="text-lg font-medium">Summary</div>
            {items.map((row) => (
              <div key={row.id} className="flex items-center justify-between text-sm">
                <div className="truncate">{row.product.title} × {row.qty}</div>
                <div>${row.lineTotal.toFixed(2)}</div>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {err && <div className="text-sm text-rose-400">{err}</div>}
          </div>
        </div>
      )}
    </PageShell>
  );
}


