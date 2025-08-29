// src/components/compare/CompareTable.tsx
import { Link } from "react-router-dom";
import Card from "@/components/common/card";
// import Rating from "@/components/common/rating"; // больше не нужен
import { FavControl } from "@/components/FavControl";
import { useCompare } from "@/ctx/CompareContext";
import type { NormalizedOffer } from "@/lib/offers";
import { RatingPill, PayoutPill } from "@/components/compare/Pills";
import Tooltip from "@/components/ui/Tooltip"; // ← вот так

export type SortKey = "rating" | "payoutHours";

type Props = {
  offers: NormalizedOffer[];
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onSortChange: (key: SortKey, dir: "asc" | "desc") => void;
};

export default function CompareTable({
  offers,
  sortKey,
  sortDir,
  onSortChange,
}: Props) {
  const { isSelected, toggle } = useCompare();

  const sorted = [...offers].sort((a, b) => {
    if (sortKey === "rating") {
      const av = a.rating ?? 0;
      const bv = b.rating ?? 0;
      return sortDir === "asc" ? av - bv : bv - av;
    }
    const av = a.payoutHours ?? Number.POSITIVE_INFINITY;
    const bv = b.payoutHours ?? Number.POSITIVE_INFINITY;
    return sortDir === "asc" ? av - bv : bv - av;
  });

  const nextDir = (key: SortKey): "asc" | "desc" =>
    sortKey === key ? (sortDir === "asc" ? "desc" : "asc") : "desc";

  const SortHeader = ({
    k,
    children,
    className = "",
  }: {
    k: SortKey;
    children: React.ReactNode;
    className?: string;
  }) => (
    <button
      type="button"
      onClick={() => onSortChange(k, nextDir(k))}
      className={[
        "inline-flex items-center gap-1 select-none",
        "text-[var(--muted)] hover:text-[var(--text)]",
        className,
      ].join(" ")}
    >
      {children}
      {sortKey === k ? <span aria-hidden>{sortDir === "asc" ? "▲" : "▼"}</span> : null}
    </button>
  );

  return (
    <Card className="p-0 hidden md:block">
      <div className="neon-card p-0 overflow-auto max-h-[70vh]">
        <table className="neon-table w-full">
          <colgroup>
            <col style={{ width: "140px" }} />
            <col style={{ width: "80px" }} />
            <col style={{ width: "260px" }} />
            <col style={{ width: "140px" }} />
            <col style={{ width: "140px" }} />
            <col style={{ width: "160px" }} />
            <col />
            <col style={{ width: "140px" }} />
          </colgroup>

          <thead className="sticky top-0 z-10" style={{ background: "var(--bg-1)" }}>
            <tr>
              <th className="px-4 py-2">COMPARE</th>
              <th className="px-4 py-2">FAV</th>
              <th className="px-4 py-2">FIRM</th>
              <th className="px-4 py-2">
                <SortHeader k="rating">RATING</SortHeader>
              </th>

              <th className="px-4 py-2">
                <Tooltip label="Официальная лицензия оператора">
                  <span className="inline-flex items-center gap-1 text-[var(--muted)] hover:text-[var(--text)]">
                    LICENSE <span aria-hidden>ⓘ</span>
                  </span>
                </Tooltip>
              </th>

              <th className="px-4 py-2">
                <SortHeader k="payoutHours">PAYOUT</SortHeader>
              </th>
              <th className="px-4 py-2">METHODS</th>
              <th className="px-4 py-2">ACTION</th>
            </tr>
          </thead>

          <tbody>
            {sorted.map((o) => {
              const slug = o.slug ?? o.name.toLowerCase().replace(/\s+/g, "-");
              const selected = o.slug ? isSelected(o.slug) : false;

              return (
                <tr key={slug} className="hover:bg-white/5 transition-colors">
                  {/* COMPARE */}
                  <td className="px-4 py-3">
                    {o.slug ? (
                      <button
                        type="button"
                        aria-pressed={selected}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggle(o);
                        }}
                        className={
                          "inline-flex items-center justify-center h-9 px-3 rounded-md transition " +
                          (selected
                            ? "bg-white/10 border border-white/20 text-white"
                            : "bg-brand-600 hover:bg-brand-700 text-white")
                        }
                      >
                        {selected ? "Selected" : "Compare"}
                      </button>
                    ) : null}
                  </td>

                  {/* FAV */}
                  <td className="px-4 py-3">
                    {o.slug ? (
                      <FavControl
                        id={o.slug}
                        className="inline-flex h-10 w-10 items-center justify-center"
                      />
                    ) : null}
                  </td>

                  {/* FIRM */}
                  <td className="px-4 py-3 font-semibold">
                    <Link
                      className="hover:underline cursor-pointer"
                      to={`/offers/${encodeURIComponent(slug)}`}
                    >
                      {o.name}
                    </Link>
                  </td>

                  {/* RATING → RatingPill */}
                  <td className="px-4 py-3">
                    <RatingPill value={o.rating ?? 0} />
                  </td>

                  {/* LICENSE */}
                  <td className="px-4 py-3 text-[var(--text-dim)]">
                    {o.license ?? "—"}
                  </td>

                  {/* PAYOUT → PayoutPill */}
                  <td className="px-4 py-3">
                    <PayoutPill hours={o.payoutHours} />
                  </td>

                  {/* METHODS */}
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {(o.methods ?? []).length
                        ? (o.methods ?? []).map((m, i) => (
                            <span key={`${m}-${i}`} className="neon-chip">
                              {m}
                            </span>
                          ))
                        : "—"}
                    </div>
                  </td>

                  {/* ACTION */}
                  <td className="px-4 py-3">
                    <a
                      href={o.link ?? "#"}
                      className="inline-flex items-center justify-center h-9 px-3 rounded-md bg-brand-600 hover:bg-brand-700 text-white font-medium transition"
                      aria-label={`Open ${o.name}`}
                    >
                      Play
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}