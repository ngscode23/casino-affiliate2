"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Shield, Timer, TrendingUp, Globe, ExternalLink } from "lucide-react";
import PageShell from "@ui/components/ui/PageShell";
import SectionCard from "@ui/components/ui/SectionCard";
import LinkButton from "@ui/components/ui/LinkButton";
import { Pill } from "@ui/components/ui/Pill";
import { useOffers } from "@shared/features/offers/api/useOffers";
import type { NormalizedOffer } from "@shared/lib/offers";

const DEMO_OFFERS: Array<Pick<NormalizedOffer, "slug" | "name" | "rating" | "payoutHours" | "license" | "link">> = [
  { slug: "nova", name: "NovaBet", rating: 4.6, payoutHours: 4, license: "MGA", link: "/offers/nova" },
  { slug: "aurora", name: "AuroraPlay", rating: 4.4, payoutHours: 12, license: "UKGC", link: "/offers/aurora" },
  { slug: "zen", name: "ZenCasino", rating: 4.2, payoutHours: 24, license: "Curaçao", link: "/offers/zen" },
  { slug: "rapid", name: "RapidWin", rating: 4.1, payoutHours: 2, license: "MGA", link: "/offers/rapid" },
];

function RatingPillMini({ value }: { value: number }) {
  return <Pill tone="rating">★ {typeof value === "number" ? value.toFixed(1) : String(value ?? 0)}</Pill>;
}

function PlanBadge({ plan }: { plan?: string }) {
  if (!plan) return null;
  return <Pill>{plan}</Pill>;
}

function OffersTable({ offers }: { offers: Array<Partial<NormalizedOffer>> }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <table className="w-full text-sm">
        <colgroup>
          <col style={{ width: "40%" }} />
          <col style={{ width: "15%" }} />
          <col style={{ width: "20%" }} />
          <col style={{ width: "15%" }} />
          <col />
        </colgroup>
        <thead className="bg-white/[0.03] text-left text-white/80">
          <tr>
            <th className="px-4 py-3 font-medium">Brand</th>
            <th className="px-4 py-3 font-medium">Rating</th>
            <th className="px-4 py-3 font-medium">Payout (h)</th>
            <th className="px-4 py-3 font-medium">Licence</th>
            <th className="px-4 py-3 font-medium text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {offers.map((offer) => (
            <tr key={offer.slug} className="h-16">
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
                  aria-label={`Open ${(offer as any).name || "offer"}`}
                >
                  Explore <ExternalLink className="h-4 w-4" />
                </LinkButton>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const VALUE_PROPS = [
  {
    title: "Licensed partners only",
    description: "We screen every casino for regulator status, ownership, and complaint history before listing it.",
    icon: Shield,
  },
  {
    title: "Transparent payouts",
    description: "Real withdrawal tests keep the SLA honest. If the timings slip, the offer is paused.",
    icon: Timer,
  },
  {
    title: "Performance-first",
    description: "Benchmark CTR, FTD, and ARPU from our historical campaigns to prioritise your launch list.",
    icon: TrendingUp,
  },
  {
    title: "Global coverage",
    description: "Multi-market payment flows, localised creatives, and KYC notes ready for your media buyers.",
    icon: Globe,
  },
];

const FAQ_ENTRIES = [
  {
    q: "How do you select featured brands?",
    a: "Licensing, payout speed, payment coverage, and partner responsiveness each carry a score. Sponsored placement never overrides the base rating.",
  },
  {
    q: "Can I use this program without a history?",
    a: "Yes. We onboard new affiliates, but expect to see traffic plans and respect for responsible gaming guidelines.",
  },
  {
    q: "What support channels are available?",
    a: "Every priority partner receives a dedicated account manager plus access to our shared strategy Slack.",
  },
  {
    q: "Which markets perform best right now?",
    a: "CEE and LatAm funnels are strongest this quarter, but we can share fresh cohort data once you connect with the team.",
  },
];

export default function AffiliateHomeClient() {
  const { offers } = useOffers();

  const featured = useMemo(() => {
    if (offers?.length) {
      const pinned = (offers as any[]).filter((offer) => (offer as any).pinned).slice(0, 6);
      if (pinned.length) return pinned;
      return [...offers].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 4);
    }
    return DEMO_OFFERS as any;
  }, [offers]);

  return (
    <PageShell className="space-y-16 text-white">
      <section className="relative overflow-hidden pt-12">
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-40 [mask-image:radial-gradient(60%_50%_at_50%_0%,#000_10%,transparent_70%)]">
          <div className="absolute left-1/2 top-0 h-[48rem] w-[48rem] -translate-x-1/2 rounded-full bg-[rgb(var(--primary)/0.15)] blur-3xl" />
        </div>
        <div className="grid items-start gap-10 md:grid-cols-[1.1fr_0.9fr]">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <span className="tagline">Affiliate launchpad</span>
            <h1 className="mt-4 text-balance text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              Scale casino campaigns with vetted offers and live performance data
            </h1>
            <p className="mt-5 max-w-prose text-white/80">
              Unlock pre-negotiated deals, real payout timings, and localisation notes without digging through spreadsheets.
              Plug our catalogue into your media buying workflow and keep compliance ahead of regulators.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <LinkButton href="/products" className="px-5 py-3 text-sm">Browse catalogue</LinkButton>
              <LinkButton href="/contact" variant="ghost" className="px-5 py-3 text-sm">
                Talk to the partner team
              </LinkButton>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
            <SectionCard title="Featured programs" contentClassName="p-0">
              <OffersTable offers={featured} />
            </SectionCard>
          </motion.div>
        </div>
      </section>

      <SectionCard title="Why top affiliates onboard here" contentClassName="gap-6">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {VALUE_PROPS.map(({ title, description, icon: Icon }) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <Icon className="h-5 w-5 text-[rgb(var(--primary))]" />
              <h3 className="mt-3 font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm text-white/70">{description}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Campaign timeline" contentClassName="gap-5">
        <ol className="grid gap-4 text-sm text-white/80 md:grid-cols-3">
          <li className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="font-semibold text-white">1. Audit & targeting</p>
            <p className="mt-2">Share your verticals. We shortlist partners with matching licences, payment flows, and GEO reach.</p>
          </li>
          <li className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="font-semibold text-white">2. Creative & tracking</p>
            <p className="mt-2">Receive localisation packs, conversion hooks, and QA templates for pixels, Postback, or S2S.</p>
          </li>
          <li className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="font-semibold text-white">3. Optimise</p>
            <p className="mt-2">Weekly reporting syncs highlight payout variance, risk events, and upsell opportunities.</p>
          </li>
        </ol>
      </SectionCard>

      <SectionCard title="Frequently asked" contentClassName="gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          {FAQ_ENTRIES.map(({ q, a }) => (
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
