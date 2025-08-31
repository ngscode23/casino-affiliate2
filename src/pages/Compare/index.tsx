// src/pages/Compare/index.tsx (slim)
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";

import CompareFilters, { type LicenseFilter, type MethodFilter } from "@/components/compare/CompareFilters";
import CompareTable, { type SortKey } from "@/components/compare/CompareTable";
import Seo from "@/components/Seo";
import Button from "@/components/common/button";
import { track } from "@/lib/analytics";
import type { NormalizedOffer } from "@/lib/offers";
import { useOffers } from "@/features/offers/api/useOffers";
import { useFavorites } from "@/lib/useFavorites";

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
  const { offers, error } = useOffers();

  const [params, setParams] = useSearchParams();
  const initialQ = params.get("q") ?? "";

  const [sortKey, setSortKey] = useState<SortKey>("rating");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [license, setLicense] = useState<LicenseFilter>("all");
  const [method, setMethod] = useState<MethodFilter>("all");
  const [search, setSearch] = useState<string>(initialQ);

  useEffect(() => {
    const s = (params.get("sort") as SortKey) || "rating";
    const d = (params.get("dir") as "asc" | "desc") || "desc";
    const lic = (params.get("license") as LicenseFilter) || "all";
    const mth = (params.get("method") as MethodFilter) || "all";
    setSortKey(s);
    setSortDir(d);
    setLicense(lic);
    setMethod(mth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const next = new URLSearchParams(params);
    if (search) next.set("q", search); else next.delete("q");
    next.set("sort", sortKey);
    next.set("dir", sortDir);
    if (license !== "all") next.set("license", license); else next.delete("license");
    if (method !== "all") next.set("method", method); else next.delete("method");
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, sortKey, sortDir, license, method]);

  const { items: favItems } = useFavorites();

  const filtered: NormalizedOffer[] = useMemo(() => {
    let arr = [...offers];
    if (license !== "all") arr = arr.filter((o) => o.license === license);
    if (method !== "all") arr = arr.filter((o) => o.methods.includes(method));
    if (search.trim()) {
      const q = normalizeStr(search.trim());
      arr = arr.filter((o) => {
        const hay = [o.name, o.license, ...(o.methods ?? [])].join(" ");
        return normalizeStr(hay).includes(q);
      });
    }
    // не показываем элементы, которые уже в избранном
    arr = arr.filter((o) => !!o.slug && !favItems.includes(o.slug));
    return arr;
  }, [offers, license, method, search, favItems]);

  const origin = safeOrigin();
  const errText = typeof error === "string" ? error : (error as any)?.message ?? "";

  const jsonLd = useMemo(() => {
    const webPage = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Сравнение казино",
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
      track("compare_share", { total: offers.length, filtered: filtered.length, license, method, hasSearch: !!search });
      await navigator.clipboard.writeText(url);
      alert("Ссылка на сравнение скопирована в буфер обмена.");
    } catch {
      const url = typeof location !== "undefined" ? location.href : "";
      if (url) prompt("Скопируйте ссылку:", url);
    }
  }, []);

  // Track filter changes (license/method) immediately
  useEffect(() => {
    try { track("compare_filter", { license, method }); } catch { /* noop */ }
  }, [license, method]);

  // Debounced search tracking to avoid spamming
  const searchDebounceRef = useRef<number | null>(null);
  useEffect(() => {
    try { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current as unknown as number); } catch { /* noop */ }
    searchDebounceRef.current = (setTimeout(() => {
      try { track("compare_search", { q_len: search.length, has_q: !!search }); } catch { /* noop */ }
    }, 500) as unknown) as number;
    return () => {
      try { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current as unknown as number); } catch { /* noop */ }
    };
  }, [search]);

  return (
    <>
      <Seo
        title="Сравнение казино — лицензии, методы, выплаты"
        description="Фильтруйте по лицензии, методам и рейтингу. Добавляйте бренды в панель и сравнивайте бок‑о‑бок."
        canonical={origin ? `${origin}/compare` : undefined}
        jsonLd={jsonLd}
      />

      <section className="neon-container space-y-6">
        <div className="neon-card p-4">
          <CompareFilters
            total={offers.length}
            filteredCount={filtered.length}
            license={license}
            method={method}
            search={search}
            onChange={({ license: nextLicense, method: nextMethod }) => {
              if (nextLicense !== license) setLicense(nextLicense);
              if (nextMethod !== method) setMethod(nextMethod);
            }}
            onSearchChange={setSearch}
          />
          <div className="mt-3 flex justify-end">
            <Button variant="soft" onClick={shareFilters} aria-label="Поделиться текущей выборкой">
              Поделиться
            </Button>
          </div>
        </div>

        {errText && <div className="neon-card p-3 text-red-400">Ошибка загрузки данных: {errText}</div>}

        <div className="neon-card p-0 hidden md:block">
          <CompareTable
            offers={filtered}
            sortKey={sortKey}
            sortDir={sortDir}
            onSortChange={(k, d) => {
              setSortKey(k);
              setSortDir(d);
            }}
          />
        </div>
      </section>
    </>
  );
}
