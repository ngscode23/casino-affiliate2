// src/components/offers/OfferCard.tsx
import type { NormalizedOffer } from "@/lib/offers";
import AffiliateLink from "@/components/misc/AffiliateLink";
import { t } from "@/lib/t";

type Props = {
  offer: NormalizedOffer;
  /** позиция карточки (0-based) для аналитики; опционально */
  index?: number;
};

export default function OfferCard({ offer, index }: Props) {
  const position = typeof index === "number" ? index + 1 : undefined;

  return (
    <li className="rounded-2xl border border-white/10 bg-[var(--bg-1)] p-5 shadow-[0_6px_24px_rgba(0,0,0,.35)]">
      <div className="flex items-start justify-between gap-4">
        {/* info */}
        <div>
          <h3 className="text-lg font-semibold text-[var(--text)]">{offer.name}</h3>

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
            {offer.methods.slice(0, 3).map((m) => (
              <span
                key={m}
                className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-[var(--text-dim)]"
              >
                {m}
              </span>
            ))}
          </div>
        </div>

        {/* rating */}
        {typeof offer.rating === "number" && (
          <div className="text-right">
            <div className="text-2xl font-extrabold text-[var(--text)]">
              {offer.rating.toFixed(1)}
            </div>
            <div className="text-xs text-[var(--text-dim)]">
              {t("offer.ratingLabel", "ru") || "рейтинг"}
            </div>
          </div>
        )}
      </div>

      {/* actions */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <AffiliateLink
          offerSlug={offer.slug}
          position={position}
          href={offer.link ?? `/go/${offer.slug}`}
          className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:ring-offset-0"
        >
          {t("offer.cta") || "Перейти"}
        </AffiliateLink>

        {offer.slug && (
          <a
            href={`#/compare?sort=rating&dir=desc&license=all&method=all&focus=${offer.slug}`}
            className="min-h-[44px] inline-flex items-center px-2 text-sm text-brand-300 hover:text-brand-200"
          >
            {t("compare.compareLink") || "Сравнить"}
          </a>
        )}
      </div>
    </li>
  );
}


