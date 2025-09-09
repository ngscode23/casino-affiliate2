import PageShell from "../../components/ui/PageShell";
import Seo from "@/components/Seo";
import { products } from "@/ecom/data/products";
import categories from "@/ecom/data/categories";
import ProductCard from "@/ecom/components/ProductCard";
import HeroSlider from "@/ecom/components/HeroSlider";
import { Link } from "react-router-dom";
import * as Icons from "lucide-react";
import { useCart } from "@/ecom/lib/cart";
import { useWishlist } from "@/ecom/lib/wishlist";

export default function ShopHome() {
  const { add } = useCart();
  const { ids, toggle } = useWishlist();
  const featured = [...products].sort((a, b) => b.rating - a.rating).slice(0, 8);
  const topDeals = [...products].slice(0, 6);
  const bestElectronics = products.filter((p) => p.category === "electronics").slice(0, 6);
  const cats = categories.slice(0, 6);

  return (
    <PageShell>
      <Seo title="Shop" description="Browse featured products and categories" ogImage="/og.svg" />

      {/* Full-bleed slider (Amazon-like) */}
      <div className="-mx-4 sm:-mx-6 lg:-mx-8">
        <HeroSlider />
      </div>

      {/* Promo grid like Amazon modules */}
      <section className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {/* Top deals */}
        <div className="relative rounded-2xl border border-white/10 bg-[var(--bg-1)] p-4 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 opacity-40 bg-[radial-gradient(1200px_400px_at_-10%_-10%,rgba(255,255,255,.08),transparent_60%)]" aria-hidden />
          <div className="relative z-[1]">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Top deals</div>
              <Link to="/catalog" className="text-xs rounded-full border border-white/10 bg-white/5 px-3 py-1 hover:bg-white/10">
                View all
              </Link>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {topDeals.slice(0,6).map((p) => {
                const wished = ids.includes(p.id);
                return (
                  <div key={p.id} className="group relative rounded-xl border border-white/10 bg-white/5 p-2 transition-colors hover:border-white/20">
                    <Link to={`/product/${encodeURIComponent(p.slug)}`} className="block">
                      <div className="relative overflow-hidden rounded-md border border-white/10 aspect-square">
                        <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                        <div className="pointer-events-none absolute inset-0 bg-black/30 opacity-0 transition-opacity duration-200 group-hover:opacity-100" aria-hidden />
                      </div>
                    </Link>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => add(p.id, 1)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-black/30 text-white hover:bg-black/40"
                        aria-label="Add to cart"
                        title="Add to cart"
                      >
                        <Icons.ShoppingCart className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-pressed={wished}
                        onClick={() => toggle(p.id)}
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-full border ${wished ? 'border-white/30 bg-white/30 text-white' : 'border-white/20 bg-black/30 text-white hover:bg-black/40'}`}
                        aria-label={wished ? 'Remove from favorites' : 'Add to favorites'}
                        title={wished ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <Icons.Heart className={`h-4 w-4 ${wished ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                    <div className="mt-2 space-y-1">
                      <div className="line-clamp-1 text-xs text-[var(--text)] opacity-90">{p.title}</div>
                      <div className="text-[13px] font-semibold text-[rgb(var(--primary))]">${p.price.toFixed(2)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* New to shop (categories) */}
        <div className="relative rounded-2xl border border-white/10 bg-[var(--bg-1)] p-4 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 opacity-40 bg-[radial-gradient(1000px_280px_at_110%_-10%,rgba(255,255,255,.08),transparent_60%)]" aria-hidden />
          <div className="relative z-[1]">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">New to our shop?</div>
              <Link to="/catalog" className="text-xs rounded-full border border-white/10 bg-white/5 px-3 py-1 hover:bg-white/10">
                Explore
              </Link>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {cats.map((c) => {
                const Icon = (Icons as any)[c.icon as keyof typeof Icons] || Icons.Box;
                return (
                  <Link key={c.id} to={`/catalog?category=${encodeURIComponent(c.slug)}`} className="group">
                    <div className="rounded-lg border border-white/10 bg-white/5 aspect-square flex flex-col items-center justify-center text-sm gap-2 transition-all hover:bg-white/10 hover:border-white/20">
                      <Icon className="h-6 w-6 text-white/80 group-hover:text-[rgb(var(--primary))]" />
                      <span>{c.name}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Best sellers in Electronics */}
        <div className="relative rounded-2xl border border-white/10 bg-[var(--bg-1)] p-4 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 opacity-40 bg-[radial-gradient(1200px_400px_at_-10%_110%,rgba(255,255,255,.08),transparent_60%)]" aria-hidden />
          <div className="relative z-[1]">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Best sellers in Electronics</div>
              <Link to="/catalog?category=electronics" className="text-xs rounded-full border border-white/10 bg-white/5 px-3 py-1 hover:bg-white/10">
                See more
              </Link>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {bestElectronics.slice(0,4).map((p) => (
                <div key={p.id} className="group relative">
                  <Link to={`/product/${encodeURIComponent(p.slug)}`} className="block">
                    <div className="relative overflow-hidden rounded-lg border border-white/10 aspect-[4/3]">
                      <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                      <div className="pointer-events-none absolute inset-0 bg-black/25 opacity-0 transition-opacity duration-200 group-hover:opacity-100" aria-hidden />
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={() => add(p.id, 1)}
                    className="absolute bottom-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/30 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 hover:bg-black/40"
                    aria-label="Add to cart"
                    title="Add to cart"
                  >
                    <Icons.ShoppingCart className="h-4 w-4" />
                  </button>
                  <div className="mt-1 line-clamp-1 text-xs text-[var(--text-dim)]">{p.title}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sign in card */}
        <div className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-[#0ea5e9]/20 to-[var(--bg-1)] p-4 flex flex-col overflow-hidden">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#0ea5e9]/30 blur-3xl" aria-hidden />
          <div className="relative z-[1]">
            <div className="text-lg font-semibold">Sign in for your best experience</div>
            <ul className="mt-2 space-y-1 text-xs text-white/80">
              <li className="flex items-center gap-2"><Icons.CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Faster checkout</li>
              <li className="flex items-center gap-2"><Icons.CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Save favorites</li>
              <li className="flex items-center gap-2"><Icons.CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Exclusive offers</li>
            </ul>
            <Link to="/auth/login" className="mt-4 inline-flex items-center justify-center rounded-full bg-yellow-400 text-black font-semibold px-5 py-2 hover:bg-yellow-300">Sign in securely</Link>
            <div className="mt-3 text-xs text-[var(--text-dim)]">New here? <Link className="underline" to="/register">Create an account</Link></div>
          </div>
        </div>
      </section>

      {/* Featured products */}
      <section className="mt-10 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Featured</h2>
          <Link className="text-sm underline text-[var(--text-dim)]" to="/catalog">See all</Link>
        </div>
        <div
          className="grid gap-5 sm:gap-6
                     grid-cols-[repeat(auto-fit,minmax(160px,1fr))]
                     md:grid-cols-[repeat(auto-fit,minmax(331px,1fr))]
                     lg:grid-cols-[repeat(auto-fit,minmax(260px,1fr))]"
        >
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

    </PageShell>
  );
}
