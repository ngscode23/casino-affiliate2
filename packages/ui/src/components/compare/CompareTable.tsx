// src/components/compare/CompareTable.tsx
import * as React from "react";
import { Link } from "react-router-dom";
import { FavControl } from "@ui/components/FavControl";
import { useCompare } from "@shared/ctx/CompareContext";
import type { NormalizedOffer } from "@shared/lib/offers";
import { PayoutPill } from "@ui/components/compare/Pills";
import { Pill } from "@ui/components/ui/Pill";
import Tooltip from "@ui/components/ui/Tooltip";
import { useT } from "@shared/lib/useT";
import { appendStoredParams } from "@shared/lib/utm";
import LinkButton from "@ui/components/ui/LinkButton";
import { supabase } from "@shared/lib/supabase";
import { fetchAttributeRegistry, fetchProductAttributes, toValueMap } from "@shared/lib/attributes";
import type { AttributeRegistryItem } from "@casino-affiliate/types";
import CompareTableSkeleton from "@ui/components/compare/CompareTableSkeleton";

export type SortKey = "rating" | "payoutHours";

type Props = {
  offers: NormalizedOffer[];
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onSortChange: (key: SortKey, dir: "asc" | "desc") => void;
  registry?: AttributeRegistryItem[]; // optional preloaded registry to avoid duplicate fetch
};

const DEFAULT_KEYS = ["rating", "compliance_license", "payout_time_hours", "payout_methods"] as const;

