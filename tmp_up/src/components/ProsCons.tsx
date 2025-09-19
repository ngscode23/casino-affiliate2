import * as React from "react";

export default function ProsCons({
  pros = [],
  cons = [],
  className = "",
}: {
  pros?: string[];
  cons?: string[];
  className?: string;
}) {
  if (!pros.length && !cons.length) return null;

  return (
    <div className={`grid gap-4 sm:grid-cols-2 ${className}`}>
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
        <div className="font-semibold text-emerald-300 mb-2">Pros</div>
        <ul className="list-disc ml-5 space-y-1 text-sm">
          {pros.map((p, i) => (
            <li key={`pro-${i}`}>{p}</li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4">
        <div className="font-semibold text-rose-300 mb-2">Cons</div>
        <ul className="list-disc ml-5 space-y-1 text-sm">
          {cons.map((c, i) => (
            <li key={`con-${i}`}>{c}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}



