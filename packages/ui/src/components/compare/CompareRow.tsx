// src/components/compare/CompareRow.tsx
import { track } from "@shared/lib/analytics";
import type { NormalizedOffer } from "@shared/lib/offers";
import { toast } from "@ui/components/common/toast";

export function CompareRow({
  offer,
  index,
  addToCompare,
}: {
  offer: NormalizedOffer;
  index: number; // 0-based
  addToCompare: (slug: string) => void;
}) {
  return (
    <div
      role="row"
      aria-rowindex={index + 1}
      className="grid grid-cols-[2fr_1fr_1fr_auto] items-center gap-2"
    >
      <div role="gridcell">{offer.name}</div>
      <div role="gridcell">{offer.license}</div>
      <div role="gridcell">{offer.payout}</div>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          addToCompare(offer.slug);
          track({ name: "add_to_compare", params: { offer_slug: offer.slug, position: index + 1 } });
          toast("Добавлено в сравнение", { variant: "success" });
        }}
        className="btn btn-outline"
      >
        Добавить в сравнение
      </button>
    </div>
  );
}

export default CompareRow;


