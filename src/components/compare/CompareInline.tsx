// src/components/CompareInline.tsx
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import Button from "@/components/common/button";
import { useCompare } from "@/ctx/CompareContext";

export default function CompareInline({ className = "" }: { className?: string }) {
  const { selected, remove, clear } = useCompare();
  if (selected.length === 0) return null;

  return (
    <div className={`neon-card flex items-center justify-between gap-3 px-3 py-2 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[var(--text-dim)]">Compare:</span>
        {selected.map(o => {
          const id = o.slug ?? o.name;
          return (
            <span key={id} className="neon-chip flex items-center gap-2">
              {o.name}
              <button
                type="button"
                className="chip-close inline-flex h-5 w-5 items-center justify-center rounded-full hover:bg-transparent focus:outline-none"
                onClick={() => remove(id)}
                aria-label={`Remove ${o.name}`}
              >
                <X className="h-3.5 w-3.5 pointer-events-none" />
              </button>
            </span>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="soft" onClick={clear} className="cursor-pointer">Clear</Button>
        <Button className="cursor-pointer" onClick={() => { /* no-op */ }}>
          <Link to="/compare">Open compare</Link>
        </Button>
      </div>
    </div>
  );
}



