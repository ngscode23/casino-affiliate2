// src/components/layout/CompareBar.tsx
import { useMemo, useEffect, useRef, useState } from "react";
import { ButtonGhost, ButtonPrimary } from "@ui/components/ui/Buttons";
import { Pill } from "@ui/components/ui/Pill";
import IconButton from "@ui/components/ui/IconButton";
import { toast } from "@ui/components/common/toast";

import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@ui/components/common/sheet";

import { X } from "lucide-react";
import { useCompare } from "@shared/ctx/CompareContext";
import Rating from "@ui/components/common/rating";
import { useT } from "@shared/lib/useT";

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
  const spacerHeightClass = `h-bar-${Math.max(0, Math.min(512, Math.round(spacerH)))}`;

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
        {!open && <div aria-hidden className={spacerHeightClass} />}

        {/* Fixed compare bar (hidden while panel open) */}
        {!open && selected.length > 0 && (
          <div className="fixed inset-x-0 bottom-4 z-[30] pointer-events-none" role="region" aria-label="Comparison bar">
            <div
              className="pointer-events-auto surface mx-auto max-w-5xl rounded-2xl border border-border/40 px-4 py-3 pb-safe shadow-soft md:px-5"
              ref={barRef}
            >
              <div className="flex items-center gap-2">
                <div className="text-sm text-muted">
                  {(t("compare.selectedFor") || "Compare") + ` (${selected.length})`}
                </div>
                {selected.length === 1 ? (
                  <div className="text-xs text-muted" data-testid="compare-hint">
                    {t("compare.hintAddOneMore") || "Add one more to open compare"}
                  </div>
                ) : null}
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
                            <Pill key={id}>
                              {o.name}
                              <IconButton size="sm" onClick={() => remove(id)} aria-label={`Remove ${o.name}`}>
                                <X className="h-3.5 w-3.5" />
                              </IconButton>
                            </Pill>
                          );
                        })}
                        {rest > 0 && <Pill>+{rest}</Pill>}
                      </>
                    );
                  })()}
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <ButtonGhost
                    onClick={() => {
                      try {
                        const slugs = selected
                          .map((s) => toOfferLike(s).slug || toOfferLike(s).name)
                          .filter(Boolean);
                        const base = typeof window !== "undefined" ? window.location.origin : "";
                        const share = `${base}/compare?set=${encodeURIComponent(slugs.join(","))}`;
                        if (navigator.clipboard?.writeText) {
                          navigator.clipboard.writeText(share);
                          toast("Link copied", { variant: "success" });
                        } else {
                          // Fallback
                          prompt("Copy link:", share);
                        }
                      } catch {
                        try {
                          const slugs = selected
                            .map((s) => toOfferLike(s).slug || toOfferLike(s).name)
                            .filter(Boolean);
                          const base = typeof window !== "undefined" ? window.location.origin : "";
                          const share = `${base}/compare?set=${encodeURIComponent(slugs.join(","))}`;
                          prompt("Copy link:", share);
                        } catch {
                          toast("Failed to copy", { variant: "error" });
                        }
                      }
                    }}
                  >
                    {t("compare.share") || "Copy link"}
                  </ButtonGhost>
                  <ButtonGhost onClick={clear}>{t("compare.clear") || "Clear"}</ButtonGhost>
                  <SheetTrigger asChild>
                    <ButtonPrimary data-testid="compare-open-btn" disabled={!canCompare}>{t("compare.open") || "Open compare"}</ButtonPrimary>
                  </SheetTrigger>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom panel with detailed comparison */}
        <SheetContent side="bottom" className="surface max-h-[80vh] overflow-auto rounded-t-2xl border border-border/40 bg-card text-fg shadow-soft">
          <SheetHeader className="sr-only">
            <SheetTitle>Compare panel</SheetTitle>
            <SheetDescription>Manage your selected casinos for comparison.</SheetDescription>
          </SheetHeader>

          <div className="px-4 pt-4 text-lg font-semibold">{t("compare.title") || "Compare offers"}</div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left px-3 py-2 border-b border-border/40">{t("compare.field") || "Field"}</th>
                  {selected.map((raw) => {
                    const o = toOfferLike(raw);
                    return (
                      <th key={o.slug ?? o.name} className="text-left px-3 py-2 border-b border-border/40">
                        {o.name}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.k}>
                    <td className="px-3 py-2 text-muted">{row.k}</td>
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
              <ButtonGhost onClick={clear} aria-label="Clear and close">Clear</ButtonGhost>
            </SheetClose>
            <SheetClose asChild>
              <ButtonGhost aria-label="Close compare panel">Close</ButtonGhost>
            </SheetClose>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}


