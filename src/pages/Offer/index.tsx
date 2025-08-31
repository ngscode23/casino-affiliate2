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
import { useT } from "@/lib/useT";

import { offersNormalized, type NormalizedOffer } from "@/lib/offers";
import { getOfferBySlug } from "@/features/offers/api/getOffers";
import { track } from "@/lib/analytics";
import { pushRecent, getRecent } from "@/lib/recent";

export default function OfferPage() {
  const { slug } = useParams<{ slug: string }>();
  const t = useT();

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

  useEffect(() => { if (offer?.slug) pushRecent(offer.slug); }, [offer?.slug]);

  const recentOffers: NormalizedOffer[] = useMemo(() => {
    const recents = getRecent().filter((s) => s !== offer?.slug).slice(0, 6);
    const bySlug = new Map(offersNormalized.map((o) => [o.slug, o]));
    return recents.map((s) => bySlug.get(s)).filter(Boolean) as NormalizedOffer[];
  }, [offer?.slug]);

  const faq = useMemo(() => ([
    { q: "How fast are payouts?", a: "Usually within 1–24 hours depending on method." },
    { q: "Any hidden fees?", a: "No, we list only offers with transparent terms." },
  ]), []);

  const canonical = useMemo(() => {
    const origin = SITE_URL.replace(/\/$/, "");
    if (!offer) return `${origin}/offers`;
    return `${origin}/offers/${encodeURIComponent(offer.slug)}`;
  }, [offer]);

  const jsonLd = useMemo(() => {
    if (!offer) return [] as any[];
    return [
      {
        "@context": "https://schema.org",
        "@type": "Product",
        name: offer.name,
        brand: { "@type": "Organization", name: offer.name },
        aggregateRating: offer.rating ? { "@type": "AggregateRating", ratingValue: offer.rating, reviewCount: 1 } : undefined,
        offers: { "@type": "Offer", url: canonical, priceCurrency: "USD", price: "0", availability: "https://schema.org/InStock" },
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
        mainEntity: faq.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
      },
    ];
  }, [offer, canonical, faq]);

  if (loading) {
    return (
      <Section>
        <Card className="p-6">Loading...</Card>
      </Section>
    );
  }

  if (!offer) {
    return (
      <Section>
        <Card className="p-6">Not found</Card>
      </Section>
    );
  }

  return (
    <>
      <Seo
        title={`${offer.name} - ${t("offer.ratingLabel")} · ${t("offer.payout")} · ${t("offer.license")}`}
        description={`${offer.name}: ${t("offer.license")}: ${offer.license ?? "-"}; ${t("offer.payout")}: ${offer.payout}${offer.payoutHours ? ` (~${offer.payoutHours}h)` : ""}.`}
        ogImage="/og.svg"
        canonical={canonical}
        jsonLd={jsonLd}
      />

      <section className="neon-hero relative">
        <Section>
          <h1 style={{ fontWeight: 800, letterSpacing: "-0.02em", fontSize: "clamp(28px,4.5vw,46px)" }}>{offer.name}</h1>
          <p className="neon-subline mt-2">
            {t("offer.license")}: {offer.license ?? "-"} · {t("offer.payout")}: {offer.payout}
            {offer.payoutHours ? ` (~${offer.payoutHours}h)` : ""}
          </p>
        </Section>
      </section>

      <Section className="space-y-6">
        <Card className="p-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-[var(--text-dim)]">{t("offer.ratingLabel")}</span>
                <Rating value={offer.rating ?? 0} />
              </div>
              <div>
                <div className="text-[var(--text-dim)] mb-1">{t("offer.payout")}</div>
                <div>
                  {offer.payout}
                  {offer.payoutHours ? ` (~${offer.payoutHours}h)` : ""}
                </div>
              </div>
              <div>
                <div className="text-[var(--text-dim)] mb-1">{t("filters.methods") || "Methods"}</div>
                <div className="flex flex-wrap gap-2">
                  {offer.methods.length ? offer.methods.map((m, i) => (
                    <span key={`${m}-${i}`} className="neon-chip">{m}</span>
                  )) : "-"}
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <AffiliateLink
                offerSlug={offer.slug}
                position={1}
                href={`/go/${encodeURIComponent(offer.slug)}`}
                className="btn w-full inline-flex items-center justify-center"
                aria-label={`${t("offer.cta")}: ${offer.name}`}
              >
                {t("offer.cta")}
              </AffiliateLink>

              <p className="mt-2 text-xs text-[var(--text-dim)]">
                {t("offer.sponsoredShort") || "Sponsored link. 18+ only."} {t("offer.ourDisclosure") || "Please read"} {" "}
                <Link className="underline" to="/legal/affiliate-disclosure">{t("legal.affiliateDisclosure") || "our disclosure"}</Link>{" "}
                {t("offer.tcShort") || "and operator's T&Cs."}
              </p>

              <FavControl
                id={offer.slug}
                className="btn w-full"
                onToggle={(active: boolean) => {
                  try { track("favorite_toggle", { offer_slug: offer.slug, active }); }
                  catch { (track as any)?.({ name: "favorite_toggle", params: { offer_slug: offer.slug, active } }); }
                }}
              />
            </div>
          </div>
        </Card>

        {recentOffers.length > 0 && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-3">{t("offers.recent") || "Recently viewed"}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recentOffers.map((o) => (
                <Link key={o.slug} to={`/offers/${encodeURIComponent(o.slug)}`} className="neon-card p-4 hover:opacity-90">
                  <div className="font-medium">{o.name}</div>
                  <div className="text-sm text-[var(--text-dim)]">
                    {t("offer.license")}: {o.license ?? "-"} · {t("offer.payout")}: {o.payout}
                    {o.payoutHours ? ` (~${o.payoutHours}h)` : ""}
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

