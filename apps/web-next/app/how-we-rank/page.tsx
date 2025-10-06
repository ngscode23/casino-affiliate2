import type { Metadata } from "next";
import PageShell from "@ui/components/ui/PageShell";
import SectionCard from "@ui/components/ui/SectionCard";
import { Pill } from "@ui/components/ui/Pill";
import Tagline from "@/components/tagline";

export const metadata: Metadata = {
  title: "How we rank casino partners",
  description: "Our methodology for rating casino affiliate offers, covering licences, payouts, methods, and player support.",
};

const CRITERIA = [
  {
    key: "licenses",
    title: "Licences & audit",
    body: "We verify regulator listings (MGA, UKGC, etc.), ownership, and any compliance warnings.",
  },
  {
    key: "payout",
    title: "Payout speed",
    body: "Test withdrawals across common methods to confirm the timing matches the pitch.",
  },
  {
    key: "methods",
    title: "Payment coverage",
    body: "Cards, local bank rails, and e-wallets all matter when you operate in multiple regions.",
  },
  {
    key: "jurisdiction",
    title: "Jurisdiction & KYC",
    body: "We review restricted countries, KYC friction, and escalation patterns for higher-risk bettors.",
  },
  {
    key: "transparency",
    title: "Transparency",
    body: "Bonus terms, clawback clauses, and partner reporting clarity are all part of the score.",
  },
  {
    key: "support",
    title: "Player support",
    body: "Responsiveness of live chat and escalation paths for payment issues influence long-term value.",
  },
];

export default function HowWeRankPage() {
  return (
    <PageShell className="text-fg">
      <div className="space-y-10">
        <header className="space-y-4">
          <Tagline>Methodology</Tagline>
          <h1 className="text-3xl font-semibold text-fg sm:text-4xl">How we rank casino affiliate offers</h1>
          <p className="max-w-3xl text-sm text-muted">
            Rankings aren’t pay-to-play. Every brand we feature must pass compliance, speed, and transparency checks.
            Below is the condensed checklist we use while migrating the legacy portal to Next.js.
          </p>
        </header>

        <SectionCard title="What we review" contentClassName="gap-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {CRITERIA.map((item) => (
              <div key={item.key} className="rounded-2xl border border-border/40 bg-card/60 p-5 space-y-3">
                <Pill>{item.title}</Pill>
                <p className="text-sm text-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Three-step process" contentClassName="gap-4">
          <ol className="list-decimal space-y-3 pl-6 text-sm text-fg">
            <li>Collect source data: regulator records, payment options, limits, and community feedback.</li>
            <li>Run payout tests for each advertised method and log real settlement times.</li>
            <li>Weight metrics programmatically; sponsored placements never override the base score.</li>
          </ol>
        </SectionCard>

        <SectionCard title="Disclosure" contentClassName="gap-3">
          <p className="text-sm text-muted">
            Neon Shop uses affiliate links. Sponsored placements are labelled and do not influence the core scoring.
            If you find an issue with the data or want your brand reviewed, email <a className="underline" href="mailto:hello@neonshop.dev">hello@neonshop.dev</a>.
          </p>
        </SectionCard>
      </div>
    </PageShell>
  );
}
