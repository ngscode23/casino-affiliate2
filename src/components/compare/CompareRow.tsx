// src/components/compare/CompareRow.tsx
import { track } from "@/lib/analytics";
import type { NormalizedOffer } from "@/lib/offers";

export function CompareRow({
  offer,
  index,
  addToCompare
}: {
  offer: NormalizedOffer;
  index: number; // позиция строки (0-based)
  addToCompare: (slug: string) => void;
}) {
  return (
    <div
      role="row"
      aria-rowindex={index + 1} // а11y: 1-based индекс строки
      className="grid grid-cols-[2fr_1fr_1fr_auto] items-center gap-2"
    >
      <div role="gridcell">{offer.name}</div>
      <div role="gridcell">{offer.license}</div>
      <div role="gridcell">{offer.payout}</div>
      <button
        type="button"
        onClick={() => {
          addToCompare(offer.slug);
          track({
            name: "add_to_compare",
            params: { offer_slug: offer.slug, position: index + 1 } // пишем 1-based
          });
        }}
        className="btn btn-outline"
      >
        {/* TODO: t('compare.addToCompare') */}
        Добавить к сравнению
      </button>
    </div>
  );
}

export default CompareRow;



