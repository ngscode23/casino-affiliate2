"use client";
import { useMemo, useCallback, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Share2 } from "lucide-react";

import Script from "next/script";
import PageShell from "@ui/components/ui/PageShell";
import SectionCard from "@ui/components/ui/SectionCard";
import { ButtonGhost, ButtonPrimary } from "@ui/components/ui/Buttons";
import MobileOfferCard from "@ui/components/offers/MobileOfferCard";
import CompareTable, { type SortKey } from "@ui/components/compare/CompareTable";
import { offersNormalized, type NormalizedOffer } from "@shared/lib/offers";
import { useFavorites } from "@shared/lib/useFavorites";
import { useOffers } from "@shared/features/offers/api/useOffers";
import { SITE_URL } from "@shared/config";
import { useT } from "@shared/lib/useT";
import { toast } from "@ui/components/common/toast";

function sanitizeListParam(value: string): string[] {
  return value
    .split(",")
    .map((slug) => slug.trim())
    .filter(Boolean);
}

function fallbackOffer(slug: string): NormalizedOffer {
  return {
    slug,
    name: `Unknown offer (${slug})`,
    rating: 0,
    license: "Other",
    payout: "-",
    methods: [],
    enabled: false,
  } as NormalizedOffer;
}

function normalizeOrigin(): string {
  const explicit = (SITE_URL || "").trim();
  if (explicit) return explicit.replace(/\/$/, "");
  if (typeof window !== "undefined") {
    try {
      return window.location.origin.replace(/\/$/, "");
    } catch {
      return "";
    }
  }
  return "";
}

