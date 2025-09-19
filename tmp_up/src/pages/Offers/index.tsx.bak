// src/pages/Offers/index.tsx

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";

import Section from "@/components/common/section";
import Card from "@/components/common/card";
import Seo from "@/components/Seo";

import OfferListFeature from "@/features/offers/components/OfferListFeature";
import { useOffers } from "@/features/offers/api/useOffers";
import OfferFiltersFeature, {
  type OffersFilterState,
} from "@/features/offers/components/OfferFiltersFeature";

import { getRecent } from "@/lib/recent";
import { offersNormalized, type NormalizedOffer } from "@/lib/offers";

export default function OffersIndex() {
  const { offers, isLoading, error } = useOffers();
  const [filters, setFilters] = useState<OffersFilterState>({
    license: "all",
    q: "",
  });

  // Недавно просмотренные: берём slug'и из localStorage и сопоставляем
  // сперва с актуальными данными из API, затем fallback к offersNormalized.
  const recentOffers: NormalizedOffer[] = useMemo(() => {
    try {
      const slugs = getRecent(); // string[]
      if (!Array.isArray(slugs) || slugs.length === 0) return [];

      const bySlugApi = new Map((offers ?? []).map(o => [o.slug, o]));
      const bySlugStatic = new Map(offersNormalized.map(o => [o.slug, o]));

      const res: NormalizedOffer[] = [];
      for (const slug of slugs) {
        const found = bySlugApi.get(slug) ?? bySlugStatic.get(slug) ?? null;
        if (found) res.push(found);
      }

      // уникализируем и ограничиваем, например, до 6
      const seen = new Set<string>();
      const uniq = res.filter(o => {
        if (!o?.slug || seen.has(o.slug)) return false;
        seen.add(o.slug);
        return true;
      });

      return uniq.slice(0, 6);
    } catch {
      return [];
    }
  }, [offers]);

  return (
    <Section className="space-y-6">
      <Seo
        title="All Casino Offers — browse & filter"
        description="Листайте карточки казино, фильтруйте по лицензиям и методам выплат."
        canonical={`${location.origin}/offers`}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "All Casino Offers",
        }}
      />

      <h1 className="text-2xl font-bold">All Offers</h1>

      <Card className="p-4">
        <OfferFiltersFeature onChange={setFilters} />
      </Card>

      {isLoading ? (
        <Card className="p-6">Загрузка…</Card>
      ) : error ? (
        <Card className="p-6 text-red-400">Ошибка: {String(error)}</Card>
      ) : (
        <OfferListFeature offers={offers} filters={filters} />
      )}

      {/* Недавно смотрели */}
     {recentOffers.length > 0 && (
  <Card className="p-4">
    <h2 className="text-lg font-semibold mb-3">Недавно смотрели</h2>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {recentOffers.map(o => (
        <Link
          key={o.slug}
          to={`/offers/${encodeURIComponent(o.slug)}`}
          className="neon-card p-4 hover:opacity-90"
        >
          <div className="font-medium">{o.name}</div>
          <div className="text-sm text-[var(--text-dim)]">
            Лицензия: {o.license ?? "—"} • Выплаты: {o.payout}
            {o.payoutHours ? ` (~${o.payoutHours}ч)` : ""}
          </div>
        </Link>
      ))}
    </div>
  </Card>
)}

      <Card className="p-6 space-y-2">
        <p className="text-[var(--text-dim)]">
          Список офферов как отдельная витрина. Основная таблица сравнения — на странице Compare.
        </p>
        <Link className="underline cursor-pointer" to="/compare">
          → Go to Compare
        </Link>
      </Card>
    </Section>
  );
}