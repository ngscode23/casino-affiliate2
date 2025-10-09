/* eslint-disable @next/next/no-img-element */
import { Link } from "react-router-dom";
import type { Product } from "@shared/ecom/lib/types";
import Rating from "@ui/components/common/rating";
import { useCart } from "@shared/ecom/lib/cart";
import { useWishlist } from "@shared/ecom/lib/wishlist";
import { Heart, ShoppingCart } from "lucide-react";

export default function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const { ids, toggle } = useWishlist();
  const wished = ids.includes(product.id);
  const primaryImage = product.imageUrl || product.images[0] || "/og.svg";
  return (
    <div className="rounded-2xl border border-border bg-card text-text overflow-hidden flex flex-col transition-shadow hover:shadow-soft">
      <div className="relative group">
        <Link to={`/product/${encodeURIComponent(product.slug)}`} className="block aspect-square overflow-hidden rounded-b-none bg-slate-100">
          <img
            src={primaryImage}
            alt={product.title}
            className="h-full w-full object-cover transition-transform duration-300 md:group-hover:scale-[1.03]"
            loading="lazy"
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              if (img.dataset.fallback === "1") return;
              img.dataset.fallback = "1";
              img.style.objectFit = "contain";
              img.src = "/og.svg";
            }}
          />
        </Link>
        {/* Hover darken overlay */}
        <div className="pointer-events-none absolute inset-0 transition-opacity duration-200 md:opacity-0 md:group-hover:opacity-100 bg-[linear-gradient(to_bottom,rgba(0,0,0,.12),rgba(0,0,0,.22))] dark:bg-[linear-gradient(to_bottom,rgba(0,0,0,.2),rgba(0,0,0,.45))]" aria-hidden />
        {/* Top overlay controls: cart (left), wishlist (right) */}
        <div className="absolute top-2 left-2 z-10 transition-opacity duration-200 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          <button
            type="button"
            onClick={() => add(product.id, 1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-[rgb(var(--primary))] shadow-soft transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent-20)] dark:border-white/20 dark:bg-black/30 dark:text-white"
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
            className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent-20)] ${wished ? 'border-border bg-[rgb(var(--primary))]/10 text-[rgb(var(--primary))] dark:border-white/30 dark:bg-white/20 dark:text-white' : 'border-border bg-white text-muted hover:bg-slate-100 dark:border-white/20 dark:bg-black/30 dark:text-white dark:hover:bg-black/40'}`}
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
          <div className="text-[color:var(--ui-accent)] font-semibold">${product.price.toFixed(2)}</div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Rating value={product.rating} />
          <span className="text-muted">{product.rating.toFixed(1)}</span>
        </div>
        {/* Bottom actions removed per request; use top icons only */}
      </div>
    </div>
  );
}

