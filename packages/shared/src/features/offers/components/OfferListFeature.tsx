// src/features/offers/components/OfferListFeature.tsx
import MobileOfferCard from "@ui/components/offers/MobileOfferCard";
import type { NormalizedOffer } from "@shared/lib/offers";
import { useImpression } from "@shared/lib/impressions";
import type { LicenseFilter } from "@ui/components/compare/LicenseSelect";
import { useT } from "@shared/lib/useT";

export type OffersFilterState = {
  license: LicenseFilter;
  q: string;
};

type Props = {
  offers: NormalizedOffer[];
  filters: OffersFilterState;
  isLoading?: boolean;
  error?: string | null;
  onReset?: () => void;
};

export default function OfferListFeature({
  offers,
  filters,
  isLoading,
  error,
  onReset,
}: Props) {
  const t = useT();
  if (isLoading) {
    return <div className="text-neutral-300">{t("common.loading") || "Loading..."}</div>;
  }
  if (error) {
    return <div className="text-red-400">{(t("common.error") || "Error") + ": "}{error}</div>;
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
    return (
      <div className="flex items-center justify-between gap-3 text-neutral-300">
        <div>{t("filters.noResults") || "No offers match the filters."}</div>
        {onReset ? (
          <button
            type="button"
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
            onClick={onReset}
          >
            {t("filters.reset") || "Reset"}
          </button>
        ) : null}
      </div>
    );
  }

  function ListItem({ offer }: { offer: NormalizedOffer }) {
    const ref = useImpression(offer.slug);
    return (
      <div ref={ref} className="h-full">
        <MobileOfferCard key={offer.slug} offer={offer} className="h-full" />
      </div>
    );
  }

  return (
    <div className="grid auto-rows-fr items-stretch gap-6 md:grid-cols-2 xl:grid-cols-3">
      {filtered.map((o) => (
        <ListItem key={o.slug} offer={o} />
      ))}
    </div>
  );
}

// Generic alias to avoid tight coupling with offer wording
export const ProductListFeature = OfferListFeature;

