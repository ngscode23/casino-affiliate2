import PageShell from "@ui/components/ui/PageShell";
import Seo from "@ui/components/Seo";
import { products } from "@shared/ecom/data/products";
import categories from "@shared/ecom/data/categories";
import ProductCard from "@ui/ecom/components/ProductCard";
import HeroSlider from "@ui/ecom/components/HeroSlider";
import { Link } from "react-router-dom";
import * as Icons from "lucide-react";
import { useCart } from "@shared/ecom/lib/cart";
import { useWishlist } from "@shared/ecom/lib/wishlist";

export default function ShopHome() {
  const { add } = useCart();
  const { ids, toggle } = useWishlist();
  const featured = [...products].sort((a, b) => b.rating - a.rating).slice(0, 8);
  const topDeals = [...products].slice(0, 6);
  const bestElectronics = products.filter((p) => p.category === "electronics").slice(0, 6);
  const cats = categories.slice(0, 6);

  return (
    <PageShell className="bg-bg text-text">
      <Seo title="Shop" description="Browse featured products and categories" ogImage="/og.svg" />

      {/* Full-bleed slider (Amazon-like) */}
      <div className="-mx-4 sm:-mx-6 lg:-mx-8">
        <HeroSlider />
      </div>

      {/* Promo grid like Amazon modules */}
      <section className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {/* Top deals */}
        <div className="relative rounded-2xl border border-border bg-card p-4 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 opacity-40 bg-[radial-gradient(1200px_400px_at_-10%_-10%,rgba(255,255,255,.08),transparent_60%)]" aria-hidden />
          <div className="relative z-[1]">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Top deals</div>
              <Link to="/catalog" className="text-xs rounded-full border border-border bg-card px-3 py-1 hover:bg-white/60 dark:hover:bg-white/5">
                View all
              </Link>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {topDeals.slice(0,6).map((p) => {
                const wished = ids.includes(p.id);
                return (
                  <div key={p.id} className="group relative rounded-xl border border-border bg-card p-2 transition hover:shadow-soft">
                    <Link to={`/product/${encodeURIComponent(p.slug)}`} className="block">
                      <div className="relative overflow-hidden rounded-md border border-border aspect-square bg-card">
                        <img
                          src={p.imageUrl || p.images[0] || "/og.svg"}
                          alt={p.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                        <div className="pointer-events-none absolute inset-0 bg-black/10 opacity-0 transition-opacity duration-200 group-hover:opacity-100" aria-hidden />
                      </div>
                    </Link>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => add(p.id, 1)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-white text-[rgb(var(--primary))] shadow-sm transition hover:bg-slate-100 dark:border-white/20 dark:bg-black/40 dark:text-white"
                        aria-label="Add to cart"
                        title="Add to cart"
                      >
                        <Icons.ShoppingCart className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-pressed={wished}
                        onClick={() => toggle(p.id)}
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-full border shadow-sm transition ${wished ? 'border-border bg-[rgb(var(--primary))]/10 text-[rgb(var(--primary))] dark:border-white/30 dark:bg-white/20 dark:text-white' : 'border-border bg-white text-muted hover:bg-slate-100 dark:border-white/20 dark:bg-black/40 dark:text-white dark:hover:bg-black/50'}`}
                        aria-label={wished ? 'Remove from favorites' : 'Add to favorites'}
                        title={wished ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <Icons.Heart className={`h-4 w-4 ${wished ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                    <div className="mt-2 space-y-1">
                      <div className="line-clamp-1 text-xs opacity-90">{p.title}</div>
                      <div className="text-[13px] font-semibold text-[color:var(--ui-accent)]">${p.price.toFixed(2)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* New to shop (categories) */}
        <div className="relative rounded-2xl border border-border bg-card p-4 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 opacity-30 bg-[radial-gradient(1000px_280px_at_110%_-10%,rgba(59,130,246,.12),transparent_60%)] dark:bg-[radial-gradient(1000px_280px_at_110%_-10%,rgba(255,255,255,.08),transparent_60%)]" aria-hidden />
          <div className="relative z-[1]">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">New to our shop?</div>
              <Link to="/catalog" className="text-xs rounded-full border border-border bg-white px-3 py-1 !text-text shadow-sm transition hover:bg-slate-50 hover:!text-text dark:border-white/10 dark:bg-white/10 dark:!text-text">
                Explore
              </Link>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {cats.map((c) => {
                const Icon = (Icons as any)[c.icon as keyof typeof Icons] || Icons.Box;
                return (
                  <Link key={c.id} to={`/catalog?category=${encodeURIComponent(c.slug)}`} className="group">
                    <div className="aspect-square flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-300 bg-gradient-to-b from-white via-slate-100 to-slate-300 text-sm font-medium text-text shadow-[0_12px_24px_rgba(15,23,42,0.08)] transition-all hover:-translate-y-0.5 hover:shadow-soft dark:border-white/10 dark:from-white/15 dark:to-white/5">
                      <Icon className="h-6 w-6 text-sky-600 transition-colors group-hover:text-sky-700 dark:text-sky-300 dark:group-hover:text-sky-200" />
                      <span className="!text-text transition-colors group-hover:!text-text dark:!text-text dark:group-hover:!text-text">{c.name}</span>
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
                    <div className="relative overflow-hidden rounded-lg border border-border aspect-[4/3] bg-card">
                      <img
                        src={p.imageUrl || p.images[0] || "/og.svg"}
                        alt={p.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                      <div className="pointer-events-none absolute inset-0 bg-black/25 opacity-0 transition-opacity duration-200 group-hover:opacity-100" aria-hidden />
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={() => add(p.id, 1)}
                    className="absolute bottom-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white text-[rgb(var(--primary))] opacity-0 shadow-sm transition-all duration-200 group-hover:opacity-100 hover:bg-slate-100 dark:border-white/20 dark:bg-black/40 dark:text-white dark:hover:bg-black/50"
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
        <div className="relative rounded-2xl border border-border bg-gradient-to-b from-sky-100/80 via-white to-[var(--ui-card)] p-4 flex flex-col overflow-hidden dark:from-sky-500/20 dark:via-transparent">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-sky-200/60 blur-3xl dark:bg-sky-500/30" aria-hidden />
          <div className="relative z-[1] text-text">
            <div className="text-lg font-semibold">Sign in for your best experience</div>
            <ul className="mt-2 space-y-1 text-sm text-muted">
              <li className="flex items-center gap-2 text-text"><Icons.CheckCircle2 className="h-4 w-4 text-emerald-500" /> Faster checkout</li>
              <li className="flex items-center gap-2 text-text"><Icons.CheckCircle2 className="h-4 w-4 text-emerald-500" /> Save favorites</li>
              <li className="flex items-center gap-2 text-text"><Icons.CheckCircle2 className="h-4 w-4 text-emerald-500" /> Exclusive offers</li>
            </ul>
            <Link to="/auth/login" className="mt-4 inline-flex items-center justify-center rounded-full bg-yellow-400 text-black font-semibold px-5 py-2 shadow-sm transition hover:bg-yellow-300">
              Sign in securely
            </Link>
            <div className="mt-3 text-xs text-muted">New here? <Link className="underline" to="/register">Create an account</Link></div>
          </div>
        </div>
      </section>

      {/* Featured products */}
      <section className="mt-10 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Featured</h2>
          <Link className="text-sm underline text-muted" to="/catalog">See all</Link>
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












