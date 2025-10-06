"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Shield, Timer, TrendingUp, Globe, ExternalLink } from "lucide-react";
import PageShell from "@ui/components/ui/PageShell";
import SectionCard from "@ui/components/ui/SectionCard";
import LinkButton from "@ui/components/ui/LinkButton";
import { Pill } from "@ui/components/ui/Pill";
import Tagline from "@/components/tagline";
import { useOffers } from "@shared/features/offers/api/useOffers";
import type { NormalizedOffer } from "@shared/lib/offers";
import { useT } from "@shared/lib/useT";

const DEMO_OFFERS: Array<Pick<NormalizedOffer, "slug" | "name" | "rating" | "payoutHours" | "license" | "link">> = [
  { slug: "nova", name: "Nova", rating: 4.6, payoutHours: 4, license: "MGA", link: "/offers/nova" },
  { slug: "aurora", name: "Aurora", rating: 4.4, payoutHours: 12, license: "UKGC", link: "/offers/aurora" },
  { slug: "zen", name: "Zen", rating: 4.2, payoutHours: 24, license: "Curaçao", link: "/offers/zen" },
  { slug: "rapid", name: "Rapid", rating: 4.1, payoutHours: 2, license: "MGA", link: "/offers/rapid" },
];

function RatingPillMini({ value }: { value: number }) {
  return <Pill tone="rating">{Number.isFinite(value) ? value.toFixed(1) : "0.0"}</Pill>;
}

function PlanBadge({ plan }: { plan?: string }) {
  if (!plan) return null;
  return <Pill>{plan}</Pill>;
}

type OffersTableLabels = {
  brand: string;
  rating: string;
  payout: string;
  license: string;
  action: string;
  viewOffer: string;
};

