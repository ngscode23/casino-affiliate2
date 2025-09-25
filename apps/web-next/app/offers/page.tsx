import Link from "next/link";
import type { Metadata } from "next";
import PageShell from "@ui/components/ui/PageShell";
import SectionCard from "@ui/components/ui/SectionCard";
import { Pill } from "@ui/components/ui/Pill";
import { fetchOffers } from "./data";

export const metadata: Metadata = {
  title: "Casino offers and affiliate deals",
  description: "Compare regulated casino affiliate offers, see payout timings, and jump to partner sites directly from Neon Shop.",
};

export const dynamic = "force-dynamic";

const LICENSE_OPTIONS = [
  { value: "all", label: "All licenses" },
  { value: "MGA", label: "MGA" },
  { value: "UKGC", label: "UKGC" },
  { value: "Curaçao", label: "Curaçao" },
  { value: "Other", label: "Other" },
];

function matchesQuery(value: string, query: string): boolean {
  return value.toLowerCase().includes(query);
}

export default async function OffersPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const rawQuery = typeof sp.q === "string" ? sp.q.trim() : "";
  const licenseFilter = typeof sp.license === "string" ? sp.license : "all";

  const offers = await fetchOffers();
  const query = rawQuery.toLowerCase();

  const filtered = offers.filter((offer) => {
    const licenseValue = (offer.license || "").toLowerCase();
    const matchesLicense = licenseFilter === "all" || licenseValue === licenseFilter.toLowerCase();
    if (!matchesLicense) return false;
    if (!query) return true;
    const haystack = [offer.name, offer.license, offer.payout, ...(offer.methods ?? [])]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return matchesQuery(haystack, query);
  });

  const total = offers.length;

  return (
    <PageShell className="text-[color:var(--ui-text)]">
      <div className="space-y-12">
        <header className="space-y-5 text-center sm:text-left">
          <span className="tagline">Curated casino partners</span>
          <h1 className="hero-title text-white">Find regulated casino affiliate offers</h1>
          <p className="hero-subtitle mx-auto max-w-3xl sm:mx-0">
            We track licensing data, payout speeds, and payment rails for every partner so you can focus on content
            and player retention. Use the filters to narrow down the deals that match your region.
          </p>
          <form className="flex flex-col gap-3 sm:flex-row sm:items-center" role="search">
            <input
              type="search"
              name="q"
              defaultValue={rawQuery}
              placeholder="Search by brand, payout, or method"
              className="h-11 flex-1 min-w-0 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder:text-slate-400 focus:border-[rgba(59,130,246,0.5)] focus:outline-none focus:ring-2 focus:ring-[rgba(59,130,246,0.35)]"
            />
            <select
              name="license"
              defaultValue={licenseFilter}
              className="h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white focus:border-[rgba(59,130,246,0.5)] focus:outline-none focus:ring-2 focus:ring-[rgba(59,130,246,0.35)]"
            >
              {LICENSE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button type="submit" className="button button-primary h-11 px-6">
              Update results
            </button>
          </form>
        </header>

        <SectionCard
          title="Offers"
          actions={<span className="text-sm text-[color:var(--ui-muted)]">{filtered.length} of {total}</span>}
          contentClassName="gap-6"
        >
          {filtered.length === 0 ? (
            <p className="text-sm text-[color:var(--ui-muted)]">
              No offers match the filters right now. Try clearing the search or switching the license type.
            </p>
          ) : (
            <ul className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((offer) => (
                <li key={offer.slug} className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <Link href={`/offers/${offer.slug}`} className="text-lg font-semibold text-white hover:underline">
                        {offer.name}
                      </Link>
                      <div className="text-xs uppercase tracking-wide text-[color:var(--ui-muted)]">
                        Licensed: {offer.license}
                      </div>
                      <div className="text-xs text-[color:var(--ui-muted)]">Clicks: {offer.clicks}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Pill tone="rating">★ {offer.rating.toFixed(1)}</Pill>
                      {offer.pinned ? <Pill tone="warn">Pinned</Pill> : null}
                      {offer.pinnedPlan ? <Pill tone="ok">Plan {offer.pinnedPlan}</Pill> : null}
                    </div>
                  </div>
                  {offer.payout ? (
                    <div className="mt-3 text-sm text-[color:var(--ui-muted)]">
                      Payout: {offer.payout}
                      {offer.payoutHours ? ` (~${offer.payoutHours}h)` : ""}
                    </div>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(offer.methods ?? []).slice(0, 6).map((method) => (
                      <Pill key={method}>{method}</Pill>
                    ))}
                    {(offer.methods ?? []).length > 6 ? (
                      <Pill tone="warn">+{(offer.methods ?? []).length - 6}</Pill>
                    ) : null}
                  </div>
                  <div className="mt-5 flex items-center justify-between gap-3">
                    <Link href={`/offers/${offer.slug}`} className="text-sm font-medium text-blue-300 hover:text-blue-200">
                      View details
                    </Link>
                    <Link
                      href={offer.link ? offer.link : `/go/${encodeURIComponent(offer.slug)}`}
                      target={offer.link ? "_blank" : undefined}
                      rel={offer.link ? "noopener noreferrer" : undefined}
                      className="button button-secondary h-10 px-4 text-sm"
                    >
                      Visit partner
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </PageShell>
  );
}
