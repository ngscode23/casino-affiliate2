// src/pages/Offers/index.tsx

import { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";

import Section from "@/components/common/section";
import Card from "@/components/common/card";
import Seo from "@/components/Seo";
import { SITE_URL } from "@/config";

import OfferListFeature from "@/features/offers/components/OfferListFeature";
import { useOffers } from "@/features/offers/api/useOffers";
import OfferFiltersFeature, { type OffersFilterState } from "@/features/offers/components/OfferFiltersFeature";

import { getRecent } from "@/lib/recent";
import { offersNormalized, type NormalizedOffer } from "@/lib/offers";

export default function OffersIndex() {
  const { offers, isLoading, error } = useOffers();
  const [params, setParams] = useSearchParams();

  const initialFilters = useMemo<OffersFilterState>(() => {
    const lic = (params.get("license") as OffersFilterState["license"]) || "all";
    const q = params.get("q") || "";
    return { license: lic, q };
  }, [params]);

  const [filters, setFilters] = useState<OffersFilterState>(initialFilters);

  // Sync filters to URL
  useEffect(() => {
    const next = new URLSearchParams(params);
    if (filters.license && filters.license !== "all") next.set("license", filters.license);
    else next.delete("license");

    if (filters.q && filters.q.trim()) next.set("q", filters.q.trim());
    else next.delete("q");

    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.license, filters.q]);

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
  }, [offers]);

  // JSON-LD: collection + filtered item list
  const origin = SITE_URL.replace(/\/$/, "");
  const visibleForJsonLd: NormalizedOffer[] = useMemo(() => {
    let arr = [...offers];
    if (filters.license !== "all") arr = arr.filter((o) => o.license === filters.license);
    if (filters.q.trim()) {
      const qn = filters.q.trim().toLowerCase();
      arr = arr.filter((o) => {
        const hay = [o.name, o.license, ...(o.methods ?? [])].join(" ").toLowerCase();
        return hay.includes(qn);
      });
    }
    return arr.slice(0, 20);
  }, [offers, filters.license, filters.q]);

  const jsonLd = useMemo(() => {
    const collection = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "All Casino Offers",
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
    <Section className="space-y-6">
      <Seo
        title="All Casino Offers - browse & filter"
        description="Browse all casino offers and filter by license or search."
        ogImage="/og.svg"
        canonical={`${origin}/offers`}
        jsonLd={jsonLd}
      />

      <h1 className="text-2xl font-bold">All Offers</h1>

      <Card className="p-4 sticky top-3 z-20 backdrop-blur supports-[backdrop-filter]:bg-[color:rgb(0_0_0_/_0.35)]">
        <OfferFiltersFeature initialLicense={filters.license} initialQ={filters.q} onChange={setFilters} />
      </Card>

      {isLoading ? (
        <Card className="p-6">Loading...</Card>
      ) : error ? (
        <Card className="p-6 text-red-400">Error: {String(error)}</Card>
      ) : (
        <OfferListFeature offers={offers} filters={filters} />
      )}

      {recentOffers.length > 0 && (
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-3">Recently Viewed</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recentOffers.map((o) => (
              <Link
                key={o.slug}
                to={`/offers/${encodeURIComponent(o.slug)}`}
                className="neon-card p-4 hover:opacity-90"
              >
                <div className="font-medium">{o.name}</div>
                <div className="text-sm text-[var(--text-dim)]">
                  License: {o.license ?? "-"} · Payout: {o.payout}
                  {o.payoutHours ? ` (~${o.payoutHours}h)` : ""}
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-6 space-y-2">
        <p className="text-[var(--text-dim)]">Want a side-by-side view? Try Compare.</p>
        <Link className="underline cursor-pointer" to="/compare">
          Go to Compare
        </Link>
      </Card>
    </Section>
  );
}
