import type { ReactNode } from "react";

export function Tagline({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={"inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/60 px-4 py-1 text-xs font-semibold uppercase tracking-[0.32em] text-muted " + className}
    >
      {children}
    </span>
  );
}

export default Tagline;
