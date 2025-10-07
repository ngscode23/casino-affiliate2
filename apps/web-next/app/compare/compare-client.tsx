"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Script from "next/script";

import { useVertical } from "@shared/ctx/VerticalContext";
import FiltersBuilder from "@ui/builders/FiltersBuilder";
import { fetchAttributeRegistry } from "@shared/lib/attributes";
import type { AttributeRegistryItem } from "@casino-affiliate/types/attributes";
import { supabase } from "@shared/lib/supabase";
import CompareTable from "@ui/components/compare/CompareTable";
import { useT } from "@shared/lib/useT";
import PageShell from "@ui/components/ui/PageShell";
import SectionCard from "@ui/components/ui/SectionCard";
import { ButtonGhost } from "@ui/components/ui/Buttons";
import { track } from "@shared/lib/analytics";
import type { NormalizedOffer } from "@shared/lib/offers";
import { useOffers } from "@shared/features/offers/api/useOffers";
import { useFavorites } from "@shared/lib/useFavorites";

function normalizeStr(value: string) {
  return value.toLowerCase().normalize("NFKD");
}

function safeOrigin(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return window.location.origin;
  } catch {
    return undefined;
  }
}

function parseQueryToFilters(searchParams: URLSearchParams): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, rawValue] of searchParams.entries()) {
    if (!rawValue || ["sort", "dir", "focus"].includes(key)) continue;

    if (rawValue.includes("..")) {
      const [minStr, maxStr] = rawValue.split("..");
      const min = minStr !== "" ? Number(minStr) : undefined;
      const max = maxStr !== "" ? Number(maxStr) : undefined;
      const hasMin = typeof min === "number" && Number.isFinite(min);
      const hasMax = typeof max === "number" && Number.isFinite(max);
      if (hasMin || hasMax) {
        result[key] = {
          ...(hasMin ? { min } : {}),
          ...(hasMax ? { max } : {}),
        };
      }
      continue;
    }

    if (rawValue.includes(",")) {
      result[key] = rawValue.split(",");
      continue;
    }

    if (["1", "0", "true", "false"].includes(rawValue.toLowerCase())) {
      result[key] = rawValue === "1" || rawValue.toLowerCase() === "true";
      continue;
    }

    result[key] = rawValue;
  }
  return result;
}

