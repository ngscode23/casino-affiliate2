//src/components/compare/CompareTableSkeleton.tsx
import Skeleton from "@/components/common/skeleton";

export default function CompareTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="neon-card p-0 overflow-hidden">
      <table className="neon-table w-full">
        <thead className="sticky top-0 bg-[rgb(var(--bg-1)/.9)] backdrop-blur z-10">
          <tr>
            {["COMPARE","FAV","FIRM","RATING","LICENSE","PAYOUT","METHODS","ACTION"].map(h => (
              <th key={h} className="px-4 py-2 text-left text-[12px] uppercase text-[var(--muted)]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className="hover:bg-white/5 transition-colors">
              {[140,80,260,140,140,160,240,140].map((w, j) => (
                <td key={j} className="px-4 py-3">
                  <Skeleton className="h-5" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}