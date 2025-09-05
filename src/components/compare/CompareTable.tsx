// src/components/compare/CompareTable.tsx
import { Link } from "react-router-dom";
import { FavControl } from "@/components/FavControl";
import { useCompare } from "@/ctx/CompareContext";
import type { NormalizedOffer } from "@/lib/offers";
import { RatingPill, PayoutPill } from "@/components/compare/Pills";
import { Pill } from "@/components/ui/Pill";
import Tooltip from "@/components/ui/Tooltip";
import { useT } from "@/lib/useT";
import { appendStoredParams } from "@/lib/utm";

export type SortKey = "rating" | "payoutHours";

type Props = {
  offers: NormalizedOffer[];
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onSortChange: (key: SortKey, dir: "asc" | "desc") => void;
};

export default function CompareTable({ offers, sortKey, sortDir, onSortChange }: Props) {
  const t = useT();
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

  const nextDir = (key: SortKey): "asc" | "desc" => (sortKey === key ? (sortDir === "asc" ? "desc" : "asc") : "desc");

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
      className={["inline-flex items-center gap-1 select-none", "text-[var(--muted)] hover:text-[var(--text)]", className].join(" ")}
    >
      {children}
      {sortKey === k ? <span aria-hidden className="ml-1">{sortDir === "asc" ? "▲" : "▼"}</span> : null}
    </button>
  );

  return (
    <div className="p-0 overflow-auto max-h-[70vh]">
      <table className="w-full">
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

          <thead className="sticky top-0 z-10" style={{ background: "rgb(var(--bg-1) / .9)" }}>
            <tr>
              <th className="px-4 py-2 border-b border-white/10">{t("compare.addTo")}</th>
              <th className="px-4 py-2 border-b border-white/10">{t("nav.favorites") || "FAV"}</th>
              <th className="px-4 py-2 border-b border-white/10">{t("compare.selected") || "FIRM"}</th>
              <th className="px-4 py-2 border-b border-white/10">
                <SortHeader k="rating">{t("offer.ratingLabel").toUpperCase()}</SortHeader>
              </th>

              <th className="px-4 py-2 border-b border-white/10">
                <Tooltip label={t("offer.license")}>
                  <span className="inline-flex items-center gap-1 text-[var(--muted)] hover:text-[var(--text)]">
                    {t("offer.license").toUpperCase()} <span aria-hidden>?</span>
                  </span>
                </Tooltip>
              </th>

              <th className="px-4 py-2 border-b border-white/10">
                <SortHeader k="payoutHours">{t("offer.payout").toUpperCase()}</SortHeader>
              </th>
              <th className="px-4 py-2 border-b border-white/10">{t("filters.methods") || "METHODS"}</th>
              <th className="px-4 py-2 border-b border-white/10">{t("filters.action") || "ACTION"}</th>
            </tr>
          </thead>

          <tbody>
            {sorted.map((o) => {
              const slug = o.slug ?? o.name.toLowerCase().replace(/\s+/g, "-");
              const selected = o.slug ? isSelected(o.slug) : false;

              return (
                <tr key={slug} className="hover:bg-white/5 transition-colors h-16">
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
                          "inline-flex items-center justify-center h-9 px-3 rounded-xl transition border " +
                          (selected ? "bg-white/10 border-white/20 text-white" : "border-white/10 text-neutral-200 hover:bg-white/5")
                        }
                      >
                        {selected ? t("compare.selected") : t("compare.compareLink")}
                      </button>
                    ) : null}
                  </td>

                  {/* FAV */}
                  <td className="px-4 py-3">
                    {o.slug ? <FavControl id={o.slug} className="inline-flex h-10 w-10 items-center justify-center" /> : null}
                  </td>

                  {/* FIRM */}
                  <td className="px-4 py-3 font-semibold">
                    <Link className="hover:underline cursor-pointer block truncate" to={`/offers/${encodeURIComponent(slug)}`}>
                      {o.name}
                    </Link>
                  </td>

                  {/* RATING */}
                  <td className="px-4 py-3">
                    <Pill tone="rating">★ {typeof o.rating === "number" ? o.rating.toFixed(1) : String(o.rating ?? 0)}</Pill>
                  </td>

                  {/* LICENSE */}
                  <td className="px-4 py-3"><Pill>{o.license ?? "-"}</Pill></td>

                  {/* PAYOUT */}
                  <td className="px-4 py-3">
                    <PayoutPill hours={o.payoutHours} />
                  </td>

                  {/* METHODS */}
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {(o.methods ?? []).length
                        ? (o.methods ?? []).map((m, i) => (
                            <Pill key={`${m}-${i}`}>{m}</Pill>
                          ))
                        : "-"}
                    </div>
                  </td>

                  {/* ACTION */}
                  <td className="px-4 py-3">
                    <a
                      href={appendStoredParams(o.slug ? `/go/${encodeURIComponent(o.slug)}` : (o.link ?? "#"))}
                      className="rounded-xl px-3 py-2 font-medium bg-[color:var(--brand,#3B82F6)] text-[color:var(--brand-fg,#FFFFFF)] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50 inline-flex items-center justify-center"
                      aria-label={`${t("offer.cta")}: ${o.name}`}
                    >
                      {t("offer.cta")}
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
    </div>
  );
}
