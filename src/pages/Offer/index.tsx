// src/pages/Offer/index.tsx
import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";

import Section from "@/components/common/section";
import Card from "@/components/common/card";
import Rating from "@/components/common/rating";
import Seo from "@/components/Seo";
import { SITE_URL } from "@/config";
import AffiliateLink from "@/components/misc/AffiliateLink";
import { FavControl } from "@/components/FavControl";

import { offersNormalized, type NormalizedOffer } from "@/lib/offers";
import { getOfferBySlug } from "@/features/offers/api/getOffers";
import { track } from "@/lib/analytics";
import { pushRecent, getRecent } from "@/lib/recent";

export default function OfferPage() {
  const { slug } = useParams<{ slug: string }>();

  // Ищем оффер по slug
  const [offer, setOffer] = useState<NormalizedOffer | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!slug) { setOffer(null); return; }
        setLoading(true);
        const s = decodeURIComponent(slug);
        const o = await getOfferBySlug(s);
        if (!cancelled) setOffer(o);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  // Пишем текущий оффер в «Недавно смотрели»
  useEffect(() => {
    if (offer?.slug) pushRecent(offer.slug);
  }, [offer?.slug]);

  // Недавно смотрели (без текущего), максимум 6
  const recentOffers: NormalizedOffer[] = useMemo(() => {
    const recents = getRecent()
      .filter((s) => s !== offer?.slug)
      .slice(0, 6);
    const bySlug = new Map(offersNormalized.map((o) => [o.slug, o]));
    return recents
      .map((s) => bySlug.get(s))
      .filter(Boolean) as NormalizedOffer[];
  }, [offer?.slug]);

  // Частые вопросы (для JSON-LD и, при желании, визуального блока)
  const faq = useMemo(
    () => [
      {
        q: "Как быстро выводят средства?",
        a: "Обычно в течение 1–24 часов, зависит от метода.",
      },
      {
        q: "Есть ли вейджер на бонусы?",
        a: "Да, условия зависят от акции — проверяйте правила.",
      },
    ],
    []
  );

  // Canonical
  const canonical = useMemo(() => {
    const origin = SITE_URL.replace(/\/$/, "");
    if (!offer) return `${origin}/offers`;
    return `${origin}/offers/${encodeURIComponent(offer.slug)}`;
  }, [offer]);

  // JSON-LD: Product + BreadcrumbList + FAQPage
  const jsonLd = useMemo(() => {
    if (!offer) return [];
    return [
      {
        "@context": "https://schema.org",
        "@type": "Product",
        name: offer.name,
        brand: { "@type": "Organization", name: offer.name },
        aggregateRating: offer.rating
          ? { "@type": "AggregateRating", ratingValue: offer.rating, reviewCount: 1 }
          : undefined,
        offers: {
          "@type": "Offer",
          url: canonical,
          priceCurrency: "USD",
          price: "0",
          availability: "https://schema.org/InStock",
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Offers", item: `${SITE_URL.replace(/\/$/, "")}/offers` },
          { "@type": "ListItem", position: 2, name: offer.name, item: canonical },
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faq.map(({ q, a }) => ({
          "@type": "Question",
          name: q,
          acceptedAnswer: { "@type": "Answer", text: a },
        })),
      },
    ];
  }, [offer, canonical, faq]);

  // loading guard
  if (loading) {
    return (
      <Section>
        <Card className="p-6">Loading...</Card>
      </Section>
    );
  }

  // Заглушка, если оффер не найден
  if (!offer) {
    return (
      <Section>
        <Card className="p-6">
          <div className="text-lg font-semibold mb-2">Not found</div>
          <p className="text-[var(--text-dim)]">Мы не нашли такой оффер.</p>
          <div className="mt-4">
            <Link to="/compare" className="btn">Back to compare</Link>
          </div>
        </Card>
      </Section>
    );
  }

  return (
    <>
      <Seo
        title={`${offer.name} — рейтинг, лицензия, выплаты`}
        description={`Детали по ${offer.name}: лицензия ${offer.license ?? "—"}, скорость выплат ${offer.payout}${offer.payoutHours ? ` (~${offer.payoutHours}ч)` : ""}.`}
        ogImage="/og.svg"
        canonical={canonical}
        jsonLd={jsonLd}
      />

      <section className="neon-hero relative">
        <Section>
          <h1
            style={{
              fontWeight: 800,
              letterSpacing: "-0.02em",
              fontSize: "clamp(28px,4.5vw,46px)",
            }}
          >
            {offer.name}
          </h1>

          <p className="neon-subline mt-2">
            License: {offer.license ?? "—"} • Payout: {offer.payout}
            {offer.payoutHours ? ` (~${offer.payoutHours}h)` : ""}
          </p>
        </Section>
      </section>

      <Section className="space-y-6">
        <Card className="p-6">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Левая колонка — инфо */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-[var(--text-dim)]">Rating</span>
                <Rating value={offer.rating ?? 0} />
              </div>

              <div>
                <div className="text-[var(--text-dim)] mb-1">Payout</div>
                <div>
                  {offer.payout}
                  {offer.payoutHours ? ` (~${offer.payoutHours}h)` : ""}
                </div>
              </div>

              <div>
                <div className="text-[var(--text-dim)] mb-1">Methods</div>
                <div className="flex flex-wrap gap-2">
                  {offer.methods.length
                    ? offer.methods.map((m, i) => (
                        <span key={`${m}-${i}`} className="neon-chip">
                          {m}
                        </span>
                      ))
                    : "—"}
                </div>
              </div>
            </div>

            {/* Правая колонка — действия */}
            <div className="space-y-3">
              <AffiliateLink
                offerSlug={offer.slug}
                position={1}
                href={offer.link ?? "#"}
                className="btn w-full inline-flex items-center justify-center"
                aria-label={`Open ${offer.name}`}
              >
                Play now
              </AffiliateLink>

              <p className="mt-2 text-xs text-[var(--text-dim)]">
                Sponsored link. 18+ only. Please read{" "}
                <Link className="underline" to="/legal/affiliate-disclosure">
                  our disclosure
                </Link>{" "}
                and operator’s T&amp;Cs.
              </p>

              <FavControl
                id={offer.slug}
                className="btn w-full"
                onToggle={(active: boolean) => {
                  try {
                    // если твой track принимает (name, payload)
                    track("favorite_toggle", { offer_slug: offer.slug, active });
                  } catch {
                    // если у тебя остался старый адаптер { name, params }
                  
                    track?.({ name: "favorite_toggle", params: { offer_slug: offer.slug, active } });
                  }
                }}
              />
            </div>
          </div>
        </Card>

        {/* Недавно смотрели */}
        {recentOffers.length > 0 && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-3">Недавно смотрели</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recentOffers.map((o) => (
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
      </Section>
    </>
  );
}
