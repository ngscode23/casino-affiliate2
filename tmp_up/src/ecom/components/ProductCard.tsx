import { Link } from "react-router-dom";
import type { Product } from "@/ecom/lib/types";
import Rating from "@/components/common/rating";
import { useCart } from "@/ecom/lib/cart";
import { useWishlist } from "@/ecom/lib/wishlist";
import { Heart, ShoppingCart } from "lucide-react";

export default function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const { ids, toggle } = useWishlist();
  const wished = ids.includes(product.id);
  return (
    <div className="rounded-2xl border border-white/10 bg-[var(--bg-1)] overflow-hidden flex flex-col transition-shadow hover:shadow-[0_10px_30px_rgba(0,0,0,.25)]">
      <div className="relative group">
        <Link to={`/product/${encodeURIComponent(product.slug)}`} className="block aspect-square bg-black/20 overflow-hidden">
          <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover transition-transform duration-300 md:group-hover:scale-[1.03]" loading="lazy" />
        </Link>
        {/* Hover darken overlay */}
        <div className="pointer-events-none absolute inset-0 transition-opacity duration-200 md:opacity-0 md:group-hover:opacity-100 bg-[linear-gradient(to_bottom,rgba(0,0,0,.15),rgba(0,0,0,.35))]" aria-hidden />
        {/* Top overlay controls: cart (left), wishlist (right) */}
        <div className="absolute top-2 left-2 z-10 transition-opacity duration-200 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          <button
            type="button"
            onClick={() => add(product.id, 1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/30 text-white hover:bg-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            aria-label="Add to cart"
            title="Add to cart"
          >
            <ShoppingCart className="h-5 w-5" />
          </button>
        </div>
        <div className="absolute top-2 right-2 z-10 transition-opacity duration-200 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          <button
            type="button"
            aria-pressed={wished}
            onClick={() => toggle(product.id)}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-full border ${wished ? 'border-white/30 bg-white/30 text-white' : 'border-white/20 bg-black/30 text-white hover:bg-black/40'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60`}
            aria-label={wished ? 'Remove from favorites' : 'Add to favorites'}
            title={wished ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart className={`h-5 w-5 ${wished ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>
      <div className="p-4 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <Link to={`/product/${encodeURIComponent(product.slug)}`} className="font-semibold hover:underline">
            {product.title}
          </Link>
          <div className="text-[rgb(var(--primary))] font-semibold">${product.price.toFixed(2)}</div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Rating value={product.rating} />
          <span className="text-[var(--text-dim)]">{product.rating.toFixed(1)}</span>
        </div>
        {/* Bottom actions removed per request; use top icons only */}
      </div>
    </div>
  );
}
