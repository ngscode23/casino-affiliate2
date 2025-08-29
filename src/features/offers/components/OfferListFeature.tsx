// src/features/offers/components/OfferListFeature.tsx
import MobileOfferCard from "@/components/offers/MobileOfferCard";
import type { NormalizedOffer } from "@/lib/offers";
import type { LicenseFilter } from "@/components/compare/LicenseSelect";

export type OffersFilterState = {
  license: LicenseFilter;
  q: string;
};

type Props = {
  offers: NormalizedOffer[];
  filters: OffersFilterState;
  isLoading?: boolean;
  error?: string | null;
};

export default function OfferListFeature({
  offers,
  filters,
  isLoading,
  error,
}: Props) {
  if (isLoading) {
    return <div className="neon-card p-4">Loading...</div>;
  }
  if (error) {
    return <div className="neon-card p-4 text-red-400">Error: {error}</div>;
  }

  const filtered = offers.filter((o) => {
    if (filters.license !== "all" && o.license !== filters.license) return false;

    if (filters.q.trim()) {
      const q = filters.q.toLowerCase();
      const hay = [o.name, o.license, ...(o.methods ?? [])].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    return <div className="neon-card p-4">No offers match the filters.</div>;
  }

  return (
    <div className="grid gap-3 sm:gap-4 md:gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {filtered.map((o) => (
        <MobileOfferCard key={o.slug} offer={o} />
      ))}
    </div>
  );
}

