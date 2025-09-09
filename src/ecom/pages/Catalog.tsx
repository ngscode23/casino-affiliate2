import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { ArrowUp, ArrowDown } from "lucide-react";
import cn from "@/lib/cn";
import PageShell from "@/components/ui/PageShell";
import Seo from "@/components/Seo";
import ProductCard from "@/ecom/components/ProductCard";
import categories from "@/ecom/data/categories";
import { getProducts } from "@/ecom/api/getProducts";
import type { Product } from "@/ecom/lib/types";

export default function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const category = params.get("category") || "all";
  const min = Number(params.get("min") || "");
  const max = Number(params.get("max") || "");
  const q = (params.get("q") || "").trim().toLowerCase();
  const sort = params.get("sort") || "rating"; // rating|price|title
  const dir = params.get("dir") === "asc" ? "asc" : "desc";

  const [items, setItems] = useState<Product[] | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    getProducts({
      q,
      category,
      min: Number.isFinite(min) ? (min || undefined) : undefined,
      max: Number.isFinite(max) ? (max || undefined) : undefined,
      sort: sort as any,
      dir: dir as any,
      page: 1,
      limit: 60,
    })
      .then((res) => { if (!cancelled) { setItems(res.items); setTotal(res.total); } })
      .catch((e) => { if (!cancelled) setError(String(e?.message || e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [q, category, min, max, sort, dir]);

  const update = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    setParams(next, { replace: true });
  };

  return (
    <PageShell>
      <Seo title="Catalog" description="Browse all products" ogImage="/og.svg" />

      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-2">Catalog</h1>
      <div className="mb-4 text-sm text-[var(--text-dim)]">{loading ? "Loading…" : error ? "Error loading" : `Found ${total}`}</div>

      <div className="md:grid md:grid-cols-12 md:gap-6">
        <aside className="hidden md:block md:col-span-4 lg:col-span-3">
          <div className="rounded-2xl border border-white/10 bg-[var(--bg-1)] p-4 space-y-4 sticky top-20">
            <div>
              <div className="text-sm font-medium">Category</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button className={`rounded-xl border px-2 py-1 text-sm ${category === "all" ? "bg-white/10 border-white/20" : "border-white/10"}`} onClick={() => update("category", "all")}>All</button>
                {categories.map((c) => (
                  <button key={c.id} className={`rounded-xl border px-2 py-1 text-sm ${category === c.slug ? "bg-white/10 border-white/20" : "border-white/10"}`} onClick={() => update("category", c.slug)}>{c.name}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium">Price</div>
              <div className="mt-2 flex items-center gap-2">
                <input className="w-20 rounded-md bg-white/5 border border-white/10 px-2 py-1" placeholder="min" defaultValue={params.get("min") || ""} onBlur={(e) => update("min", e.currentTarget.value)} />
                <span>–</span>
                <input className="w-20 rounded-md bg-white/5 border border-white/10 px-2 py-1" placeholder="max" defaultValue={params.get("max") || ""} onBlur={(e) => update("max", e.currentTarget.value)} />
              </div>
            </div>
            <div>
              <div className="text-sm font-medium">Search</div>
              <input className="mt-2 w-full rounded-md bg-white/5 border border-white/10 px-2 py-1" placeholder="query" defaultValue={params.get("q") || ""} onBlur={(e) => update("q", e.currentTarget.value)} />
            </div>
            <div className="flex gap-2">
              <button className="rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-sm hover:bg-white/10" onClick={() => setParams(new URLSearchParams(), { replace: true })}>Reset</button>
              <Link to="/cart" className="rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-sm hover:bg-white/10">Cart</Link>
            </div>
          </div>
        </aside>

        <div className="md:col-span-8 lg:col-span-9 space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div />
            <div className="flex items-center gap-2 text-sm">
              {/* Desktop buttons */}
              <span className="hidden md:inline">Sort</span>
              <div className="hidden md:inline-flex rounded-xl border border-white/10 overflow-hidden">
                {[{k:"rating", label:"Rating"},{k:"price",label:"Price"},{k:"title",label:"Title"}].map(({k,label}) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={sort === k}
                    onClick={() => update("sort", k)}
                    className={cn(
                      "px-3 py-1.5",
                      sort === k ? "bg-white/10 text-white" : "text-[var(--text-dim)] hover:bg-white/5"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="hidden md:inline-flex items-center justify-center rounded-md border border-white/10 bg-white/5 px-2 py-1 hover:bg-white/10"
                aria-label={`Toggle direction (${dir})`}
                onClick={() => update("dir", dir === "asc" ? "desc" : "asc")}
                title={dir === "asc" ? "Ascending" : "Descending"}
              >
                {dir === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              </button>

              {/* Mobile fallback: single select */}
              <label htmlFor="sort" className="sr-only">Sort</label>
              <select id="sort" className="md:hidden rounded-md bg-white/5 border border-white/10 px-2 py-1" value={`${sort}:${dir}`} onChange={(e) => {
                const [k, d] = e.currentTarget.value.split(":");
                update("sort", k); update("dir", d);
              }}>
                <option value="rating:desc">Rating: high to low</option>
                <option value="rating:asc">Rating: low to high</option>
                <option value="price:asc">Price: low to high</option>
                <option value="price:desc">Price: high to low</option>
                <option value="title:asc">Title: A→Z</option>
                <option value="title:desc">Title: Z→A</option>
              </select>
            </div>
          </div>

          <div
            className="grid gap-5 sm:gap-6
                       grid-cols-[repeat(auto-fit,minmax(160px,1fr))]
                       md:grid-cols-[repeat(auto-fit,minmax(331px,1fr))]
                       lg:grid-cols-[repeat(auto-fit,minmax(260px,1fr))]"
          >
            {(items || []).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
