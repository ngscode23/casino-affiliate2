// src/features/offers/components/OfferFiltersFeature.tsx
import React, { useEffect, useMemo, useState } from "react";

import LicenseSelect, { type LicenseFilter } from "@ui/components/compare/LicenseSelect";
import { useT } from "@shared/lib/useT";
import MobileOfferCard from "@ui/components/offers/MobileOfferCard";
import { track } from "@shared/lib/analytics";
import { useFavorites } from "@shared/lib/useFavorites";

import type { NormalizedOffer } from "@casino-affiliate/types";

export type OffersFilterState = {
  license: LicenseFilter;
  q: string;
};

type Props = {
  // optional offers list — if omitted, only controls are rendered
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
  const t = useT();
  const { items: favItems } = useFavorites();

  const [license, setLicense] = useState<LicenseFilter>(initialLicense ?? "all");
  const [q, setQ] = useState(initialQ ?? "");

  // visible subset based on filters
  function normLic(v?: string | null): LicenseFilter | string {
    try {
      if (!v) return "";
      const s = v.normalize("NFKD").replace(/\u0301/g, "").toLowerCase();
      if (s === "mga") return "MGA";
      if (s === "ukgc") return "UKGC";
      // match curacao with or without diacritics/misspellings
      if (s.includes("curacao") || /cura[ck]ao/.test(s)) return "Curacao" as LicenseFilter;
      return v;
    } catch { return v || ""; }
  }

  const visible = useMemo(() => {
    const qNorm = q.trim().toLowerCase();
    return (offers ?? [])
      .filter((o) => !!o.slug && !favItems.includes(o.slug))
      .filter((o) => (license === "all" ? true : normLic((o as any).license) === license))
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
          <label className="block text-sm mb-1">{t("offer.license")}</label>
          <LicenseSelect
            value={license}
            onChange={(val) => {
              setLicense(val);
              track({ name: "toggle_filter", params: { filter: "license", value: val } });
            }}
          />
        </div>

        <div className="sm:ml-auto">
          <label className="block text-sm mb-1">{t("filters.search") || "Search"}</label>
          <input
            className="min-w-[220px] rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
            placeholder={t("filters.searchPlaceholder") || "Casino, method."}
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
            <div className="text-[var(--text-dim)] p-4">{t("filters.noResults") || "No offers match the filters."}</div>
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