function CompareContent() {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const vertical = useVertical();
  const compareConfig = vertical.compare;
  const compareColumns = compareConfig.columns;
  const { key: defaultSortKey, dir: defaultSortDir } = compareConfig.defaultSort;
  const { offers, error } = useOffers();
  const { items: favItems } = useFavorites();

  const [registry, setRegistry] = useState<AttributeRegistryItem[] | null>(null);
  const [sortKey, setSortKey] = useState<any>(defaultSortKey);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(defaultSortDir);
  const [filters, setFilters] = useState<Record<string, any>>({ q: "" });

  const searchString = searchParams.toString();

  // Sync URL -> state
  useEffect(() => {
    const current = new URLSearchParams(searchString);
    const sort = (current.get("sort") as any) || defaultSortKey;
    const dir = (current.get("dir") as "asc" | "desc") || defaultSortDir;
    setSortKey(sort);
    setSortDir(dir);
    setFilters(parseQueryToFilters(current));
  }, [searchString, defaultSortKey, defaultSortDir]);

  // Sync state -> URL with debounce
  const writeTimer = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (writeTimer.current) clearTimeout(writeTimer.current);

    writeTimer.current = setTimeout(() => {
      const next = new URLSearchParams();
      for (const [key, value] of Object.entries(filters)) {
        if (value == null) continue;
        if (Array.isArray(value)) {
          if (value.length) next.set(key, value.join(","));
          continue;
        }
        if (typeof value === "object") {
          const min = (value as any).min;
          const max = (value as any).max;
          const hasMin = typeof min === "number" && Number.isFinite(min);
          const hasMax = typeof max === "number" && Number.isFinite(max);
          if (hasMin || hasMax) next.set(key, `${hasMin ? min : ""}..${hasMax ? max : ""}`);
          continue;
        }
        const str = String(value).trim();
        if (str) next.set(key, str);
      }
      next.set("sort", String(sortKey));
      next.set("dir", sortDir);

      const target = next.toString();
      if (target !== searchParams.toString()) {
        router.replace(target ? `${pathname}?${target}` : pathname, { scroll: false });
      }
    }, 250);

    return () => {
      if (writeTimer.current) clearTimeout(writeTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters), sortKey, sortDir, pathname]);

  useEffect(() => {
    let active = true;
    fetchAttributeRegistry()
      .then((data) => {
        if (active) setRegistry(data);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const filtered: NormalizedOffer[] = useMemo(() => {
    if (!offers?.length) return [];

    const q = (filters.q as string | undefined)?.trim();
    const normalizedQ = q ? normalizeStr(q) : "";
    let current = offers.slice();

    if (normalizedQ) {
      current = current.filter((offer) => normalizeStr(offer.name ?? "").includes(normalizedQ));
    }

    if (!filters.focus) {
      // useFavorites() returns an array of favorite slugs (strings)
      const favSet = new Set(favItems.map((s) => String(s)));
      current = current.map((offer) => ({ ...offer, isFavorite: favSet.has(offer.slug) }));
    }

    // Built-in sorters based on configured columns
    type SortKey = (typeof compareColumns)[number];
    const key = (sortKey as SortKey) ?? defaultSortKey;
    if (compareColumns.includes(key)) {
      const cmp = (a: NormalizedOffer, b: NormalizedOffer): number => {
        switch (key) {
          case "rating":
            return (a.rating ?? 0) - (b.rating ?? 0);
          case "payoutHours":
            return (a.payoutHours ?? Number.POSITIVE_INFINITY) - (b.payoutHours ?? Number.POSITIVE_INFINITY);
          case "license": {
            const la = String(a.license || "");
            const lb = String(b.license || "");
            return la.localeCompare(lb);
          }
          case "methods": {
            const ma = Array.isArray(a.methods) ? a.methods.length : 0;
            const mb = Array.isArray(b.methods) ? b.methods.length : 0;
            return ma - mb;
          }
          default:
            return 0;
        }
      };
      current = [...current].sort((a, b) => (sortDir === "asc" ? cmp(a, b) : -cmp(a, b)));
    }

    return current;
  }, [offers, filters.q, filters.focus, favItems, sortKey, sortDir, compareColumns, defaultSortKey]);

  const filteredSlugs = useMemo(
    () =>
      filtered
        .map((offer) => offer.slug)
        .filter((slug): slug is string => Boolean(slug)),
    [filtered]
  );

  const [productIds, setProductIds] = useState<number[]>([]);
  useEffect(() => {
    let active = true;
    if (!filteredSlugs.length) {
      setProductIds([]);
      return;
    }
    (async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("offers")
          .select("id,slug")
          .in("slug", filteredSlugs);
        if (error) throw error;
        const ids = Array.from(
          new Set(((data ?? []) as any[]).map((row) => Number(row.id)).filter((value) => Number.isFinite(value)))
        );
        if (active) setProductIds(ids as number[]);
      } catch {
        if (active) setProductIds((prev) => prev);
      }
    })();
    return () => {
      active = false;
    };
  }, [filteredSlugs, filtered.length]);

  const origin = safeOrigin();
  const errText = typeof error === "string" ? error : (error as any)?.message ?? "";

  const jsonLd = useMemo(() => {
    const baseUrl = origin ? `${origin}/compare` : "/compare";
    const list = filtered.map((offer, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: origin ? `${origin}/offers/${encodeURIComponent(offer.slug)}` : `/offers/${encodeURIComponent(offer.slug)}`,
      name: offer.name,
    }));
    return [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Compare",
        url: baseUrl,
      },
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        itemListElement: list,
      },
    ];
  }, [filtered, origin]);

  const shareFilters = useCallback(async () => {
    try {
      if (typeof window === "undefined") return;
      const url = window.location.href;
      if (!url) return;
      track("compare_share", { total: offers.length, filtered: filtered.length, hasSearch: !!filters.q });
      await navigator.clipboard.writeText(url);
      window.alert("Link copied to clipboard.");
    } catch {
      if (typeof window !== "undefined") {
        const url = window.location.href;
        if (url) window.prompt("Copy URL:", url);
      }
    }
  }, [offers.length, filtered.length, filters.q]);

  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      try {
        track("compare_search", { q_len: String(filters.q ?? "").length, has_q: !!filters.q });
      } catch {
        /* noop */
      }
    }, 500);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [filters.q]);

  return (
    <PageShell>
      <Script id="compare-jsonld" type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify(jsonLd)}
      </Script>

      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4">{t("compare.title") || "Compare"}</h1>

      <SectionCard>
        <FiltersBuilder
          initial={filters}
          onChange={setFilters}
          productIds={productIds.map((id) => String(id))}
          registry={registry ?? undefined}
        />
        <div className="flex justify-end">
          <ButtonGhost onClick={shareFilters} aria-label={t("compare.share") || "Share filters"}>
            {t("compare.share") || "Share"}
          </ButtonGhost>
        </div>
      </SectionCard>

      {errText ? (
        <SectionCard>
          <div className="text-[var(--text-error, #f87171)]">
            {(t("common.error") || "Error") + ": " + (t("offers.loadingError") || "loading offers")}: {errText}
          </div>
        </SectionCard>
      ) : null}

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
            onSortChange={(key: any, dir: "asc" | "desc") => {
              setSortKey(key);
              setSortDir(dir);
            }}
            registry={registry ?? undefined}
          />
        </SectionCard>
      )}
    </PageShell>
  );
}

export default function ComparePageClient() {
  return (
    <>
      {/* Wrap searchParams usage in Suspense to satisfy Next.js */}
      <Suspense fallback={null}>
        <CompareContent />
      </Suspense>
    </>
  );
}





