import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowUp, ArrowDown, SlidersHorizontal } from "lucide-react";
import cn from "@/lib/cn";
import PageShell from "@/components/ui/PageShell";
import Seo from "@/components/Seo";
import ProductCard from "@/ecom/components/ProductCard";
import Skeleton from "@/components/common/skeleton";
import stockCategories from "@/ecom/data/categories";
import { getProducts } from "@/ecom/api/getProducts";
import type { Product } from "@/ecom/lib/types";
import FilterSidebar from "@/components/FilterSidebar";

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
  const [cats, setCats] = useState<Array<{ id: string; label: string }>>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 1500 });
  const [uiMin, setUiMin] = useState<number>(0);
  const [uiMax, setUiMax] = useState<number>(1500);
  const priceTimer = useRef<number | null>(null);

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

  // Load categories from API with fallback to local
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const u = new URL("/api/ecom-categories", window.location.origin);
        const res = await fetch(u.toString(), { headers: { accept: "application/json" } });
        if (res.ok) {
          const j = await res.json();
          const mapped = (j.items || []).map((c: any) => ({ id: c.slug, label: c.name }));
          if (!cancelled) setCats(mapped);
          return;
        }
      } catch { /* ignore */ }
      const fallback = stockCategories.map((c) => ({ id: c.slug, label: c.name }));
      if (!cancelled) setCats(fallback);
    })();
    return () => { cancelled = true; };
  }, []);

  // Derive price bounds from loaded items (soft update)
  useEffect(() => {
    const list = items || [];
    if (!list.length) return;
    const prices = list.map((p) => Number(p.price)).filter((n) => Number.isFinite(n));
    if (!prices.length) return;
    const lo = Math.max(0, Math.floor(Math.min(...prices)));
    const hi = Math.ceil(Math.max(...prices));
    setPriceRange((prev) => ({
      min: prev.min === 0 && prev.max === 1500 ? lo : Math.min(prev.min, lo),
      max: prev.min === 0 && prev.max === 1500 ? hi : Math.max(prev.max, hi),
    }));
  }, [items?.length]);

  // Sync UI slider values with params/range changes
  useEffect(() => {
    const effMin = Number.isFinite(min) && min > 0 ? min : priceRange.min;
    const effMax = Number.isFinite(max) && max > 0 ? max : priceRange.max;
    setUiMin(effMin);
    setUiMax(effMax);
  }, [min, max, priceRange.min, priceRange.max]);

  const update = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    setParams(next, { replace: true });
  };

  return (
    <PageShell className="bg-bg text-text">
      <Seo title="Catalog" description="Browse all products" ogImage="/og.svg" />

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Каталог</h1>
        <button
          className="md:hidden inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm shadow-soft"
          onClick={()=>setShowFilters(true)}
        >
          <SlidersHorizontal className="h-4 w-4" /> Фильтры
        </button>
      </div>
      <div className="mb-4 text-sm text-muted">{loading ? "Загрузка…" : error ? "Ошибка загрузки" : `Найдено ${total}`}</div>

      <div className="md:grid md:grid-cols-12 md:gap-6 items-start">
        {/* Sidebar (desktop) */}
        <aside className="hidden md:block md:col-span-4 lg:col-span-3 sticky top-24">
          <FilterSidebar
            query={q}
            onQueryChange={(v)=>update('q', v)}
            categories={cats}
            selectedCategoryIds={category==='all'?[]:[category]}
            onToggleCategory={(id)=> update('category', category===id? 'all' : id)}
            minPrice={priceRange.min}
            maxPrice={priceRange.max}
            valueMin={uiMin}
            valueMax={uiMax}
            onPriceChange={(a,b)=>{
              setUiMin(a); setUiMax(b);
              try { if (priceTimer.current) clearTimeout(priceTimer.current as unknown as number); } catch (e){void e}
              priceTimer.current = (setTimeout(()=>{ update('min', String(a)); update('max', String(b)); }, 150) as unknown) as number;
            }}
            onReset={()=> setParams(new URLSearchParams(), { replace: true })}
          />
        </aside>

        {/* Content */}
        <div className="md:col-span-8 lg:col-span-9 space-y-6">
          {/* Sort bar */}
          <div className="flex items-center justify-between gap-3">
            <div />
            <div className="flex items-center gap-2 text-sm">
              <span className="hidden md:inline text-muted">Сортировать</span>
              <div className="hidden md:inline-flex rounded-xl border border-border bg-card shadow-soft">
                {[{k:"rating", label:"Рейтинг"},{k:"price",label:"Цена"},{k:"title",label:"Название"}].map(({k,label}) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={sort === k}
                    onClick={() => update("sort", k)}
                    className={cn(
                      "px-3 py-1.5 transition",
                      sort === k ? "bg-[rgb(var(--primary))]/10 text-[rgb(var(--primary))]" : "text-muted hover:bg-slate-100 dark:hover:bg-white/5"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="hidden md:inline-flex items-center justify-center rounded-md border border-border bg-card px-2 py-1 shadow-sm hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent-20)] dark:hover:bg-white/5"
                aria-label={`Toggle direction (${dir})`}
                onClick={() => update("dir", dir === "asc" ? "desc" : "asc")}
                title={dir === "asc" ? "По возрастанию" : "По убыванию"}
              >
                {dir === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              </button>

              {/* Mobile select */}
              <label htmlFor="sort" className="sr-only">Sort</label>
              <select id="sort" className="md:hidden rounded-xl border border-border bg-white px-3 py-2 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent-20)] dark:bg-card" value={`${sort}:${dir}`} onChange={(e) => {
                const [k, d] = e.currentTarget.value.split(":");
                update("sort", k); update("dir", d);
              }}>
                <option value="rating:desc">Рейтинг: выше → ниже</option>
                <option value="rating:asc">Рейтинг: ниже → выше</option>
                <option value="price:asc">Цена: ниже → выше</option>
                <option value="price:desc">Цена: выше → ниже</option>
                <option value="title:asc">Название: A→Z</option>
                <option value="title:desc">Название: Z→A</option>
              </select>
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid gap-5 sm:gap-6 grid-cols-[repeat(auto-fit,minmax(180px,1fr))] lg:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-border bg-card p-3">
                  <Skeleton className="aspect-square rounded-md" />
                  <Skeleton className="h-4 w-3/4 mt-3" />
                  <Skeleton className="h-4 w-1/3 mt-2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-5 sm:gap-6 grid-cols-[repeat(auto-fit,minmax(180px,1fr))] lg:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
              {(items || []).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter overlay */}
      {showFilters && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={()=>setShowFilters(false)} />
          <div className="relative ml-auto h-full w-[88vw] max-w-[420px] bg-card text-text border-l border-border p-4 shadow-xl overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold">Фильтры</div>
              <button className="rounded-md border border-border bg-white px-3 py-1.5 text-sm shadow-sm hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent-20)] dark:bg-card dark:hover:bg-white/5" onClick={()=>setShowFilters(false)}>Закрыть</button>
            </div>
            <FilterSidebar
              query={q}
              onQueryChange={(v)=>update('q', v)}
              categories={cats}
              selectedCategoryIds={category==='all'?[]:[category]}
              onToggleCategory={(id)=> update('category', category===id? 'all' : id)}
              minPrice={priceRange.min}
              maxPrice={priceRange.max}
              valueMin={uiMin}
              valueMax={uiMax}
              onPriceChange={(a,b)=>{
                setUiMin(a); setUiMax(b);
                try { if (priceTimer.current) clearTimeout(priceTimer.current as unknown as number); } catch (e){void e}
                priceTimer.current = (setTimeout(()=>{ update('min', String(a)); update('max', String(b)); }, 150) as unknown) as number;
              }}
              onReset={()=> { setParams(new URLSearchParams(), { replace: true }); setShowFilters(false); }}
            />
          </div>
        </div>
      )}
    </PageShell>
  );
}