export default function FavoritesPageClient() {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchString = searchParams?.toString() ?? "";

  const { items, isLoading, add, clear } = useFavorites();
  const { offers, isLoading: offersLoading } = useOffers();

  const [sortKey, setSortKey] = useState<SortKey>("rating");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const incomingList = useMemo(() => {
    if (!searchString) return [];
    const params = new URLSearchParams(searchString);
    const raw = params.get("list") || "";
    return sanitizeListParam(raw);
  }, [searchString]);

  const missing = useMemo(
    () => incomingList.filter((slug) => !items.includes(slug)),
    [incomingList, items]
  );

  const favOffers = useMemo(() => {
    const saved = Array.isArray(items) ? items : [];
    const bySlugApi = new Map((offers ?? []).map((offer) => [offer.slug, offer]));
    const bySlugStatic = new Map(offersNormalized.map((offer) => [offer.slug, offer]));
    return saved.map((slug) => {
      const api = bySlugApi.get(slug);
      if (api) return api;
      const fallback = bySlugStatic.get(slug);
      return fallback ?? fallbackOffer(slug);
    });
  }, [items, offers]);

  const origin = useMemo(() => normalizeOrigin(), []);

  const updateQuery = useCallback(
    (mutator: (params: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchString);
      mutator(next);
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname, searchString]
  );

  const clearAll = useCallback(() => {
    if (!items.length) return;
    const msg = t("favorites.clearConfirm") || "Clear all favorites?";
    if (typeof window !== "undefined" && !window.confirm(msg)) return;
    clear();
  }, [items.length, clear, t]);

  const importMissing = useCallback(async () => {
    if (!missing.length) return;
    for (const slug of missing) {
      await add(slug);
    }
    updateQuery((params) => params.delete("list"));
  }, [missing, add, updateQuery]);

  const hideList = useCallback(() => {
    updateQuery((params) => params.delete("list"));
  }, [updateQuery]);

  const shareList = useCallback(async () => {
    if (!items.length) return;
    const base = origin || normalizeOrigin();
    const url = `${base}/favorites?list=${items.map((slug) => encodeURIComponent(slug)).join(",")}`;
    try {
      await navigator.clipboard.writeText(url);
      toast(t("favorites.copied") || "Copied", { variant: "success" });
    } catch {
      if (typeof window !== "undefined") {
        const fallback = t("favorites.copyManual") || "Copy link manually:";
        window.prompt(fallback, url);
      }
    }
  }, [items, origin, t]);

  const loading = isLoading || offersLoading;

  const jsonLd = useMemo(() => {
    const pageUrl = origin ? `${origin}/favorites` : "/favorites";
    const list = favOffers.map((offer, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: origin
        ? `${origin}/offers/${encodeURIComponent(offer.slug)}`
        : `/offers/${encodeURIComponent(offer.slug)}`,
      name: offer.name,
    }));
    return [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: t("nav.favorites") || "Favorites",
        url: pageUrl,
      },
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        itemListElement: list,
      },
    ];
  }, [favOffers, origin, t]);

  const title =
    (t("nav.favorites") || "Favorites") + " - " + (t("favorites.savedSubtitle") || "your saved offers");
  const description = t("favorites.description") || "Quick access to your saved offers.";

  return (
    <>
  <script
    id="favorites-jsonld"
    type="application/ld+json"
    suppressHydrationWarning
    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
  />
  <PageShell>
    <h1 className="mb-4 text-3xl font-semibold tracking-tight sm:text-4xl">
      {t('nav.favorites') ?? 'Favorites'}
    </h1>
    {/* остальное */}


        <h1 className="mb-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("nav.favorites") || "Favorites"}
        </h1>

        {favOffers.length > 0 && (
          <SectionCard
            actions={
              <>
                <ButtonGhost onClick={clearAll}>
                  {t("favorites.clear") || "Clear favorites"}
                </ButtonGhost>
                <ButtonPrimary onClick={shareList}>
                  <Share2 className="mr-1 h-4 w-4" />
                  {t("favorites.share") || "Share list"}
                </ButtonPrimary>
              </>
            }
          >
            <p className="text-sm text-[var(--muted)]">
              {t("favorites.savedSubtitle") || "Your saved offers."}
            </p>
          </SectionCard>
        )}

        <div className="space-y-6">
          {missing.length > 0 && (
            <SectionCard>
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm">
                  {(t("favorites.importFound") || "Found a list to import:") + " "}
                  <b>{missing.length}</b> {(t("favorites.items") || "items")}
                </div>
                <div className="flex gap-2">
                  <ButtonGhost onClick={importMissing}>
                    {t("favorites.import") || "Import"}
                  </ButtonGhost>
                  <ButtonGhost onClick={hideList}>
                    {t("favorites.hide") || "Hide"}
                  </ButtonGhost>
                </div>
              </div>
            </SectionCard>
          )}

          {loading ? (
            <>
              <SectionCard className="md:hidden" contentClassName="gap-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-[180px] rounded-2xl border border-white/10 bg-[var(--bg-1)] p-4"
                    aria-hidden
                  >
                    <div className="flex justify-between">
                      <div className="h-5 w-2/3 rounded-md bg-white/5" />
                    </div>
                    <div className="mt-3 h-4 w-3/4 rounded-md bg-white/5" />
                    <div className="mt-6 grid grid-cols-3 gap-2">
                      {Array.from({ length: 3 }).map((__, i) => (
                        <div key={i} className="h-10 rounded-md bg-white/5" />
                      ))}
                    </div>
                  </div>
                ))}
              </SectionCard>

              <SectionCard className="hidden p-0 md:block">
                <div className="overflow-hidden">
                  <table className="w-full">
                    <thead className="sticky top-0 z-10 bg-[rgb(var(--bg-1)/.9)]">
                      <tr>
                        {["COMPARE", "FAV", "FIRM", "RATING", "LICENSE", "PAYOUT", "METHODS", "ACTION"].map((header) => (
                          <th key={header} className="px-4 py-3 text-left text-[12px] uppercase text-[var(--muted)]">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 6 }).map((_, rowIndex) => (
                        <tr key={rowIndex} className="h-16">
                          {Array.from({ length: 8 }).map((__, cellIndex) => (
                            <td key={cellIndex} className="px-4 py-3">
                              <div className="h-5 rounded-md bg-white/5" />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            </>
          ) : favOffers.length === 0 ? (
            <SectionCard>
              <div className="text-[var(--text-dim)]">
                {t("favorites.empty") || "You haven't added anything yet."}
              </div>
              <div className="mt-2">
                <Link href="/offers" className="underline">
                  {t("favorites.goToOffers") || "Go to offers"}
                </Link>
              </div>
            </SectionCard>
          ) : (
            <>
              <SectionCard className="md:hidden" contentClassName="gap-3 sm:gap-4">
                {favOffers.map((offer) => (
                  <MobileOfferCard key={offer.slug} offer={offer} />
                ))}
              </SectionCard>

              <SectionCard className="hidden p-0 md:block">
                <CompareTable
                  offers={favOffers}
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSortChange={(key, dir) => {
                    setSortKey(key);
                    setSortDir(dir);
                  }}
                />
              </SectionCard>
            </>
          )}
        </div>
      </PageShell>
     
    </>
     
  );
}



