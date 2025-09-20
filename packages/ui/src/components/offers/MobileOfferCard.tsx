// src/components/offers/MobileOfferCard.tsx
import { useMemo } from "react";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";

import { Pill } from "@ui/components/ui/Pill";
import CompareInline from "@ui/components/compare/CompareInline";
import { FavControl } from "@ui/components/FavControl";
import ActionLink from "@ui/components/common/ActionLink";
import { ButtonGhost } from "@ui/components/ui/Buttons";
import { t } from "@shared/lib/t";
import { toast } from "@ui/components/common/toast";

import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@ui/components/common/sheet";

import { useCompare } from "@shared/ctx/CompareContext";
import { useVertical } from "@shared/ctx/VerticalContext";
import type { NormalizedOffer } from "@shared/lib/offers";

type Props = {
  offer: NormalizedOffer;
  className?: string;
  /** index in list (0-based) for analytics; optional */
  index?: number;
};

export default function MobileOfferCard({ offer, className = "", index }: Props) {
  const { toggle: toggleCompare, isSelected } = useCompare();
  const vertical = useVertical();
  const id = offer.slug;
  const selected = isSelected(id);
  const plan = (offer as any).pinnedPlan as string | undefined;
  const isPinned = (offer as any).pinned as boolean | undefined;
  const badge = plan === "TOP" ? "Top" : plan === "FEATURED" ? "Featured" : plan || isPinned ? "Featured" : null;

  // Map payout method codes to human-friendly/i18n labels.
  const methodLabel = (m: string): string => {
    const raw = String(m || '').trim();
    const lower = raw.toLowerCase().replace(/\s+/g, ' ').replace(/[_-]/g, '_');
    const code =
      lower === 'cards' ? 'cards' :
      lower === 'sepa' ? 'sepa' :
      lower === 'crypto' ? 'crypto' :
      lower === 'paypal' ? 'paypal' :
      lower === 'skrill' ? 'skrill' :
      (lower === 'bank_transfer' || lower === 'bank transfer') ? 'bank_transfer' :
      null;
    if (code) {
      // prefer attributes.payout_methods i18n; fallback to readable defaults
      return (
        t(`attributes.payout_methods.options.${code}`) ||
        (
          ({
            cards: 'Cards',
            sepa: 'SEPA',
            crypto: 'Crypto',
            paypal: 'PayPal',
            skrill: 'Skrill',
            bank_transfer: 'Bank transfer',
          } as Record<string, string>)[code] || raw
        )
      );
    }
    // Fallback: capitalize words
    return raw
      .replace(/(^|\s|_|-)([a-z])/g, (_, p1, p2) => `${p1 === '_' || p1 === '-' ? ' ' : p1}${p2.toUpperCase()}`)
      .replace(/_/g, ' ')
      .trim();
  };

  const methods = useMemo(() => (offer.methods ?? []).map(methodLabel), [offer.methods]);

  const summary = useMemo(() => {
    const parts: string[] = [];
    if (vertical.list.visibleFields.includes("payout") && offer.payout) {
      const hoursSuffix = offer.payoutHours ? ` (~${offer.payoutHours}h)` : "";
      parts.push(`${t("offer.payout") || "Payout"}: ${offer.payout}${hoursSuffix}`);
    }
    if (offer.license) parts.push(`${t("offer.license") || "License"}: ${offer.license}`);
    if (typeof offer.rating === "number") parts.push(`${t("offer.ratingLabel") || "Rating"}: ${offer.rating}`);
    return parts.join(" • ");
  }, [offer.payout, offer.payoutHours, offer.license, offer.rating, vertical.list.visibleFields]);

  const position = index != null ? index + 1 : undefined;

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-[var(--bg-1)] p-4 transition-colors hover:bg-white/5 flex flex-col min-h-[220px] h-full ${className}`}
    >
      {/* Header: title/license + actions */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="text-base font-semibold truncate inline-flex items-center gap-2">
            <span className="truncate">{offer.name}</span>
            {badge && (
              <span
                title={badge === "Top" ? "Top placement (sponsored)" : "Featured placement (sponsored)"}
                className="shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border border-white/10 bg-white/5 text-neutral-200"
              >
                {badge}
              </span>
            )}
          </div>
          <div className="text-xs text-[var(--text-dim)] sr-only">{offer.license}</div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <Pill tone="rating" aria-label={`Rating ${typeof offer.rating === "number" ? offer.rating.toFixed(1) : String(offer.rating ?? 0)} out of 5`}>
            ★ {typeof offer.rating === "number" ? offer.rating.toFixed(1) : String(offer.rating ?? 0)}
          </Pill>
          <FavControl id={offer.slug} className="inline-flex h-10 w-10" />
        </div>
      </div>

      {/* Summary */}
      <div className="mt-3 text-sm">{summary}</div>

      {/* License + Methods as Pills (limit to 2–3, then +X) */}
      <div className="mt-3 flex flex-wrap gap-2">
        {vertical.list.pills?.includes("license") && offer.license ? <Pill>{offer.license}</Pill> : null}
        {vertical.list.pills?.includes("methods") && methods.length > 0 ? (
          (() => {
            const max = 2;
            const shown = methods.slice(0, max);
            const rest = methods.length - shown.length;
            return (
              <>
                {shown.map((m, i) => (
                  <Pill key={`${m}-${i}`}>{m}</Pill>
                ))}
                {rest > 0 ? <Pill>{`+${rest}`}</Pill> : null}
              </>
            );
          })()
        ) : null}
      </div>

      {/* Actions */}
      <div className="mt-auto pt-4 grid grid-cols-3 gap-2">
        {/* CTA */}
        <ActionLink
          action={{
            kind: "external",
            labelKey: vertical.list.cta?.labelKey || "offer.cta",
            href: `/go/${encodeURIComponent(offer.slug)}`,
            productSlug: offer.slug,
            position,
            size: "sm",
            className: "w-full inline-flex items-center justify-center gap-2",
          }}
        >
          {t(vertical.list.cta?.labelKey || "offer.cta") || "Go"} <ExternalLink className="h-4 w-4 opacity-80" />
        </ActionLink>

        {/* Compare toggle */}
        <button
          data-testid="compare-toggle"
          type="button"
          className={`rounded-xl border ${selected ? "bg-white/10 border-white/20 text-white" : "border-white/10 text-neutral-200 hover:bg-white/5"} min-h-[44px] px-3 py-2 text-[13px] leading-[1.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40`}
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
            <ButtonGhost className="min-h-[40px] px-3 py-2 text-[13px]" aria-label={`Details for ${offer.name}`}>
              {t("offer.details") || "Details"}
            </ButtonGhost>
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
                    <div className="text-[var(--text-dim)]">{t("offer.ratingLabel") || "Rating"}</div>
                    <div className="mt-1"><Pill tone="rating" aria-label={`Rating ${typeof offer.rating === "number" ? offer.rating.toFixed(1) : String(offer.rating ?? 0)} out of 5`}>★ {typeof offer.rating === "number" ? offer.rating.toFixed(1) : String(offer.rating ?? 0)}</Pill></div>
                  </div>

                  <div>
                    <div className="text-[var(--text-dim)]">{t("offer.license") || "License"}</div>
                    <div className="mt-1">{offer.license}</div>
                  </div>

                  <div>
                    <div className="text-[var(--text-dim)]">{t("offer.payout") || "Payout"}</div>
                    <div className="mt-1">
                      {offer.payout}
                      {offer.payoutHours ? ` (~${offer.payoutHours}h)` : ""}
                    </div>
                  </div>

                  <div>
                    <div className="text-[var(--text-dim)]">{t("filters.methods") || "Methods"}</div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {offer.methods.length
                        ? offer.methods.map((m, i) => (
                            <Pill key={`${m}-${i}`}>{methodLabel(m)}</Pill>
                          ))
                        : "-"}
                    </div>
                  </div>
                </div>

                {/* actions + compare */}
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <FavControl id={offer.slug} className="inline-flex h-10 w-10" />

                  <ActionLink
                    action={{
                      kind: "external",
                      labelKey: vertical.list.cta?.labelKey || "offer.cta",
                      href: `/go/${encodeURIComponent(offer.slug)}`,
                      productSlug: offer.slug,
                      position,
                      size: "sm",
                      className: "w-full inline-flex items-center justify-center gap-2",
                    }}
                  >
                    {t(vertical.list.cta?.labelKey || "offer.cta") || "Go"} <ExternalLink className="h-4 w-4 opacity-80" />
                  </ActionLink>

                  <button
                    type="button"
                    className={`rounded-xl border ${selected ? "bg-white/10 border-white/20 text-white" : "border-white/10 text-neutral-200 hover:bg-white/5"} w-full min-h-[44px] px-3 py-2 text-[13px] leading-[1.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40`}
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

      {/* Disclosure (vertical-driven) */}
      {vertical.disclosures?.card ? (
        <div className="mt-2 text-[11px] text-[var(--text-dim)]">
          {t(vertical.disclosures.card)}
        </div>
      ) : null}
    </div>
  );
}

