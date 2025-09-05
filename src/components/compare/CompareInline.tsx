// src/components/CompareInline.tsx
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { ButtonGhost, ButtonPrimary } from "@/components/ui/Buttons";
import { Pill } from "@/components/ui/Pill";
import IconButton from "@/components/ui/IconButton";
import { useCompare } from "@/ctx/CompareContext";

export default function CompareInline({ className = "" }: { className?: string }) {
  const { selected, remove, clear } = useCompare();
  if (selected.length === 0) return null;

  return (
    <div className={`rounded-2xl bg-[color:var(--surface-elev,#141720)] border border-white/5 shadow-[0_6px_24px_rgba(0,0,0,0.35)] px-3 py-2 flex items-center justify-between gap-3 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[var(--text-dim)]">Compare:</span>
        {selected.map(o => {
          const id = o.slug ?? o.name;
          return (
            <Pill key={id}>
              {o.name}
              <IconButton size="sm" onClick={() => remove(id)} aria-label={`Remove ${o.name}`}>
                <X className="h-3.5 w-3.5 pointer-events-none" />
              </IconButton>
            </Pill>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <ButtonGhost onClick={clear} className="cursor-pointer">Clear</ButtonGhost>
        <Link
          to="/compare"
          className="h-10 px-4 inline-flex items-center justify-center rounded-xl font-medium bg-[color:var(--brand,#3B82F6)] text-[color:var(--brand-fg,#FFFFFF)] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50"
        >
          Open compare
        </Link>
      </div>
    </div>
  );
}



