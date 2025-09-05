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

export default function FavoritesPage() {
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
      name: "Избранное",
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
    if (!confirm("Очистить весь список избранного?")) return;
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
      toast("Скопировано", { variant: "success" });
    } catch {
      prompt("Скопируйте ссылку вручную:", url);
    }
  }, [items]);

  return (
    <>
      <Seo title="Избранное — ваши сохранённые казино" description="Быстрый доступ к сохранённым офферам." canonical={origin ? origin + "/favorites" : undefined} jsonLd={jsonLd} ogImage="/og.svg" />

      <PageShell>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4">Избранное</h1>
        {favOffers.length > 0 && (
          <SectionCard actions={
            <>
              <ButtonGhost onClick={clearAll}>Очистить избранное</ButtonGhost>
              <ButtonPrimary onClick={shareList}><Share2 className="h-4 w-4 mr-1" /> Поделиться списком</ButtonPrimary>
            </>
          }>
            <p className="text-sm/6 text-neutral-300">Ваши сохранённые офферы.</p>
          </SectionCard>
        )}

      <div className="space-y-6">
        {/* баннер импорта из URL */}
        {missing.length > 0 && (
          <SectionCard>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm">
                Найден список к импорту: <b>{missing.length}</b> элементов
              </div>
              <div className="flex gap-2">
                <ButtonGhost onClick={importMissing}>
                  Импортировать
                </ButtonGhost>
                <ButtonGhost
                  onClick={() => {
                    const next = new URLSearchParams(params);
                    next.delete("list");
                    setParams(next, { replace: true });
                  }}
                >
                  Скрыть
                </ButtonGhost>
              </div>
            </div>
          </SectionCard>
        )}

        {isLoading ? (
          <SectionCard>Загрузка…</SectionCard>
        ) : favOffers.length === 0 ? (
          <SectionCard>Вы ещё ничего не добавили.</SectionCard>
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








