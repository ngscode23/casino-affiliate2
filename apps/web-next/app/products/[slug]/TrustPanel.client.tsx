"use client";

import { LifeBuoy, RotateCcw, ShieldCheck } from "lucide-react";

type TrustPanelProps = {
  isAdmin: boolean;
  clicks: number;
  impressions: number;
};

const TRUST_POINTS = [
  { title: "14 дней на возврат", icon: RotateCcw },
  { title: "Поддержка 24/7", icon: LifeBuoy },
  { title: "Гарантия подлинности", icon: ShieldCheck },
];

export default function TrustPanel({ isAdmin, clicks, impressions }: TrustPanelProps) {
  return (
    <div className="space-y-3 rounded-3xl border border-border/40 bg-card/70 p-6">
      <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-muted">Мы заботимся о вас</h3>
      <ul className="space-y-3">
        {TRUST_POINTS.map(({ title, icon: Icon }) => (
          <li key={title} className="flex items-center gap-3 text-sm text-fg/90">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <span>{title}</span>
          </li>
        ))}
      </ul>
      {isAdmin ? (
        <div className="rounded-2xl border border-dashed border-border/50 bg-card/80 px-4 py-3 text-xs text-muted-foreground">
          <div>
            Clicks: <span className="font-semibold text-fg">{clicks}</span>
          </div>
          <div>
            Impressions: <span className="font-semibold text-fg">{impressions}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
