// src/pages/Offers/index.tsx

import { useState, useMemo, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";

import PageShell from "@ui/components/ui/PageShell";
import SectionCard from "@ui/components/ui/SectionCard";
import { ButtonGhost, ButtonPrimary } from "@ui/components/ui/Buttons";
import Seo from "@ui/components/Seo";
import { SITE_URL } from "@shared/config";
import { useT } from "@shared/lib/useT";
import Skeleton from "@ui/components/common/skeleton";
import { toast } from "@ui/components/common/toast";

import OfferListFeature from "@shared/features/offers/components/OfferListFeature";
import { useOffers } from "@shared/features/offers/api/useOffers";
import { getOffersPaged } from "@shared/features/offers/api/getOffersPaged";
import type { OffersFilterState } from "@shared/features/offers/components/OfferFiltersFeature";
import { fetchAttributeRegistry, fetchProductAttributes, toValueMap } from "@shared/lib/attributes";
import type { AttributeRegistryItem } from "@casino-affiliate/types/attributes";
import FiltersBuilder from "@ui/builders/FiltersBuilder";
import { supabase } from "@shared/lib/supabase";

import { getRecent, clearRecent } from "@shared/lib/recent";
import { offersNormalized, type NormalizedOffer } from "@shared/lib/offers";

export default function OffersIndex() {
  const t = useT();
  const { offers, error } = useOffers();
  const [pageItems, setPageItems] = useState<NormalizedOffer[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [pageLoading, setPageLoading] = useState<boolean>(false);
  const [pageOffset, setPageOffset] = useState<number>(0);
  const PAGE_LIMIT = 24;
  const [params, setParams] = useSearchParams();
  const reqKeyRef = useRef(0);

  const parseQueryToFilters = (sp: URLSearchParams): Record<string, any> => {
    const obj: Record<string, any> = {};
    for (const [k, v] of sp.entries()) {
      if (!v) continue;
      if (k === "page" || k === "limit" || k === "offset") continue;
      if (k === "q" || k === "license") {
        obj[k] = v;
        continue;
      }
      if (k === "sort") {
        obj.sort = v === "rating" || v === "payoutHours" || v === "name" ? v : "rating";
        continue;
      }
      if (k === "dir") {
        obj.dir = v === "asc" || v === "desc" ? v : "desc";
        continue;
      }
      if (v.includes("..")) {
        const [minStr, maxStr] = v.split("..");
        const min = minStr !== "" ? Number(minStr) : undefined;
        const max = maxStr !== "" ? Number(maxStr) : undefined;
        const hasMin = typeof min === "number" && Number.isFinite(min);
        const hasMax = typeof max === "number" && Number.isFinite(max);
        if (hasMin || hasMax) obj[k] = { ...(hasMin ? { min } : {}), ...(hasMax ? { max } : {}) };
        continue;
      }
      if (v.includes(",")) {
        obj[k] = v.split(",").filter(Boolean);
        continue;
      }
      if (v === "1" || v === "0" || v.toLowerCase() === "true" || v.toLowerCase() === "false") {
        obj[k] = v === "1" || v.toLowerCase() === "true";
        continue;
      }
      obj[k] = v;
    }
    // defaults
    if (!("license" in obj)) obj.license = "all";
    if (!("q" in obj)) obj.q = "";
    if (!("sort" in obj)) obj.sort = "rating";
    if (!("dir" in obj)) obj.dir = "desc";
    return obj;
  };

  const initialFilters = useMemo<Record<string, any>>(() => parseQueryToFilters(params), [params]);

  const [filters, setFilters] = useState<Record<string, any>>(initialFilters);
  const [recentVersion, setRecentVersion] = useState(0);
  const [attrMeta, setAttrMeta] = useState<AttributeRegistryItem[] | null>(null);
  const [attrValues, setAttrValues] = useState<Record<string, Record<string, any>>>({});
  const [slugToId, setSlugToId] = useState<Record<string, number>>({});
  const [pageDisplayItems, setPageDisplayItems] = useState<NormalizedOffer[]>([]);

  // Sync filters to URL with 250ms debounce + back/forward support
  const writeTimer = useRef<number | null>(null);
  const lastWrittenRef = useRef<string>("");

  useEffect(() => {
    // apply URL -> state on popstate (params changes)
    const curr = params.toString();
    if (curr !== lastWrittenRef.current) {
      setFilters(parseQueryToFilters(params));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.toString()]);

  useEffect(() => {
    try { if (writeTimer.current) clearTimeout(writeTimer.current as unknown as number); } catch { void 0; }
    writeTimer.current = (setTimeout(() => {
      const next = new URLSearchParams();
      for (const [k, v] of Object.entries(filters)) {
        if (v == null) continue;
        if (k === "page" || k === "limit" || k === "offset") continue;
        if (Array.isArray(v)) {
          if (v.length) next.set(k, v.join(","));
          continue;
        }
        if (typeof v === "object") {
          const min = (v as any).min;
          const max = (v as any).max;
          const hasMin = typeof min === "number" && Number.isFinite(min);
          const hasMax = typeof max === "number" && Number.isFinite(max);
          if (hasMin || hasMax) next.set(k, `${hasMin ? min : ""}..${hasMax ? max : ""}`);
          continue;
        }
        const s = String(v).trim();
        if (s) next.set(k, s);
      }
      // ensure defaults are omitted when empty
      if (next.get("license") === "all") next.delete("license");
      if ((next.get("q") || "").trim() === "") next.delete("q");
      // omit default sort from URL (rating desc)
      if ((next.get("sort") || "") === "rating" && (next.get("dir") || "") === "desc") {
        next.delete("sort");
        next.delete("dir");
      }
      const target = next.toString();
      if (target !== params.toString()) {
        lastWrittenRef.current = target;
        setParams(next, { replace: true });
      }
    }, 250) as unknown) as number;
    return () => {
      try { if (writeTimer.current) clearTimeout(writeTimer.current as unknown as number); } catch { void 0; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);

  // Load attribute registry and values for current page (client-side attr-filter support)
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const meta = await fetchAttributeRegistry();
        if (!active) return;
        setAttrMeta(meta);
      } catch { /* noop */ }
    })();
    return () => { active = false; };
  }, []);

  // Resolve numeric product IDs for current page and fetch their attributes (no slug in product_id)
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const slugs = (pageItems ?? []).map((o) => o.slug).filter(Boolean) as string[];
        if (!slugs.length) { if (active) { setSlugToId({}); setAttrValues({}); } return; }
        const { data, error } = await (supabase as any)
          .from('offers')
          .select('id,slug')
          .in('slug', slugs);
        if (error) throw error;
        const map: Record<string, number> = {};
        for (const r of ((data ?? []) as any[])) map[String(r.slug)] = Number(r.id);
        if (!active) return;
        setSlugToId(map);
        const ids = Object.values(map);
        if (ids.length) {
          const rows = await fetchProductAttributes(ids as any);
          if (!active) return;
          setAttrValues(toValueMap(rows));
        } else {
          setAttrValues({});
        }
      } catch {
        /* keep previous mapping/values to avoid flicker */
      }
    })();
    return () => { active = false; };
  }, [pageItems.map((o) => o.slug).join(',')]);

  // Hybrid overlay for page items: prefer EAV (from v_products_flat) and fallback to offers.* when missing
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const slugs = (pageItems ?? []).map((o) => o.slug).filter(Boolean) as string[];
        if (!slugs.length) { if (active) setPageDisplayItems([]); return; }
        // fetch fallback fields from offers
        const { data } = await (supabase as any)
          .from('offers')
          .select('slug,rating,license,payout,payout_hours,methods')
          .in('slug', slugs);
        const bySlug = new Map<string, any>((data ?? []).map((r: any) => [String(r.slug), r]));
        const merged: NormalizedOffer[] = (pageItems ?? []).map((o) => {
          const fb = bySlug.get(o.slug);
          return {
            ...o,
            rating: (o as any).rating != null ? o.rating : (fb?.rating ?? o.rating),
            license: (o as any).license != null && o.license !== '' ? o.license : (fb?.license ?? o.license),
            payout: (o as any).payout ?? (fb?.payout ?? ''),
            payoutHours: (o as any).payoutHours != null ? o.payoutHours : (fb?.payout_hours ?? o.payoutHours),
            methods: (Array.isArray((o as any).methods) && (o as any).methods.length ? o.methods : (Array.isArray(fb?.methods) ? fb.methods : [])),
          } as NormalizedOffer;
        });
        if (active) setPageDisplayItems(merged);
      } catch {
        if (active) setPageDisplayItems(pageItems);
      }
    })();
    return () => { active = false; };
  }, [pageItems]);

  // Server-side filtering + pagination
  const loadPage = async (reset: boolean) => {
    setPageLoading(true);
    const myKey = ++reqKeyRef.current;
    try {
      const offset = reset ? 0 : pageOffset;
      const { items, total } = await getOffersPaged(filters, { limit: PAGE_LIMIT, offset });
      if (reqKeyRef.current !== myKey) return; // cancelled/deduped
      setTotal(total);
      setPageItems(reset ? items : [...pageItems, ...items]);
      setPageOffset(offset + items.length);
    } finally {
      if (reqKeyRef.current === myKey) setPageLoading(false);
    }
  };

  useEffect(() => {
    // filters changed -> reset pagination and reload
    setPageOffset(0);
    setPageItems([]);
    loadPage(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);

  // Recently viewed: resolve slugs from localStorage to offers (API first, then static fallback)
  const recentOffers: NormalizedOffer[] = useMemo(() => {
    try {
      const slugs = getRecent();
      if (!Array.isArray(slugs) || slugs.length === 0) return [];

      const bySlugApi = new Map((offers ?? []).map((o) => [o.slug, o]));
      const bySlugStatic = new Map(offersNormalized.map((o) => [o.slug, o]));

      const res: NormalizedOffer[] = [];
      for (const slug of slugs) {
        const found = bySlugApi.get(slug) ?? bySlugStatic.get(slug) ?? null;
        if (found) res.push(found);
      }

      const seen = new Set<string>();
      const uniq = res.filter((o) => {
        if (!o?.slug || seen.has(o.slug)) return false;
        seen.add(o.slug);
        return true;
      });

      return uniq.slice(0, 6);
    } catch {
      return [];
    }
  }, [offers, recentVersion]);

  // JSON-LD: collection + filtered item list
  const origin = SITE_URL.replace(/\/$/, "");
  const visibleForJsonLd: NormalizedOffer[] = useMemo(() => {
    let arr = [...pageDisplayItems];
    // basic filters (license + q)
    // already applied on server; keep here for safety if needed
    // dynamic attribute filters (skip q/license)
    const metaByKey: Record<string, AttributeRegistryItem> = Object.fromEntries((attrMeta ?? []).map((m) => [m.key, m] as const));
    const activeFilters = Object.entries(filters).filter(([k, v]) => k !== 'q' && k !== 'license' && v != null && v !== '' && !(Array.isArray(v) && v.length === 0));
    if (activeFilters.length) {
      arr = arr.filter((o) => {
        const pid = slugToId[o.slug];
        const map = pid != null ? (attrValues[String(pid)] || {}) : {};
        for (const [k, val] of activeFilters) {
          const meta = metaByKey[k];
          if (!meta) continue;
          const raw = map[k];
          const t = meta.type;
          if (t === 'bool') {
            if (val === true && !raw) return false;
          } else if (t === 'enum') {
            if (val && String(raw) !== String(val)) return false;
          } else if (t === 'multi_enum') {
            const sel: string[] = Array.isArray(val) ? val : [];
            if (sel.length) {
              const arrVal: string[] = Array.isArray(raw) ? raw.map(String) : raw != null ? [String(raw)] : [];
              const hasAny = sel.some((s) => arrVal.includes(String(s)));
              if (!hasAny) return false;
            }
          } else if (t === 'text') {
            const s = String(val ?? '').trim().toLowerCase();
            if (s && !String(raw ?? '').toLowerCase().includes(s)) return false;
          } else if (t === 'number') {
            const min = Number((val?.min ?? ''));
            const max = Number((val?.max ?? ''));
            const hasMin = Number.isFinite(min);
            const hasMax = Number.isFinite(max);
            const n = Number(raw);
            if ((hasMin && !(Number.isFinite(n) && n >= min)) || (hasMax && !(Number.isFinite(n) && n <= max))) return false;
          }
        }
        return true;
      });
    }
    return arr;
  }, [pageItems, filters, attrMeta, attrValues]);

  const jsonLd = useMemo(() => {
    const collection = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: t("offers.collectionTitle") || "All Casino Offers",
      url: `${origin}/offers`,
    };
    const itemList = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: visibleForJsonLd.map((o, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${origin}/offers/${encodeURIComponent(o.slug)}`,
        name: o.name,
      })),
    };
    return [collection, itemList];
  }, [origin, visibleForJsonLd]);

  return (
    <PageShell className="bg-bg text-text">
      <Seo
        title={(t("offers.title") || "All Casino Offers") + " - " + (t("offers.subtitle") || "browse & filter")}
        description={t("offers.description") || "Browse all casino offers and filter by license or search."}
        ogImage="/og.svg"
        canonical={`${origin}/offers`}
        jsonLd={jsonLd}
      />
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-2">{t("offers.all") || "All Offers"}</h1>
      <div className="mb-4 text-sm text-muted">{(t("offers.found") || "Found") + ` ${total}`}</div>

      <div className="md:grid md:grid-cols-12 md:gap-6">
        {/* Sidebar (md+) */}
        <aside className="hidden md:block md:col-span-4 lg:col-span-3">
          <SectionCard className="sticky top-20">
            <FiltersBuilder initial={filters} onChange={setFilters} mode="all" productIds={Object.values(slugToId).map(String)} registry={attrMeta ?? undefined} />
            <div className="mt-3 flex gap-2">
              <ButtonGhost onClick={() => setFilters((prev) => ({ ...prev, q: '', license: 'all' }))}>{t("filters.reset") || "Reset"}</ButtonGhost>
              <ButtonPrimary onClick={() => loadPage(true)} disabled={pageLoading}>{(t("offers.showN") || "Show") + ` ${total}`}</ButtonPrimary>
            </div>
          </SectionCard>
        </aside>

        {/* Content */}
        <div className="md:col-span-8 lg:col-span-9 space-y-8">
          {/* Mobile filters */}
          <div className="md:hidden">
            <SectionCard>
              <FiltersBuilder initial={filters} onChange={setFilters} mode="all" productIds={Object.values(slugToId).map(String)} registry={attrMeta ?? undefined} />
              <div className="mt-2 flex justify-end gap-2">
                <ButtonGhost onClick={() => setFilters((prev) => ({ ...prev, q: '', license: 'all' }))}>{t("filters.reset") || "Reset"}</ButtonGhost>
                <ButtonGhost
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(location.href);
                      toast(t("common.linkCopied") || "Link copied", { variant: "success" });
                    } catch {
                      prompt(t("common.copyLink") || "Copy link:", location.href);
                    }
                  }}
                >{t("compare.share") || "Share"}</ButtonGhost>
              </div>
            </SectionCard>
          </div>

          {/* Results */}
          {pageLoading && pageItems.length === 0 ? (
            <SectionCard contentClassName="gap-6">
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-border bg-card p-4 h-[220px] flex flex-col" aria-hidden>
                    <div className="flex items-start justify-between gap-3">
                      <Skeleton className="h-5 w-2/3" />
                      <Skeleton className="h-6 w-14 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-24 mt-2" />
                    <Skeleton className="h-4 w-3/4 mt-3" />
                    <div className="mt-auto pt-4 grid grid-cols-3 gap-2">
                      <Skeleton className="h-10" />
                      <Skeleton className="h-10" />
                      <Skeleton className="h-10" />
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          ) : error ? (
            <SectionCard><div className="text-red-400">{t("common.error") || "Error"}: {String(error)}</div></SectionCard>
          ) : (
            <SectionCard
              contentClassName="gap-6"
              actions={visibleForJsonLd.length === 0 ? (
                <ButtonGhost onClick={() => setFilters((prev) => ({ ...prev, q: '', license: 'all' }))}>
                  {t("filters.reset") || "Reset"}
                </ButtonGhost>
              ) : undefined}
            >
              {/* Sort control */}
              <div className="flex items-center justify-end gap-2">
                <label htmlFor="offers-sort" className="text-sm text-muted">{t("offers.sortBy") || "Sort by"}:</label>
                <select
                  id="offers-sort"
                  className="h-10 rounded-xl bg-card border border-border px-3 text-sm"
                  value={`${String(filters.sort || 'rating')}:${String(filters.dir || 'desc')}`}
                  onChange={(e) => {
                    const [k, d] = String(e.target.value).split(":");
                    setFilters((prev) => ({ ...prev, sort: (k || 'rating'), dir: (d === 'asc' || d === 'desc') ? d : 'desc' }));
                  }}
                >
                  <option value="rating:desc">{t("offers.sort.ratingDesc") || "Rating: high to low"}</option>
                  <option value="rating:asc">{t("offers.sort.ratingAsc") || "Rating: low to high"}</option>
                  <option value="payoutHours:asc">{t("offers.sort.payoutAsc") || "Payout time: fast first"}</option>
                  <option value="payoutHours:desc">{t("offers.sort.payoutDesc") || "Payout time: slow first"}</option>
                  <option value="name:asc">{t("offers.sort.nameAsc") || "Name: A→Z"}</option>
                  <option value="name:desc">{t("offers.sort.nameDesc") || "Name: Z→A"}</option>
                </select>
              </div>
              {(() => {
                const passFilters: OffersFilterState = {
                  license: (filters.license as OffersFilterState["license"]) || "all",
                  q: String(filters.q ?? ""),
                };
                return <OfferListFeature offers={visibleForJsonLd} filters={passFilters} onReset={() => setFilters((prev) => ({ ...prev, q: '', license: 'all' }))} />;
              })()}
              <div className="mt-4 flex justify-center">
                {pageItems.length < total ? (
                  <ButtonGhost onClick={() => loadPage(false)} disabled={pageLoading}>
                    {pageLoading ? (t("common.loading") || 'Loading…') : (t("common.loadMore") || 'Load more')}
                  </ButtonGhost>
                ) : null}
              </div>
            </SectionCard>
          )}

          {recentOffers.length > 0 && (
            <SectionCard title={t("offers.recent") || "Recently Viewed"} actions={<ButtonGhost onClick={() => { clearRecent(); setRecentVersion((v) => v + 1); }}>{t("common.clear") || "Clear"}</ButtonGhost>}>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {recentOffers.map((o) => (
                  <Link key={o.slug} to={`/offers/${encodeURIComponent(o.slug)}`} className="rounded-2xl bg-card border border-border p-4 hover:opacity-90">
                    <div className="font-medium">{o.name}</div>
                    <div className="text-sm text-muted">
                      {t("offer.license")}: {o.license ?? "-"} · {t("offer.payout")}: {o.payout}
                      {o.payoutHours ? ` (~${o.payoutHours}h)` : ""}
                    </div>
                  </Link>
                ))}
              </div>
            </SectionCard>
          )}

          <SectionCard>
            <p className="text-muted">{t("offers.tryCompare") || "Want a side-by-side view? Try Compare."}</p>
            <Link className="underline cursor-pointer" to="/compare">
              {t("offers.goToCompare") || "Go to Compare"}
            </Link>
          </SectionCard>
        </div>
      </div>
    </PageShell>
  );
}

