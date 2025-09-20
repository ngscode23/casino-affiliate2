// src/pages/Offer/index.tsx
import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";

import PageShell from "@ui/components/ui/PageShell";
import SectionCard from "@ui/components/ui/SectionCard";
import { Pill } from "@ui/components/ui/Pill";
import Seo from "@ui/components/Seo";
import { SITE_URL } from "@shared/config";
import AffiliateLink from "@ui/components/misc/AffiliateLink";
import { useVertical } from "@shared/ctx/VerticalContext";
import { FavControl } from "@ui/components/FavControl";
import { useT } from "@shared/lib/useT";

import { offersNormalized, type NormalizedOffer } from "@shared/lib/offers";
import { getOfferBySlug } from "@shared/features/offers/api/getOffers";
import { track } from "@shared/lib/analytics";
import { pushRecent, getRecent } from "@shared/lib/recent";
import { supabase } from "@shared/lib/supabase";
import { fetchProductAttributes, toValueMap } from "@shared/lib/attributes";

export default function OfferPage() {
  const { slug } = useParams<{ slug: string }>();
  const t = useT();
  const vertical = useVertical();

  const [offer, setOffer] = useState<NormalizedOffer | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [display, setDisplay] = useState<NormalizedOffer | null>(null);

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

  // Overlay EAV for key attributes (hybrid: EAV -> fallback to offers.*)
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const base = offer;
        if (!base?.slug) { if (active) setDisplay(offer); return; }
        // resolve numeric id by slug
        const { data, error } = await (supabase as any)
          .from('offers')
          .select('id,slug')
          .eq('slug', base.slug)
          .limit(1);
        if (error) throw error;
        const pid = Number((data?.[0]?.id ?? NaN));
        if (!Number.isFinite(pid)) { if (active) setDisplay(base); return; }
        const rows = await fetchProductAttributes([pid as any], ['rating','compliance_license','payout_time_hours','payout_methods']);
        const vm = toValueMap(rows)[String(pid)] || {};
        const licenseRaw = (vm as any)['compliance_license'];
        const license = licenseRaw != null ? String(licenseRaw).toUpperCase() : base.license;
        const rating = (vm as any)['rating'] != null ? Number((vm as any)['rating']) : base.rating;
        const payoutHours = (vm as any)['payout_time_hours'] != null ? Number((vm as any)['payout_time_hours']) : base.payoutHours;
        const methods = Array.isArray((vm as any)['payout_methods']) ? ((vm as any)['payout_methods'] as any[]).map(String) : (base.methods ?? []);
        const next: NormalizedOffer = { ...base, license, rating, payoutHours, methods } as NormalizedOffer;
        if (active) setDisplay(next);
      } catch {
        if (active) setDisplay(offer);
      }
    })();
    return () => { active = false; };
  }, [offer?.slug]);

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
          { "@type": "ListItem", position: 1, name: t("nav.offers") || "Offers", item: `${SITE_URL.replace(/\/$/, "")}/offers` },
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
    return <PageShell className="bg-bg text-text"><SectionCard>{t("common.loading") || "Loading..."}</SectionCard></PageShell>;
  }

  if (!offer) {
    return <PageShell className="bg-bg text-text"><SectionCard>{t("common.notFound") || "Not found"}</SectionCard></PageShell>;
  }

  const view = display ?? offer;

  return (
    <>
      <Seo
        title={`${offer.name} - ${t("offer.ratingLabel")} · ${t("offer.payout")} · ${t("offer.license")}`}
        description={`${offer.name}: ${t("offer.license")}: ${offer.license ?? "-"}; ${t("offer.payout")}: ${offer.payout}${offer.payoutHours ? ` (~${offer.payoutHours}h)` : ""}.`}
        ogImage="/og.svg"
        canonical={canonical}
        jsonLd={jsonLd}
      />

      <PageShell className="bg-bg text-text">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4">{view.name}</h1>
        <SectionCard>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-muted">{t("offer.ratingLabel")}</span>
                <Pill tone="rating">★ {typeof offer.rating === "number" ? offer.rating.toFixed(1) : String(offer.rating ?? 0)}</Pill>
              </div>
              <div>
                <div className="text-muted mb-1">{t("offer.payout")}</div>
                <div>
                  {offer.payout}
                  {offer.payoutHours ? ` (~${offer.payoutHours}h)` : ""}
                </div>
              </div>
              <div>
                <div className="text-muted mb-1">{t("filters.methods") || "Methods"}</div>
                <div className="flex flex-wrap gap-2">
                  {offer.methods.length ? offer.methods.map((m, i) => (
                    <Pill key={`${m}-${i}`}>{m}</Pill>
                  )) : "-"}
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <AffiliateLink
                offerSlug={offer.slug}
                position={1}
                href={`/go/${encodeURIComponent(offer.slug)}`}
                className="w-full inline-flex items-center justify-center rounded-xl px-4 py-2 font-medium bg-[color:var(--ui-accent)] text-[color:var(--ui-accent-fg)] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent-20)]"
                aria-label={`${t("offer.cta")}: ${offer.name}`}
              >
                {t("offer.cta")}
              </AffiliateLink>

              {vertical.disclosures?.card ? (
                <p className="mt-2 text-xs text-muted">{t(vertical.disclosures.card)}</p>
              ) : null}

              <FavControl
                id={offer.slug}
                className="rounded-xl border border-border hover:bg-white/60 dark:hover:bg-white/5 w-full"
                onToggle={(active: boolean) => {
                  try { track("favorite_toggle", { offer_slug: offer.slug, active }); }
                  catch { (track as any)?.({ name: "favorite_toggle", params: { offer_slug: offer.slug, active } }); }
                }}
              />
            </div>
          </div>
        </SectionCard>

        {recentOffers.length > 0 && (
          <SectionCard>
            <h2 className="text-lg font-semibold mb-3">{t("offers.recent") || "Recently viewed"}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recentOffers.map((o) => (
                <Link
                  key={o.slug}
                  to={`/offers/${encodeURIComponent(o.slug)}`}
                  className="rounded-2xl border border-border bg-card p-4 hover:shadow-soft transition"
                >
                  <div className="font-medium">{o.name}</div>
                  <div className="text-sm text-muted">
                    {t("offer.license")}: {o.license ?? "-"} · {t("offer.payout")}: {o.payout}
                    {o.payoutHours ? ` (~${o.payoutHours}h)` : ""}
                  </div>
                </Link>
              ))}
            </div>
          </SectionCard>
        )}
      </PageShell>
    </>
  );
}

