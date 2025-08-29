// src/components/CasinoCard.tsx
import type { Offer } from "../data/casinos";
import AffiliateLink from "@/components/misc/AffiliateLink";

export function CasinoCard({ offer }: { offer: Offer }) {
  const { name, license, payout, methods = [], link, rating } = offer;

  // надёжный slug даже если в типе slug?: string
  const slug = (offer.slug ?? name).toLowerCase().trim().replace(/\s+/g, "-");

  return (
    <li className="rounded-lg border border-slate-800 p-4">
      {/* Мета для микроразметки, если тебе это реально нужно в LI */}
      <meta itemProp="name" content={name} />
      <meta itemProp="aggregateRating" itemScope itemType="https://schema.org/AggregateRating" />
      <meta itemProp="ratingValue" content={String(rating ?? "")} />
      <meta itemProp="bestRating" content="5" />

      <h2 className="text-lg font-bold">{name}</h2>
      <p>Лицензия: {license}</p>
      <p>Выплаты: {payout}</p>
      <p>Методы: {methods.join(", ")}</p>

      {link && (
        <AffiliateLink
          offerSlug={slug}
          href={link}
          // position можно пробросить, если знаешь индекс карточки
          className="inline-flex items-center rounded-xl bg-sky-400 px-4 py-2 font-semibold text-slate-900 hover:brightness-95 min-h-[44px]"
        >
          Перейти
        </AffiliateLink>
      )}
    </li>
  );
}



