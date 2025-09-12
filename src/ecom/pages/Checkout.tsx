import PageShell from "@/components/ui/PageShell";
import Seo from "@/components/Seo";
import { useCart } from "@/ecom/lib/cart";
import { useState } from "react";

export default function CheckoutPage() {
  const { items, subtotal, clear } = useCart();
  const [done, setDone] = useState(false);

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
          <form className="md:col-span-2 space-y-3" onSubmit={(e) => { e.preventDefault(); clear(); setDone(true); }}>
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
          </div>
        </div>
      )}
    </PageShell>
  );
}

