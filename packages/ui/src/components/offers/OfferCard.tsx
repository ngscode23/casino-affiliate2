// src/components/offers/OfferCard.tsx
import type { NormalizedOffer } from "@shared/lib/offers";
import { Link } from "react-router-dom";
import AffiliateLink from "@ui/components/misc/AffiliateLink";
import { useVertical } from "@shared/ctx/VerticalContext";
import { useT } from "@shared/lib/useT";
import { Pill } from "@ui/components/ui/Pill";

type Props = {
  offer: NormalizedOffer;
  /** index in list (0-based) for analytics; optional */
  index?: number;
};

export default function OfferCard({ offer, index }: Props) {
  const t = useT();
  const vertical = useVertical();
  const position = typeof index === "number" ? index + 1 : undefined;
  const plan = (offer as any).pinnedPlan as string | undefined;
  const isPinned = (offer as any).pinned as boolean | undefined;
  const badge = plan === 'TOP' ? 'Top' : plan === 'FEATURED' ? 'Featured' : (plan || isPinned) ? 'Featured' : null;

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
      return (t(`attributes.payout_methods.options.${code}`) as string) ||
        ({ cards: 'Cards', sepa: 'SEPA', crypto: 'Crypto', paypal: 'PayPal', skrill: 'Skrill', bank_transfer: 'Bank transfer' } as Record<string,string>)[code] || raw;
    }
    // Fallback: capitalize words
    return raw.replace(/(^|\s|_|-)([a-z])/g, (_, p1, p2) => `${p1 === '_' || p1 === '-' ? ' ' : p1}${p2.toUpperCase()}`).replace(/_/g, ' ').trim();
  };

  return (
    <li className="rounded-2xl border border-white/5 bg-[color:var(--surface-elev,#141720)] p-5">
      <div className="flex items-start justify-between gap-4">
        {/* info */}
        <div>
          <h3 className="text-lg font-semibold text-[var(--text)] flex items-center gap-2">
            {offer.name}
            {badge && (
              <span
                title={badge === 'Top' ? 'Top placement (sponsored)' : 'Featured placement (sponsored)'}
                className={
                  'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ' +
                  (badge === 'Top' ? 'bg-yellow-500/20 text-yellow-200 border border-yellow-600/40' : 'bg-pink-500/15 text-pink-200 border border-pink-600/40')
                }
              >{badge}</span>
            )}
          </h3>

          <div className="mt-2 flex flex-wrap gap-2">
            {offer.license && (
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-[var(--text-dim)]">
                {t("offer.license")}: {offer.license}
              </span>
            )}

            {typeof offer.payoutHours === "number" && (
              <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-xs text-emerald-300">
                {(t("offer.payoutFast") || "Payout ~{hours}h").replace("{hours}", String(offer.payoutHours))}
              </span>
            )}
            {(offer.methods || []).slice(0, 3).map((m) => (
              <span
                key={m}
                className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-[var(--text-dim)]"
              >
                {methodLabel(m)}
              </span>
            ))}
          </div>
        </div>

        {/* rating */}
        {typeof offer.rating === "number" && (
          <div className="text-right">
            <Pill tone="rating">★ {offer.rating.toFixed(1)}</Pill>
          </div>
        )}
      </div>

      {/* actions */}
      <div className="mt-5 flex items-center justify-between gap-3">
        <AffiliateLink
          offerSlug={offer.slug}
          position={position}
          href={`/go/${encodeURIComponent(offer.slug)}`}
          className=""
        >
          {t("offer.cta")}
        </AffiliateLink>

        {offer.slug && (
          <Link
            to={`/compare?sort=rating&dir=desc&license=all&method=all&focus=${encodeURIComponent(offer.slug)}`}
            className="min-h-[44px] inline-flex items-center px-2 text-sm text-[rgb(var(--accent))] hover:opacity-90"
          >
            {t("compare.compareLink")}
          </Link>
        )}
      </div>

      {/* Disclosure (vertical-driven) */}
      {vertical.disclosures?.card ? (
        <div className="mt-2 text-[11px] text-[var(--text-dim)]">
          {t(vertical.disclosures.card)}
        </div>
      ) : null}
    </li>
  );
}

