import PageShell from "../../components/ui/PageShell";
import Seo from "@/components/Seo";
import { useWishlist } from "@/ecom/lib/wishlist";
import ProductCard from "@/ecom/components/ProductCard";
import { Link } from "react-router-dom";

export default function WishlistPage() {
  const { items, clear } = useWishlist();
  return (
    <PageShell>
      <Seo title="Favorites" description="Your saved products" ogImage="/og.svg" />
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-2">Favorites</h1>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[var(--bg-1)] p-6">
          <div className="text-[var(--text-dim)]">You haven't saved any products yet.</div>
          <Link className="underline" to="/catalog">Go to catalog</Link>
        </div>
      ) : (
        <>
          <div className="mb-3 text-sm text-[var(--text-dim)]">Saved: {items.length}</div>
          <div
            className="grid gap-5 sm:gap-6
                       grid-cols-[repeat(auto-fit,minmax(160px,1fr))]
                       md:grid-cols-[repeat(auto-fit,minmax(331px,1fr))]
                       lg:grid-cols-[repeat(auto-fit,minmax(260px,1fr))]"
          >
            {items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          <div className="mt-4">
            <button className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 hover:bg-white/20" onClick={clear}>Clear favorites</button>
          </div>
        </>
      )}
    </PageShell>
  );
}
