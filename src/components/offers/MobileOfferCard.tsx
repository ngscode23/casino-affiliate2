// src/components/offers/MobileOfferCard.tsx
import { useMemo } from "react";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";

import Rating from "@/components/common/rating";
import CompareInline from "@/components/compare/CompareInline";
import { FavControl } from "@/components/FavControl";
import AffiliateLink from "@/components//misc/AffiliateLink";
import { t } from "@/lib/t";
import { toast } from "@/components/common/toast";

import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/common/sheet";

import { useCompare } from "@/ctx/CompareContext";
import type { NormalizedOffer } from "@/lib/offers";

type Props = {
  offer: NormalizedOffer;
  className?: string;
  /** index in list (0-based) for analytics; optional */
  index?: number;
};

export default function MobileOfferCard({ offer, className = "", index }: Props) {
  const { toggle: toggleCompare, isSelected } = useCompare();
  const id = offer.slug;
  const selected = isSelected(id);
  const plan = (offer as any).pinnedPlan as string | undefined;
  const isPinned = (offer as any).pinned as boolean | undefined;
  const badge = plan === "TOP" ? "Top" : plan === "FEATURED" ? "Featured" : plan || isPinned ? "Featured" : null;

  const methods = useMemo(() => offer.methods ?? [], [offer.methods]);

  const summary = useMemo(() => {
    const parts: string[] = [];
    if (offer.payout) parts.push(`Payout: ${offer.payout}${offer.payoutHours ? ` (~${offer.payoutHours}h)` : ""}`);
    if (offer.license) parts.push(`License: ${offer.license}`);
    if (typeof offer.rating === "number") parts.push(`Rating: ${offer.rating}`);
    return parts.join(" • ");
  }, [offer.payout, offer.payoutHours, offer.license, offer.rating]);

  const position = index != null ? index + 1 : undefined;

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-[var(--bg-1)] p-4 shadow-[0_6px_24px_rgba(0,0,0,.35)] hover:shadow-[0_12px_36px_rgba(0,0,0,.45)] transition-shadow transition-transform transform-gpu hover:translate-y-[-1px] hover:scale-[1.01] active:scale-[0.995] ${className}`}
    >
      {/* Header: title/license + actions */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="text-base font-semibold truncate inline-flex items-center gap-2">
            <span className="truncate">{offer.name}</span>
            {badge && (
              <span
                title={badge === "Top" ? "Top placement (sponsored)" : "Featured placement (sponsored)"}
                className={
                  "shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold " +
                  (badge === "Top"
                    ? "bg-yellow-500/20 text-yellow-200 border border-yellow-600/40"
                    : "bg-pink-500/15 text-pink-200 border border-pink-600/40")
                }
              >
                {badge}
              </span>
            )}
          </div>
          <div className="text-xs text-[var(--text-dim)]">{offer.license}</div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <Rating value={offer.rating ?? 0} />
          <FavControl id={offer.slug} className="inline-flex h-10 w-10" />
        </div>
      </div>

      {/* Summary */}
      <div className="mt-3 text-sm">{summary}</div>

      {/* Methods */}
      {methods.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {methods.map((m, i) => (
            <span key={`${m}-${i}`} className="neon-chip">
              {m}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {/* CTA */}
        <AffiliateLink
          offerSlug={offer.slug}
          position={position}
          href={`/go/${encodeURIComponent(offer.slug)}`}
          size="sm"
          className="btn w-full inline-flex items-center justify-center gap-2"
          aria-label={`Open ${offer.name}`}
        >
          {t("offer.cta") || "Play"} <ExternalLink className="h-4 w-4" />
        </AffiliateLink>

        {/* Compare toggle */}
        <button
          type="button"
          className={`btn ${selected ? "btn-secondary" : "btn-soft"} min-h-[44px] px-3 py-2 text-[13px] leading-[1.1]`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const next = !selected;
            toggleCompare(offer);
            toast(next ? "Добавлено к сравнению" : "Убрано из сравнения", { variant: next ? "success" : "info" });
          }}
          aria-pressed={selected}
        >
          {selected ? t("compare.selected") : t("compare.add")}
        </button>

        {/* Details (sheet) */}
        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              className="btn btn-ghost w-full min-h-[44px] px-3 py-2 text-[13px] leading-[1.1]"
              aria-label={`Details for ${offer.name}`}
            >
              {t("offer.details") || "Details"}
            </button>
          </SheetTrigger>

          <SheetContent side="bottom" className="max-h-[80vh] w-full rounded-t-2xl border-white/10 bg-[var(--bg-0)] text-[var(--text)] p-0 overflow-hidden">
            <SheetHeader className="sr-only">
              <SheetTitle>{offer.name}</SheetTitle>
              <SheetDescription>Casino details</SheetDescription>
            </SheetHeader>

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
              className="p-6"
            >
              {/* summary */}
              <div>
                <div className="text-base sm:text-lg font-semibold">{offer.name}</div>
                <div className="mt-1 text-[var(--text-dim)]">{summary}</div>
              </div>

              <div className="mt-6 space-y-6 text-sm">
                {/* stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[var(--text-dim)]">Rating</div>
                    <div className="mt-1">
                      <Rating value={offer.rating ?? 0} />
                    </div>
                  </div>

                  <div>
                    <div className="text-[var(--text-dim)]">License</div>
                    <div className="mt-1">{offer.license}</div>
                  </div>

                  <div>
                    <div className="text-[var(--text-dim)]">Payout</div>
                    <div className="mt-1">
                      {offer.payout}
                      {offer.payoutHours ? ` (~${offer.payoutHours}h)` : ""}
                    </div>
                  </div>

                  <div>
                    <div className="text-[var(--text-dim)]">Methods</div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {offer.methods.length
                        ? offer.methods.map((m, i) => (
                            <span key={`${m}-${i}`} className="neon-chip">
                              {m}
                            </span>
                          ))
                        : "-"}
                    </div>
                  </div>
                </div>

                {/* actions + compare */}
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <FavControl id={offer.slug} className="inline-flex h-10 w-10" />

                  <AffiliateLink
                    offerSlug={offer.slug}
                    position={position}
                    href={`/go/${encodeURIComponent(offer.slug)}`}
                    size="sm"
                    className="btn w-full inline-flex items-center justify-center gap-2"
                    aria-label={`Open ${offer.name}`}
                  >
                    {t("offer.cta") || "Play"} <ExternalLink className="h-4 w-4" />
                  </AffiliateLink>

                  <button
                    type="button"
                    className={`btn ${selected ? "btn-secondary" : "btn-soft"} w-full min-h-[44px] px-3 py-2 text-[13px] leading-[1.1]`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const next = !selected;
                      toggleCompare(offer);
                      toast(next ? "Добавлено к сравнению" : "Убрано из сравнения", { variant: next ? "success" : "info" });
                    }}
                    aria-pressed={selected}
                  >
                    {selected ? t("compare.selectedFor") : t("compare.addTo")}
                  </button>
                </div>

                <CompareInline className="md:hidden mt-6" />
              </div>
            </motion.div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

