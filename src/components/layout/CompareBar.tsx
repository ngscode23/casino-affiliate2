// src/components/layout/CompareBar.tsx
import { useMemo, useEffect, useRef, useState } from "react";
import Button from "@/components/common/button";

import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/common/sheet";

import { X } from "lucide-react";
import { useCompare } from "@/ctx/CompareContext";
import Rating from "@/components/common/rating";
import { useT } from "@/lib/useT";

type OfferLike = {
  name: string;
  slug?: string;
  rating?: number;
  license?: string;
  payout?: string;
  payoutHours?: number;
  methods?: string[];
  payments?: string[];
  link?: string | null;
};

function toOfferLike(x: unknown): OfferLike {
  const o = x as Record<string, unknown>;
  return {
    name: String(o.name ?? "Unknown"),
    slug: typeof o.slug === "string" ? o.slug : undefined,
    rating: typeof o.rating === "number" ? o.rating : 0,
    license: typeof o.license === "string" ? o.license : "-",
    payout: typeof o.payout === "string" ? o.payout : "-",
    payoutHours: typeof o.payoutHours === "number" ? o.payoutHours : undefined,
    methods: Array.isArray(o.methods) ? (o.methods as string[]) : undefined,
    payments: Array.isArray(o.payments) ? (o.payments as string[]) : undefined,
    link: typeof o.link === "string" ? o.link : null,
  };
}

export default function CompareBar() {
  const t = useT();
  const { selected, clear, remove } = useCompare();
  const canCompare = selected.length >= 2;
  const barRef = useRef<HTMLDivElement | null>(null);
  const [spacerH, setSpacerH] = useState<number>(0);
  const [open, setOpen] = useState(false);

  const rows = useMemo(
    () =>
      [
        { k: "Rating", render: (o: OfferLike) => <Rating value={o.rating ?? 0} /> },
        { k: "License", render: (o: OfferLike) => o.license ?? "-" },
        {
          k: "Payout",
          render: (o: OfferLike) => `${o.payout ?? "-"}${o.payoutHours ? ` (~${o.payoutHours}h)` : ""}`,
        },
        {
          k: "Methods",
          render: (o: OfferLike) => (o.methods ?? o.payments ?? []).join(", ") || "-",
        },
      ] as Array<{ k: string; render: (o: OfferLike) => React.ReactNode }>,
    []
  );

  // Measure the bar height when visible and reserve space to avoid overlap
  useEffect(() => {
    if (open || !barRef.current || typeof ResizeObserver === "undefined") {
      setSpacerH(0);
      return;
    }
    const el = barRef.current;
    const ro = new ResizeObserver(() => {
      const h = el.offsetHeight || 0;
      setSpacerH(h + 20); // include bottom gap
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, selected.length]);

  // Nothing selected and panel is closed — render nothing
  if (!selected.length && !open) return null;

  return (
    <div data-compare-root>
      <Sheet open={open} onOpenChange={setOpen}>
        {/* Spacer for the fixed bar. Hidden while panel is open. */}
        {!open && <div aria-hidden style={{ height: spacerH }} />}

        {/* Fixed compare bar (hidden while panel open) */}
        {!open && selected.length > 0 && (
          <div className="fixed inset-x-0 bottom-4 z-[30] pointer-events-none" role="region" aria-label="Comparison bar">
            <div
              className="pointer-events-auto mx-auto max-w-5xl rounded-2xl border border-white/10 bg-[var(--bg-1)]/95 backdrop-blur p-3 shadow-[0_8px_30px_rgba(0,0,0,.4)]"
              style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
              ref={barRef}
            >
              <div className="flex items-center gap-2">
                <div className="text-sm text-[var(--text-dim)]">{t("compare.selectedFor") || "Compare:"}</div>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    const max = typeof window !== "undefined" && window.innerWidth < 640 ? 3 : 6;
                    const show = selected.slice(0, max);
                    const rest = selected.length - show.length;
                    return (
                      <>
                        {show.map((raw) => {
                          const o = toOfferLike(raw);
                          const id = o.slug ?? o.name;
                          return (
                            <span key={id} className="neon-chip inline-flex items-center gap-2">
                              {o.name}
                              <button
                                type="button"
                                className="opacity-70 hover:opacity-100 focus:outline-none focus:ring-0 focus:ring-offset-0"
                                onClick={() => remove(id)}
                                aria-label={`Remove ${o.name}`}
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </span>
                          );
                        })}
                        {rest > 0 && <span className="neon-chip">+{rest}</span>}
                      </>
                    );
                  })()}
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      try {
                        const slugs = selected
                          .map((s) => toOfferLike(s).slug || toOfferLike(s).name)
                          .filter(Boolean);
                        const base = typeof window !== "undefined" ? window.location.origin : "";
                        const share = `${base}/compare?set=${encodeURIComponent(slugs.join(","))}`;
                        navigator.clipboard?.writeText(share);
                      } catch { /* noop */ }
                    }}
                  >
                    {t("compare.share") || "Copy link"}
                  </Button>
                  <Button variant="ghost" onClick={clear}>{t("compare.clear") || "Clear"}</Button>
                  <SheetTrigger asChild>
                    <Button disabled={!canCompare}>{t("compare.open") || "Open compare"}</Button>
                  </SheetTrigger>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom panel with detailed comparison */}
        <SheetContent side="bottom" className="max-h-[80vh] overflow-auto rounded-t-2xl bg-[var(--bg-0)] text-[var(--text)]">
          <SheetHeader className="sr-only">
            <SheetTitle>Compare panel</SheetTitle>
            <SheetDescription>Manage your selected casinos for comparison.</SheetDescription>
          </SheetHeader>

          <div className="px-4 pt-4 text-lg font-semibold">{t("compare.title") || "Compare offers"}</div>

          <div className="mt-4 overflow-x-auto">
            <table className="neon-table w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left px-3 py-2">{t("compare.field") || "Field"}</th>
                  {selected.map((raw) => {
                    const o = toOfferLike(raw);
                    return (
                      <th key={o.slug ?? o.name} className="text-left px-3 py-2">
                        {o.name}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.k}>
                    <td className="px-3 py-2 text-[var(--text-dim)]">{row.k}</td>
                    {selected.map((raw) => {
                      const o = toOfferLike(raw);
                      return (
                        <td key={(o.slug ?? o.name) + row.k} className="px-3 py-2">
                          {row.render(o)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex flex-col gap-2 px-4 pb-4 md:hidden">
            <SheetClose asChild>
              <Button variant="soft" onClick={clear} aria-label="Clear and close">Clear</Button>
            </SheetClose>
            <SheetClose asChild>
              <Button variant="secondary" aria-label="Close compare panel">Close</Button>
            </SheetClose>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
