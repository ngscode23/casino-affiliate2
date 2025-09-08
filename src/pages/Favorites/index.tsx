import { useMemo, useCallback, useState } from "react";
import PageShell from "@/components/ui/PageShell";
import SectionCard from "@/components/ui/SectionCard";
import { ButtonPrimary, ButtonGhost } from "@/components/ui/Buttons";
import Seo from "@/components/Seo";
import MobileOfferCard from "@/components/offers/MobileOfferCard";
import CompareTable, { type SortKey } from "@/components/compare/CompareTable";
import { offersNormalized, type NormalizedOffer } from "@/lib/offers";
import { useFavorites } from "@/lib/useFavorites";
import { useOffers } from "@/features/offers/api/useOffers";
import { useSearchParams } from "react-router-dom";
import { SITE_URL } from "@/config";
import { toast } from "@/components/common/toast";
import { Share2 } from "lucide-react";
import { useT } from "@/lib/useT";

export default function FavoritesPage() {
  const t = useT();
  // избранное
  const { items, isLoading, add, remove } = useFavorites();
  const { offers } = useOffers();

  // сортировки для таблицы
  const [sortKey, setSortKey] = useState<SortKey>("rating");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // импорт по URL: /favorites?list=slug1,slug2
  const [params, setParams] = useSearchParams();
  const incomingList = useMemo(() => {
    const raw = params.get("list") || "";
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [params]);

  const missing = useMemo(
    () => incomingList.filter((slug) => !items.includes(slug)),
    [incomingList, items]
  );

  // нормализованные офферы из избранного
    const favOffers: NormalizedOffer[] = useMemo(() => {
    const saved = Array.isArray(items) ? items : [];
    const bySlugApi = new Map((offers ?? []).map((o) => [o.slug, o]));
    const bySlugStatic = new Map(offersNormalized.map((o) => [o.slug, o]));
    return saved.map((slug) => {
      const fromApi = bySlugApi.get(slug);
      if (fromApi) return fromApi as NormalizedOffer;
      const fromStatic = bySlugStatic.get(slug);
      if (fromStatic) return fromStatic as NormalizedOffer;
      return {
        slug,
        name: "Unknown offer (" + slug + ")",
        rating: 0,
        payout: "-",
        payoutHours: undefined,
        license: "Other",
        methods: [],
        link: undefined,
        enabled: false,
        position: undefined,
      } as NormalizedOffer;
    });
  }, [items, offers]);

  // SEO
  const origin = (SITE_URL || "").replace(/\/$/, "");
  const jsonLd = useMemo(() => {
    const webPage = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: t("nav.favorites") || "Favorites",
      url: origin ? origin + "/favorites" : undefined,
    };
    const itemList = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: favOffers.map((o, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: origin ? origin + "/offers/" + encodeURIComponent(o.slug) : undefined,
        name: o.name,
      })),
    };
    return [webPage, itemList];
  }, [favOffers, origin]);

  // очистка избранного
  const clearAll = useCallback(async () => {
    if (!items?.length) return;
    if (!confirm(t("favorites.clearConfirm") || "Clear all favorites?")) return;
    for (const slug of items ?? []) {
      await remove(slug);
    }
  }, [items, remove]);

  // импорт из URL
  const importMissing = useCallback(async () => {
    for (const slug of missing) {
      await add(slug);
    }
    const next = new URLSearchParams(params);
    next.delete("list");
    setParams(next, { replace: true });
  }, [missing, add, params, setParams]);

  // поделиться списком
  const shareList = useCallback(async () => {
    const origin = (SITE_URL || location.origin || "").replace(/\/$/, "");
    const url = origin + "/favorites?list=" + items.join(",");
    try {
      await navigator.clipboard.writeText(url);
      toast(t("favorites.copied") || "Copied", { variant: "success" });
    } catch {
      prompt(t("favorites.copyManual") || "Copy link manually:", url);
    }
  }, [items]);

  return (
    <>
      <Seo title={(t("nav.favorites") || "Favorites") + " — " + (t("favorites.savedSubtitle") || "your saved offers")} description={t("favorites.description") || "Quick access to your saved offers."} canonical={origin ? origin + "/favorites" : undefined} jsonLd={jsonLd} ogImage="/og.svg" />

      <PageShell>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4">{t("nav.favorites") || "Favorites"}</h1>
        {favOffers.length > 0 && (
          <SectionCard actions={
            <>
              <ButtonGhost onClick={clearAll}>{t("favorites.clear") || "Clear favorites"}</ButtonGhost>
              <ButtonPrimary onClick={shareList}><Share2 className="h-4 w-4 mr-1" /> {t("favorites.share") || "Share list"}</ButtonPrimary>
            </>
          }>
            <p className="text-sm/6 text-neutral-300">{t("favorites.savedSubtitle") || "Your saved offers."}</p>
          </SectionCard>
        )}

      <div className="space-y-6">
        {/* баннер импорта из URL */}
        {missing.length > 0 && (
          <SectionCard>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm">
                {(t("favorites.importFound") || "Found a list to import:") + " "}<b>{missing.length}</b> {(t("favorites.items") || "items")}
              </div>
              <div className="flex gap-2">
                <ButtonGhost onClick={importMissing}>
                  {t("favorites.import") || "Import"}
                </ButtonGhost>
                <ButtonGhost
                  onClick={() => {
                    const next = new URLSearchParams(params);
                    next.delete("list");
                    setParams(next, { replace: true });
                  }}
                >
                  {t("favorites.hide") || "Hide"}
                </ButtonGhost>
              </div>
            </div>
          </SectionCard>
        )}

        {isLoading ? (
          <>
            {/* mobile skeletons */}
            <SectionCard className="md:hidden" contentClassName="gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-white/10 bg-[var(--bg-1)] p-4 h-[180px]" aria-hidden>
                  <div className="flex justify-between"><div className="relative overflow-hidden bg-white/5 rounded-md h-5 w-2/3" /></div>
                  <div className="relative overflow-hidden bg-white/5 rounded-md h-4 w-3/4 mt-3" />
                  <div className="grid grid-cols-3 gap-2 mt-6">
                    <div className="relative overflow-hidden bg-white/5 rounded-md h-10" />
                    <div className="relative overflow-hidden bg-white/5 rounded-md h-10" />
                    <div className="relative overflow-hidden bg-white/5 rounded-md h-10" />
                  </div>
                </div>
              ))}
            </SectionCard>

            {/* desktop table skeleton */}
            <SectionCard className="hidden md:block p-0">
              {/* reuse compare skeleton */}
              {/** keep identical row height to avoid layout shift */}
              <div className="p-0 overflow-hidden">
                <table className="w-full">
                  <thead className="sticky top-0 bg-[rgb(var(--bg-1)/.9)] z-10">
                    <tr>
                      {["COMPARE","FAV","FIRM","RATING","LICENSE","PAYOUT","METHODS","ACTION"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-[12px] uppercase text-[var(--muted)]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="h-16">
                        {Array.from({ length: 8 }).map((__, j) => (
                          <td key={j} className="px-4 py-3"><div className="relative overflow-hidden bg-white/5 rounded-md h-5" /></td>
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
            <div className="text-[var(--text-dim)]">{t("favorites.empty") || "You haven't added anything yet."}</div>
            <div className="mt-2">
              <a href="/offers" className="underline">{t("favorites.goToOffers") || "Go to offers"}</a>
            </div>
          </SectionCard>
        ) : (
          <>
            {/* мобайл — карточки */}
            <SectionCard className="md:hidden" contentClassName="gap-3 sm:gap-4">
              {favOffers.map((o) => (
                <MobileOfferCard key={o.slug} offer={o} />
              ))}
            </SectionCard>

            {/* десктоп — таблица */}
            <SectionCard className="hidden md:block p-0">
              <CompareTable
                offers={favOffers}
                sortKey={sortKey}
                sortDir={sortDir}
                onSortChange={(k, d) => {
                  setSortKey(k);
                  setSortDir(d);
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








