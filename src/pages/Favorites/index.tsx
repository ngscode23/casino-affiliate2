import { useMemo, useCallback, useState } from "react";
import Section from "@/components/common/section";
import Card from "@/components/common/card";
import Button from "@/components/common/button";
import Seo from "@/components/Seo";
import MobileOfferCard from "@/components/offers/MobileOfferCard";
import CompareTable, { type SortKey } from "@/components/compare/CompareTable";
import { offersNormalized, type NormalizedOffer } from "@/lib/offers";
import { useFavorites } from "@/lib/useFavorites";
import { useSearchParams } from "react-router-dom";
import { SITE_URL } from "@/config";

export default function FavoritesPage() {
  // избранное
  const { items, isLoading, add, remove } = useFavorites();

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
    return saved.map((slug) => {
      const found = offersNormalized.find((o) => o.slug === slug);
      if (found) return found;
      // безопасный placeholder, если в LS остался мусор
      return {
        slug,
        name: `Unknown offer (${slug})`,
        rating: 0,
        payout: "—",
        payoutHours: undefined,
        license: "Other",
        methods: [],
        link: undefined,
        enabled: false,
        position: undefined,
      } as NormalizedOffer;
    });
  }, [items]);

  // SEO
  const origin = (SITE_URL || "").replace(/\/$/, "");
  const jsonLd = useMemo(() => {
    const webPage = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Избранное",
      url: origin ? `${origin}/favorites` : undefined,
    };
    const itemList = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: favOffers.map((o, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: origin ? `${origin}/offers/${encodeURIComponent(o.slug)}` : undefined,
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
    const url = `${origin}/favorites?list=${items.join(",")}`;
    try {
      await navigator.clipboard.writeText(url);
      alert("Ссылка скопирована в буфер обмена.");
    } catch {
  
      prompt("Скопируйте ссылку вручную:", url);
    }
  }, [items]);

  return (
    <>
      <Seo title="Избранное — ваши сохранённые казино" description="Быстрый доступ к сохранённым офферам." />

      <section className="neon-hero relative">
        <Section>
          <h1
            style={{
              fontWeight: 800,
              letterSpacing: "-0.02em",
              fontSize: "clamp(28px,4.5vw,46px)",
            }}
          >
            Избранное
          </h1>
          <p className="neon-subline mt-2">Ваши сохранённые офферы.</p>

          {favOffers.length > 0 && (
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" onClick={clearAll}>
                Очистить избранное
              </Button>
              <Button variant="soft" onClick={shareList}>
                Поделиться списком
              </Button>
            </div>
          )}
        </Section>
      </section>

      <Section className="space-y-6">
        {/* баннер импорта из URL */}
        {missing.length > 0 && (
          <Card className="p-4 border border-yellow-600/40 bg-yellow-500/10">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm">
                Найден список к импорту: <b>{missing.length}</b> элементов
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={importMissing}>
                  Импортировать
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    const next = new URLSearchParams(params);
                    next.delete("list");
                    setParams(next, { replace: true });
                  }}
                >
                  Скрыть
                </Button>
              </div>
            </div>
          </Card>
        )}

        {isLoading ? (
          <Card className="p-6">Загрузка…</Card>
        ) : favOffers.length === 0 ? (
          <Card className="p-6 text-[var(--text-dim)]">Вы ещё ничего не добавили.</Card>
        ) : (
          <>
            {/* мобайл — карточки */}
            <div className="grid gap-3 sm:gap-4 md:hidden">
              {favOffers.map((o) => (
                <MobileOfferCard key={o.slug} offer={o} />
              ))}
            </div>

            {/* десктоп — таблица */}
            <div className="hidden md:block">
              <CompareTable
                offers={favOffers}
                sortKey={sortKey}
                sortDir={sortDir}
                onSortChange={(k, d) => {
                  setSortKey(k);
                  setSortDir(d);
                }}
              />
            </div>
          </>
        )}
      </Section>
      <Seo title="????????? - ???? ??????????? ??????" description="??????? ?????? ? ??????????? ??????." canonical={origin ? `${origin}/favorites` : undefined} jsonLd={jsonLd} ogImage="/og.svg" />
    </>
  );
}
