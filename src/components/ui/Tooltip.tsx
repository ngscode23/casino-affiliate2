///Tooltip.tsx
import { useState, useRef } from "react";

export default function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      className="relative inline-block"
    >
      {children}
      {open && (
        <div className="absolute left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap rounded-md border border-white/10 bg-[rgb(var(--bg-1)/.95)] px-2 py-1 text-xs text-[var(--text)] shadow-lg backdrop-blur">
          {label}
        </div>
      )}
    </div>
  );
}