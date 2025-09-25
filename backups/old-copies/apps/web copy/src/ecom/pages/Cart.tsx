import PageShell from "@ui/components/ui/PageShell";
import Seo from "@ui/components/Seo";
import { useCart } from "@shared/ecom/lib/cart";
import { Link } from "react-router-dom";

export default function CartPage() {
  const { items, subtotal, update, remove, clear } = useCart();
  return (
    <PageShell>
      <Seo title="Cart" description="Your shopping cart" ogImage="/og.svg" />
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-2">Cart</h1>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[var(--bg-1)] p-6">
          <div>Your cart is empty.</div>
          <Link className="underline" to="/catalog">Go to catalog</Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-3">
            {items.map((row) => (
              <div key={row.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[var(--bg-1)] p-3">
                <img
                  src={row.product.imageUrl || row.product.images[0] || "/og.svg"}
                  alt={row.product.title}
                  className="w-20 h-14 object-cover rounded-lg border border-white/10"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{row.product.title}</div>
                  <div className="text-sm text-[var(--text-dim)]">${row.product.price.toFixed(2)} each</div>
                </div>
                <input
                  aria-label={`Quantity for ${row.product.title}`}
                  type="number"
                  min={1}
                  className="w-16 rounded-md bg-white/5 border border-white/10 px-2 py-1"
                  value={row.qty}
                  onChange={(e) => update(row.id, Math.max(1, Number(e.currentTarget.value) || 1))}
                />
                <div className="w-24 text-right">${row.lineTotal.toFixed(2)}</div>
                <button className="rounded-md border border-white/10 px-2 py-1 hover:bg-white/10" onClick={() => remove(row.id)}>Remove</button>
              </div>
            ))}
            <button className="rounded-md border border-white/10 px-3 py-2 hover:bg-white/10" onClick={clear}>Clear cart</button>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[var(--bg-1)] p-4 space-y-2">
            <div className="flex items-center justify-between"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
            <div className="text-sm text-[var(--text-dim)]">Taxes and shipping calculated at checkout.</div>
            <Link to="/checkout" className="block text-center rounded-xl border border-white/10 bg-white/10 px-3 py-2 hover:bg-white/20">Checkout</Link>
          </div>
        </div>
      )}
    </PageShell>
  );
}


