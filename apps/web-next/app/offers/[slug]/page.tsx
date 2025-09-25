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
    <PageShell className="text-[color:var(--ui-text)]">
      <div className="space-y-8">
        <Link href="/offers" className="text-sm text-blue-300 hover:text-blue-200">
          ← Back to offers
        </Link>

        <header className="space-y-3">
          <span className="tagline">Offer overview</span>
          <h1 className="text-3xl font-semibold text-white sm:text-4xl">{offer.name}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="rating">★ {offer.rating.toFixed(1)}</Pill>
            {offer.pinned ? <Pill tone="warn">Pinned</Pill> : null}
            {offer.pinnedPlan ? <Pill tone="ok">Plan {offer.pinnedPlan}</Pill> : null}
            <Pill>{offer.license}</Pill>
          </div>
          <p className="text-sm text-[color:var(--ui-muted)]">
            Lifetime clicks: {offer.clicks}
          </p>
          <p className="max-w-2xl text-sm text-[color:var(--ui-muted)]">
            Compare the licence, expected payout speed, and supported payment methods before sending traffic. This
            page is a lightweight port of the legacy casino affiliate view while we migrate the rest of the
            experience to Next.js.
          </p>
        </header>

        <SectionCard contentClassName="gap-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-4">
              <div>
                <div className="text-sm text-[color:var(--ui-muted)]">Payout window</div>
                <div className="text-white">
                  {offer.payout || "Not specified"}
                  {offer.payoutHours ? ` (~${offer.payoutHours}h)` : ""}
                </div>
              </div>
              <div>
                <div className="text-sm text-[color:var(--ui-muted)]">Partner link</div>
                <div className="break-all text-xs text-[color:var(--ui-muted)]">
                  {offer.link ?? destination}
                </div>
              </div>
            </div>
            <div className="space-y-4 md:col-span-2">
              <div>
                <div className="text-sm text-[color:var(--ui-muted)]">Supported methods</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(offer.methods ?? []).length ? (
                    offer.methods!.map((method) => <Pill key={method}>{method}</Pill>)
                  ) : (
                    <span className="text-sm text-[color:var(--ui-muted)]">No payment data yet.</span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-sm text-[color:var(--ui-muted)]">Notes</div>
                <p className="text-sm text-[color:var(--ui-muted)]">
                  Legacy rich descriptions are still being migrated. For now we only show structured metadata. If
                  you need the full audit trail, jump to the original Vite dashboard or contact the team.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-[color:var(--ui-muted)]">
              Ready to send traffic? Use the tracked link below. External links open in a new tab.
            </div>
            <Link
              href={destination}
              target={usesExternal ? "_blank" : undefined}
              rel={usesExternal ? "noopener noreferrer" : undefined}
              className="button button-primary h-11 px-6"
            >
              Visit partner site
            </Link>
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}