function OffersTable({ offers, labels }: { offers: Array<Partial<NormalizedOffer>>; labels: OffersTableLabels }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <table className="w-full text-sm">
        <colgroup>
          <col className="w-[40%]" />
          <col className="w-[15%]" />
          <col className="w-[20%]" />
          <col className="w-[15%]" />
          <col />
        </colgroup>
        <thead className="bg-white/[0.03] text-left text-white/80">
          <tr>
            <th className="px-4 py-3 font-medium">{labels.brand}</th>
            <th className="px-4 py-3 font-medium">{labels.rating}</th>
            <th className="px-4 py-3 font-medium">{labels.payout}</th>
            <th className="px-4 py-3 font-medium">{labels.license}</th>
            <th className="px-4 py-3 font-medium text-right">{labels.action}</th>
          </tr>
        </thead>
        <tbody>
          {offers.map((offer) => (
            <tr key={offer.slug ?? String(offer.name)} className="h-16">
              <td className="px-4 py-3 font-medium text-white">
                <span className="inline-block max-w-[90%] truncate align-middle">{offer.name}</span>
                {("pinnedPlan" in (offer || {}) || "pinned" in (offer || {})) ? (
                  <span className="ml-2 inline-block align-middle">
                    <PlanBadge plan={(offer as any).pinnedPlan} />
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-3">
                <RatingPillMini value={(offer.rating as number) || 0} />
              </td>
              <td className="px-4 py-3 text-white/90">{(offer as any).payoutHours ?? "-"}</td>
              <td className="px-4 py-3 text-white/80">
                <Pill>{(offer.license as any) ?? "-"}</Pill>
              </td>
              <td className="px-4 py-3 text-right">
                <LinkButton
                  href={(offer as any).link || "#"}
                  className="inline-flex items-center gap-2 px-3 py-2 text-xs"
                  aria-label={`${labels.viewOffer} ${(offer as any).name || "offer"}`}
                >
                  {labels.viewOffer} <ExternalLink className="h-4 w-4" />
                </LinkButton>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AffiliateHomeClient() {
  const t = useT();
  const { offers } = useOffers();

  const featured = useMemo(() => {
    if (offers?.length) {
      const pinned = (offers as any[]).filter((offer) => (offer as any).pinned).slice(0, 6);
      if (pinned.length) return pinned;
      return [...offers].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 4);
    }
    return DEMO_OFFERS as any;
  }, [offers]);

  const valueProps = [
    {
      icon: Shield,
      title: t("affiliate.valueProps.licensing.title"),
      description: t("affiliate.valueProps.licensing.description"),
    },
    {
      icon: Timer,
      title: t("affiliate.valueProps.payouts.title"),
      description: t("affiliate.valueProps.payouts.description"),
    },
    {
      icon: TrendingUp,
      title: t("affiliate.valueProps.performance.title"),
      description: t("affiliate.valueProps.performance.description"),
    },
    {
      icon: Globe,
      title: t("affiliate.valueProps.coverage.title"),
      description: t("affiliate.valueProps.coverage.description"),
    },
  ];

  const timelineSteps = [
    {
      title: t("affiliate.timeline.steps.audit.title"),
      description: t("affiliate.timeline.steps.audit.description"),
    },
    {
      title: t("affiliate.timeline.steps.creative.title"),
      description: t("affiliate.timeline.steps.creative.description"),
    },
    {
      title: t("affiliate.timeline.steps.optimise.title"),
      description: t("affiliate.timeline.steps.optimise.description"),
    },
  ];

  const faqEntries = [
    { q: t("affiliate.faq.selection.q"), a: t("affiliate.faq.selection.a") },
    { q: t("affiliate.faq.onboarding.q"), a: t("affiliate.faq.onboarding.a") },
    { q: t("affiliate.faq.support.q"), a: t("affiliate.faq.support.a") },
    { q: t("affiliate.faq.markets.q"), a: t("affiliate.faq.markets.a") },
  ];

  const tableLabels: OffersTableLabels = {
    brand: t("affiliate.table.brand"),
    rating: t("affiliate.table.rating"),
    payout: t("affiliate.table.payout"),
    license: t("affiliate.table.license"),
    action: t("affiliate.table.action"),
    viewOffer: t("affiliate.table.viewOffer"),
  };

  return (
    <PageShell className="space-y-16 text-white">
      <section className="relative overflow-hidden pt-12">
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-40 [mask-image:radial-gradient(60%_50%_at_50%_0%,#000_10%,transparent_70%)]">
          <div className="absolute left-1/2 top-0 h-[48rem] w-[48rem] -translate-x-1/2 rounded-full bg-[rgb(var(--primary)/0.15)] blur-3xl" />
        </div>
        <div className="grid items-start gap-10 md:grid-cols-[1.1fr_0.9fr]">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <Tagline>{t("affiliate.hero.tagline")}</Tagline>
            <h1 className="mt-4 text-balance text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              {t("affiliate.hero.title")}
            </h1>
            <p className="mt-5 max-w-prose text-white/80">{t("affiliate.hero.body")}</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <LinkButton href="/products" className="px-5 py-3 text-sm">
                {t("affiliate.hero.primaryCta")}
              </LinkButton>
              <LinkButton href="/contact" variant="ghost" className="px-5 py-3 text-sm">
                {t("affiliate.hero.secondaryCta")}
              </LinkButton>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
            <SectionCard title={t("affiliate.sections.featured")} contentClassName="p-0">
              <OffersTable offers={featured} labels={tableLabels} />
            </SectionCard>
          </motion.div>
        </div>
      </section>

      <SectionCard title={t("affiliate.sections.valueProps")} contentClassName="gap-6">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {valueProps.map(({ icon: Icon, title, description }) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <Icon className="h-5 w-5 text-[rgb(var(--primary))]" />
              <h3 className="mt-3 font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm text-white/70">{description}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title={t("affiliate.sections.timeline")} contentClassName="gap-5">
        <ol className="grid gap-4 text-sm text-white/80 md:grid-cols-3">
          {timelineSteps.map(({ title, description }) => (
            <li key={title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="font-semibold text-white">{title}</p>
              <p className="mt-2">{description}</p>
            </li>
          ))}
        </ol>
      </SectionCard>

      <SectionCard title={t("affiliate.sections.faq")} contentClassName="gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          {faqEntries.map(({ q, a }) => (
            <details key={q} className="group rounded-2xl border border-white/10 bg-white/5 p-4">
              <summary className="cursor-pointer list-none text-sm font-semibold text-white group-open:text-[rgb(var(--primary))]">
                {q}
              </summary>
              <p className="mt-2 text-sm text-white/70">{a}</p>
            </details>
          ))}
        </div>
      </SectionCard>
    </PageShell>
  );
}
