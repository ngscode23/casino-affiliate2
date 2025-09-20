// src/pages/Compare/index.tsx (dynamic builders)
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";

import { useVertical } from "@shared/ctx/VerticalContext";
import FiltersBuilder from "@ui/builders/FiltersBuilder";
import { fetchAttributeRegistry } from "@shared/lib/attributes";
import type { AttributeRegistryItem } from "@types/attributes";
import { supabase } from "@shared/lib/supabase";
import CompareTable from "@ui/components/compare/CompareTable";
import Seo from "@ui/components/Seo";
import { useT } from "@shared/lib/useT";
import PageShell from "@ui/components/ui/PageShell";
import SectionCard from "@ui/components/ui/SectionCard";
import { ButtonGhost } from "@ui/components/ui/Buttons";
import { track } from "@shared/lib/analytics";
import type { NormalizedOffer } from "@shared/lib/offers";
import { useOffers } from "@shared/features/offers/api/useOffers";
import { useFavorites } from "@shared/lib/useFavorites";

function normalizeStr(s: string) {
  return s.toLowerCase().normalize("NFKD");
}

function safeOrigin(): string | undefined {
  try {
    return typeof location !== "undefined" ? location.origin : undefined;
  } catch {
    return undefined;
  }
}

export default function ComparePage() {
  const t = useT();
  const { offers, error } = useOffers();

  const [params, setParams] = useSearchParams();
  const vertical = useVertical();
  const initialQ = params.get("q") ?? "";

  const [sortKey, setSortKey] = useState<any>(vertical.compare.defaultSort.key);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(vertical.compare.defaultSort.dir);
  const [filters, setFilters] = useState<Record<string, any>>({ q: initialQ });
  const [registry, setRegistry] = useState<AttributeRegistryItem[] | null>(null);

  const parseQueryToFilters = (sp: URLSearchParams): Record<string, any> => {
    const obj: Record<string, any> = {};
    for (const [k, v] of sp.entries()) {
      if (!v) continue;
      if (k === "sort" || k === "dir" || k === "focus") continue;
      if (v.includes("..")) {
        const [minStr, maxStr] = v.split("..");
        const min = minStr !== "" ? Number(minStr) : undefined;
        const max = maxStr !== "" ? Number(maxStr) : undefined;
        const hasMin = typeof min === "number" && Number.isFinite(min);
        const hasMax = typeof max === "number" && Number.isFinite(max);
        if (hasMin || hasMax) obj[k] = { ...(hasMin ? { min } : {}), ...(hasMax ? { max } : {}) };
        continue;
      }
      if (v.includes(",")) { obj[k] = v.split(","); continue; }
      if (v === "1" || v === "0" || v.toLowerCase() === "true" || v.toLowerCase() === "false") { obj[k] = v === "1" || v.toLowerCase() === "true"; continue; }
      obj[k] = v;
    }
    return obj;
  };

  // read URL -> state on mount and when URL changes (back/forward)
  useEffect(() => {
    const s = (params.get("sort") as any) || vertical.compare.defaultSort.key;
    const d = (params.get("dir") as "asc" | "desc") || vertical.compare.defaultSort.dir;
    setSortKey(s);
    setSortDir(d);
    setFilters(parseQueryToFilters(params));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.toString()]);

  // We keep legacy CompareTable UI for visual parity.

  // write state -> URL with 250ms debounce
  const writeTimer = useRef<number | null>(null);
  const lastWrittenRef = useRef<string>("");
  useEffect(() => {
    try { if (writeTimer.current) clearTimeout(writeTimer.current as unknown as number); } catch { void 0; }
    writeTimer.current = (setTimeout(() => {
      const next = new URLSearchParams();
      for (const [k, v] of Object.entries(filters)) {
        if (v == null) continue;
        if (Array.isArray(v)) { if (v.length) next.set(k, v.join(",")); continue; }
        if (typeof v === "object") {
          const min = (v as any).min; const max = (v as any).max;
          const hasMin = typeof min === "number" && Number.isFinite(min);
          const hasMax = typeof max === "number" && Number.isFinite(max);
          if (hasMin || hasMax) next.set(k, `${hasMin ? min : ""}..${hasMax ? max : ""}`);
          continue;
        }
        const s = String(v).trim(); if (s) next.set(k, s);
      }
      next.set("sort", String(sortKey));
      next.set("dir", sortDir);
      const target = next.toString();
      if (target !== params.toString()) { lastWrittenRef.current = target; setParams(next, { replace: true }); }
    }, 250) as unknown) as number;
    return () => { try { if (writeTimer.current) clearTimeout(writeTimer.current as unknown as number); } catch { void 0; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters), sortKey, sortDir]);

  // Cache attributes registry once to avoid duplicate fetching in children
  useEffect(() => {
    let active = true;
    fetchAttributeRegistry().then((data) => { if (active) setRegistry(data); }).catch(() => void 0);
    return () => { active = false; };
  }, []);

  const { items: favItems } = useFavorites();

  const filtered: NormalizedOffer[] = useMemo(() => {
    let arr = [...offers];
    const qStr = String(filters.q ?? '').trim();
    if (qStr) {
      const q = normalizeStr(qStr);
      arr = arr.filter((o) => {
        const hay = [o.name, o.license, ...(o.methods ?? [])].join(' ');
        return normalizeStr(hay).includes(q);
      });
    }
    // exclude favorites from compare by default
    arr = arr.filter((o) => !!o.slug && !favItems.includes(o.slug));
    return arr;
  }, [offers, filters.q, favItems]);

  // Resolve numeric product IDs for the currently visible offers (no slug in product_id queries)
  const [productIds, setProductIds] = useState<number[]>([]);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const slugs = filtered.map((o) => o.slug).filter(Boolean) as string[];
        if (!slugs.length) { if (active) setProductIds([]); return; }
        const { data, error } = await (supabase as any)
          .from("offers")
          .select("id,slug")
          .in("slug", slugs);
        if (error) throw error;
        const ids = Array.from(new Set(((data ?? []) as any[]).map((r) => Number(r.id)).filter((n) => Number.isFinite(n))));
        if (active) setProductIds(ids as number[]);
      } catch {
        /* keep previous ids to avoid flicker */
      }
    })();
    return () => { active = false; };
  }, [filtered.map((o) => o.slug).join(",")]);

  const origin = safeOrigin();
  const errText = typeof error === "string" ? error : (error as any)?.message ?? "";

  const jsonLd = useMemo(() => {
    const webPage = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Compare",
      url: origin ? `${origin}/compare` : "/compare",
    };
    const itemList = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: filtered.map((o, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: origin ? `${origin}/offers/${encodeURIComponent(o.slug)}` : `/offers/${encodeURIComponent(o.slug)}`,
        name: o.name,
      })),
    };
    return [webPage, itemList];
  }, [filtered, origin]);

  const shareFilters = useCallback(async () => {
    try {
      const url = typeof location !== "undefined" ? location.href : "";
      if (!url) return;
      track("compare_share", { total: offers.length, filtered: filtered.length, hasSearch: !!filters.q });
      await navigator.clipboard.writeText(url);
      alert("Link copied to clipboard.");
    } catch {
      const url = typeof location !== "undefined" ? location.href : "";
      if (url) prompt("Copy URL:", url);
    }
  }, [offers.length, filtered.length, filters.q]);

  // Debounced search tracking to avoid spamming
  const searchDebounceRef = useRef<number | null>(null);
  useEffect(() => {
    try { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current as unknown as number); } catch { /* noop */ }
    searchDebounceRef.current = (setTimeout(() => {
      try { track("compare_search", { q_len: String(filters.q ?? '').length, has_q: !!filters.q }); } catch { /* noop */ }
    }, 500) as unknown) as number;
    return () => {
      try { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current as unknown as number); } catch { /* noop */ }
    };
  }, [filters.q]);

  return (
    <PageShell>
      <Seo
        title={(t("compare.title") || "Compare") + " - " + (t("compare.subtitle") || "smart filters")}
        description={t("compare.subtitle") || "Compare offers with dynamic filters and columns."}
        canonical={origin ? `${origin}/compare` : undefined}
        jsonLd={jsonLd}
      />

      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4">{t("compare.title") || "Compare"}</h1>

      <SectionCard>
        <FiltersBuilder
          initial={filters}
          onChange={(vals) => setFilters(vals)}
          productIds={productIds.map((id) => String(id))}
          registry={registry ?? undefined}
        />
        <div className="flex justify-end">
          <ButtonGhost onClick={shareFilters} aria-label={t("compare.share") || "Share filters"}>{t("compare.share") || "Share"}</ButtonGhost>
        </div>
      </SectionCard>

      {errText && (
        <SectionCard><div className="text-red-400">{(t("common.error") || "Error") + ": " + (t("offers.loadingError") || "loading offers")}: {errText}</div></SectionCard>
      )}

      {filtered.length === 0 ? (
        <SectionCard>
          <div className="text-[var(--text-dim)]">{t("filters.noResults") || "No offers match the filters."}</div>
        </SectionCard>
      ) : (
        <SectionCard className="p-0">
          <CompareTable
            offers={filtered}
            sortKey={sortKey as any}
            sortDir={sortDir}
            onSortChange={(k: any, d: "asc" | "desc") => { setSortKey(k); setSortDir(d); }}
            registry={registry ?? undefined}
          />
        </SectionCard>
      )}
    </PageShell>
  );
}

