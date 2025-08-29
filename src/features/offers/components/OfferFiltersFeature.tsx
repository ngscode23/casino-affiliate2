// src/features/offers/components/OfferFiltersFeature.tsx
import React, { useEffect, useMemo, useState } from "react";

import LicenseSelect, { type LicenseFilter } from "@/components/compare/LicenseSelect";
import MobileOfferCard from "@/components/offers/MobileOfferCard";
import { track } from "@/lib/analytics";
import { useFavorites } from "@/lib/useFavorites";

import type { NormalizedOffer } from "@/types/offer";

export type OffersFilterState = {
  license: LicenseFilter;
  q: string;
};

type Props = {
  // делаем offers опциональным — если родитель не передал, берем пустой массив
  offers?: NormalizedOffer[];
  // Optional initial values supplied by parent
  initialLicense?: LicenseFilter;
  initialQ?: string;
  /**
   * optional callback to notify parent about filter state changes
   */
  onChange?: (state: OffersFilterState) => void;
};

export function OfferFiltersFeature({ offers, initialLicense, initialQ, onChange }: Props) {
  const { items: favItems } = useFavorites();

  const [license, setLicense] = useState<LicenseFilter>(initialLicense ?? "all");
  const [q, setQ] = useState(initialQ ?? "");

  // visible — офферы, которые НЕ в избранном
  const visible = useMemo(() => {
    const qNorm = q.trim().toLowerCase();
    return (offers ?? [])
      .filter((o) => !!o.slug && !favItems.includes(o.slug))
      .filter((o) => (license === "all" ? true : o.license === license))
      .filter((o) => {
        if (!qNorm) return true;
        const hay = [o.name, o.license, ...(o.methods ?? [])].join(" ").toLowerCase();
        return hay.includes(qNorm);
      });
  }, [offers, favItems, license, q]);

  // notify parent when filters change
  useEffect(() => {
    onChange?.({ license, q });
  }, [license, q, onChange]);

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center mb-4">
        <div>
          <label className="block text-sm mb-1">License</label>
          <LicenseSelect
            value={license}
            onChange={(val) => {
              setLicense(val);
              track({ name: "toggle_filter", params: { filter: "license", value: val } });
            }}
          />
        </div>

        <div className="sm:ml-auto">
          <label className="block text-sm mb-1">Search</label>
          <input
            className="border rounded-md px-3 py-2 min-w-[220px]"
            placeholder="Casino, method…"
            value={q}
            onChange={(e) => {
              const next = e.target.value;
              setQ(next);
              track({ name: "toggle_filter", params: { filter: "search", value: next } });
            }}
          />
        </div>
      </div>

      {/* Visible offers grid - only when offers are provided */}
      {Array.isArray(offers) && offers.length > 0 && (
        <div className="grid gap-4">
          {visible.length === 0 ? (
            <div className="text-[var(--text-dim)] p-4">No offers match the filters.</div>
          ) : (
            visible.map((o) => <MobileOfferCard key={o.slug} offer={o} />)
          )}
        </div>
      )}
    </div>
  );
}

// default export to be tolerant to different import styles
export default OfferFiltersFeature;