export default function CompareTable({ offers, sortKey, sortDir, onSortChange, registry }: Props) {
  const t = useT();
  const { isSelected, toggle } = useCompare();
  const [labels, setLabels] = React.useState<Record<string, string>>({
    rating: t("attributes.rating.label") || t("offer.ratingLabel") || "Rating",
    compliance_license: t("attributes.compliance_license.label") || t("offer.license") || "License",
    payout_time_hours: t("attributes.payout_time_hours.label") || t("offer.payout") || "Payout (h)",
    payout_methods: t("attributes.payout_methods.label") || t("filters.methods") || "Methods",
  });
  const [overlay, setOverlay] = React.useState<Record<string, { rating?: number; license?: string; hours?: number; methods?: string[] }>>({});
  const [loading, setLoading] = React.useState<boolean>(true);
  const [metaCache, setMetaCache] = React.useState<AttributeRegistryItem[] | null>(registry ?? null);
  const KEYS = React.useMemo(() => {
    const reg = metaCache;
    if (!reg) return DEFAULT_KEYS as readonly string[];
    const setComparable = new Set(reg.filter(r => r.comparable).map(r => r.key));
    // keep stable visual order
    return (DEFAULT_KEYS as readonly string[]).filter(k => setComparable.has(k));
  }, [metaCache]);

  const slugList = React.useMemo(() => offers.map((o) => o.slug).filter(Boolean) as string[], [offers]);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const slugs = slugList;
        const { data: idRows, error: idErr } = await (supabase as any)
          .from("offers")
          .select("id,slug")
          .in("slug", slugs);
        if (idErr) throw idErr;
        const slugToId: Record<string, number> = {};
        for (const r of (idRows as any[] || [])) slugToId[String(r.slug)] = Number(r.id);
        const ids = Object.values(slugToId);
        const rows = ids.length ? await fetchProductAttributes(ids as any, KEYS as unknown as string[]) : [];
        const map = toValueMap(rows);
        const bySlug: Record<string, { rating?: number; license?: string; hours?: number; methods?: string[] }> = {};
        for (const o of offers) {
          const pid = slugToId[o.slug || ""];
          const vm = pid != null ? map[String(pid)] : undefined;
          if (!vm) continue;
          const rating = vm["rating"] != null ? Number(vm["rating"]) : undefined;
          const licRaw = vm["compliance_license"];
          const license = licRaw != null ? String(licRaw).toUpperCase() : undefined;
          const hours = vm["payout_time_hours"] != null ? Number(vm["payout_time_hours"]) : undefined;
          const methods = Array.isArray(vm["payout_methods"]) ? (vm["payout_methods"] as any[]).map(String) : undefined;
          bySlug[o.slug!] = { rating, license, hours, methods };
        }
        try {
          const regNow = metaCache ?? (await fetchAttributeRegistry());
          if (!metaCache) setMetaCache(regNow);
          const meta: Record<string, AttributeRegistryItem> = Object.fromEntries(regNow.map((m) => [m.key, m] as const));
          if (active) {
            setLabels((prev) => {
              const next = { ...prev };
              for (const k of KEYS) {
                const lk = meta[k as string]?.label_key;
                if (lk) {
                  const val = t(lk);
                  if (val && !val.includes(".")) next[k] = val;
                }
              }
              return next;
            });
          }
        } catch {
          void 0;
        }
        if (active) setOverlay(bySlug);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [slugList, KEYS, offers, metaCache, t]);

  // Show skeleton only when there are no offers to render yet.
  // Otherwise, render the table immediately and hydrate overlay/labels asynchronously.
  if (loading && offers.length === 0) {
    return <CompareTableSkeleton rows={6} />;
  }

  const sorted = [...offers].sort((a, b) => {
    if (sortKey === "rating") {
      const av = overlay[a.slug!]?.rating ?? a.rating ?? 0;
      const bv = overlay[b.slug!]?.rating ?? b.rating ?? 0;
      return sortDir === "asc" ? av - bv : bv - av;
    }
    const av = overlay[a.slug!]?.hours ?? a.payoutHours ?? Number.POSITIVE_INFINITY;
    const bv = overlay[b.slug!]?.hours ?? b.payoutHours ?? Number.POSITIVE_INFINITY;
    return sortDir === "asc" ? av - bv : bv - av;
  });

  // Overlay EAV values for display while preserving legacy values as fallback only for rating
  const view: NormalizedOffer[] = sorted.map((o) => {
    const ov = overlay[o.slug!];
    return {
      ...o,
      rating: typeof ov?.rating === 'number' && Number.isFinite(ov.rating) ? (ov.rating as number) : o.rating,
      license: ov?.license as any,
      payoutHours: typeof ov?.hours === 'number' && Number.isFinite(ov.hours as number) ? (ov.hours as number) : undefined,
      methods: Array.isArray(ov?.methods) ? (ov!.methods as string[]) : [],
    } as NormalizedOffer;
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
      className={[
        "inline-flex items-center gap-1 select-none rounded-md",
        "text-[var(--muted)] hover:text-[var(--text)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40",
        className,
      ].join(" ")}
    >
      {children}
      {sortKey === k ? <span aria-hidden className="ml-1">{sortDir === "asc" ? "▲" : "▼"}</span> : null}
    </button>
  );

  return (
    <div className="p-0 overflow-auto max-h-[70vh]">
      <table className="w-full">
          <colgroup>
            <col className="w-[140px]" />
            <col className="w-[80px]" />
            <col className="w-[260px]" />
            <col className="w-[140px]" />
            <col className="w-[140px]" />
            <col className="w-[160px]" />
            <col />
            <col className="w-[140px]" />
          </colgroup>

          <thead className="sticky top-0 z-10 bg-[color:rgb(var(--bg-1)/0.9)]">
            <tr>
              <th className="px-4 py-3 border-b border-white/10">{t("compare.addTo")}</th>
              <th className="px-4 py-3 border-b border-white/10">{t("nav.favorites") || "FAV"}</th>
              <th className="px-4 py-3 border-b border-white/10">{t("compare.selected") || "FIRM"}</th>
              <th
                className="px-4 py-3 border-b border-white/10"
                aria-sort={sortKey === "rating" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
              >
                <SortHeader k="rating">{(labels.rating || t("offer.ratingLabel")).toUpperCase()}</SortHeader>
              </th>

              <th className="px-4 py-3 border-b border-white/10">
                <Tooltip label={labels.compliance_license || t("offer.license")}>
                  <span className="inline-flex items-center gap-1 text-[var(--muted)] hover:text-[var(--text)]">
                    {(labels.compliance_license || t("offer.license")).toUpperCase()} <span aria-hidden>?</span>
                  </span>
                </Tooltip>
              </th>

              <th
                className="px-4 py-3 border-b border-white/10"
                aria-sort={sortKey === "payoutHours" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
              >
                <SortHeader k="payoutHours">{(labels.payout_time_hours || t("offer.payout")).toUpperCase()}</SortHeader>
              </th>
              <th className="px-4 py-3 border-b border-white/10">{labels.payout_methods || t("filters.methods") || "METHODS"}</th>
              <th className="px-4 py-3 border-b border-white/10">{t("filters.action") || "ACTION"}</th>
            </tr>
          </thead>

          <tbody>
            {view.map((o) => {
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
                          "inline-flex items-center justify-center h-9 px-3 rounded-xl transition border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40 " +
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
                    <Pill tone="rating" aria-label={`Rating ${typeof o.rating === "number" ? o.rating.toFixed(1) : String(o.rating ?? 0)} out of 5`}>
                      ★ {typeof o.rating === "number" ? o.rating.toFixed(1) : String(o.rating ?? 0)}
                    </Pill>
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
                      {(o.methods ?? []).length ? (
                        (() => {
                          const arr = o.methods ?? [];
                          const max = 3;
                          const shown = arr.slice(0, max);
                          const rest = arr.length - shown.length;
                          return (
                            <>
                              {shown.map((m, i) => (
                                <Pill key={`${m}-${i}`}>{m}</Pill>
                              ))}
                              {rest > 0 ? <Pill>{`+${rest}`}</Pill> : null}
                            </>
                          );
                        })()
                      ) : (
                        "-"
                      )}
                    </div>
                  </td>

                  {/* ACTION */}
                  <td className="px-4 py-3">
                    <LinkButton
                      href={appendStoredParams(o.slug ? `/go/${encodeURIComponent(o.slug)}` : (o.link ?? "#"))}
                      className="px-3 py-2"
                      aria-label={`${t("offer.cta")}: ${o.name}`}
                    >
                      {t("offer.cta")}
                    </LinkButton>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
    </div>
  );
}


