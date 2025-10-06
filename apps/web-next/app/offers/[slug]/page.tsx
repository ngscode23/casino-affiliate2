import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PageShell from "@ui/components/ui/PageShell";
import SectionCard from "@ui/components/ui/SectionCard";
import { Pill } from "@ui/components/ui/Pill";
import { fetchOfferBySlug } from "../data";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const offer = await fetchOfferBySlug(slug);
  if (!offer) {
    return {
      title: "Offer not found",
    };
  }
  return {
    title: `${offer.name} offer overview`,
    description: `Licence: ${offer.license}. Payout: ${offer.payout || "N/A"}. Methods: ${(offer.methods || []).join(", ")}.`,
  };
}

export default async function OfferDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const offer = await fetchOfferBySlug(slug);
  if (!offer) {
    notFound();
  }

  const destination = offer.link ? offer.link : `/go/${encodeURIComponent(offer.slug)}`;
  const usesExternal = Boolean(offer.link);

  return (
    <PageShell className="text-fg">
      <div className="space-y-8">
        <Link
          href="/offers"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted transition hover:text-primary"
        >
          ← Back to offers
        </Link>

        <header className="space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/60 px-4 py-1 text-xs font-semibold uppercase tracking-[0.32em] text-muted">
            Offer overview
          </span>
          <h1 className="text-3xl font-semibold text-fg sm:text-4xl">{offer.name}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="rating">★ {offer.rating.toFixed(1)}</Pill>
            {offer.pinned ? <Pill tone="warn">Pinned</Pill> : null}
            {offer.pinnedPlan ? <Pill tone="ok">Plan {offer.pinnedPlan}</Pill> : null}
            <Pill>{offer.license}</Pill>
          </div>
          <p className="text-sm text-muted">
            Lifetime clicks: {offer.clicks}
          </p>
          <p className="max-w-2xl text-sm text-muted">
            Compare the licence, expected payout speed, and supported payment methods before sending traffic. This
            page is a lightweight port of the legacy casino affiliate view while we migrate the rest of the
            experience to Next.js.
          </p>
        </header>

        <SectionCard contentClassName="gap-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-4">
              <div>
                <div className="text-sm text-muted">Payout window</div>
                <div className="text-lg font-semibold text-fg">
                  {offer.payout || "Not specified"}
                  {offer.payoutHours ? ` (~${offer.payoutHours}h)` : ""}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted">Partner link</div>
                <div className="break-all rounded-xl border border-border/40 bg-card/60 px-3 py-2 text-xs text-muted">
                  {offer.link ?? destination}
                </div>
              </div>
            </div>
            <div className="space-y-4 md:col-span-2">
              <div>
                <div className="text-sm text-muted">Supported methods</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(offer.methods ?? []).length ? (
                    offer.methods!.map((method) => <Pill key={method}>{method}</Pill>)
                  ) : (
                    <span className="text-sm text-muted">No payment data yet.</span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted">Notes</div>
                <p className="text-sm text-muted">
                  Legacy rich descriptions are still being migrated. For now we only show structured metadata. If
                  you need the full audit trail, jump to the original Vite dashboard or contact the team.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-[calc(var(--radius)+0.5rem)] border border-border/40 bg-card/60 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl text-sm text-muted">
              Ready to send traffic? Use the tracked link below. External links open in a new tab.
            </div>
            <Link
              href={destination}
              target={usesExternal ? "_blank" : undefined}
              rel={usesExternal ? "noopener noreferrer" : undefined}
              className="inline-flex h-11 items-center justify-center rounded-full border border-primary/60 bg-primary px-6 text-sm font-semibold text-primaryfg shadow-[0_24px_58px_-28px_rgba(252,50,114,0.72)] transition hover:-translate-y-[1px] hover:shadow-[0_32px_72px_-28px_rgba(252,50,114,0.86)]"
            >
              Visit partner site
            </Link>
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}
