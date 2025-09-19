
import Card from "@/components/common/card";

export default function RankingTable({ total, filteredCount }: { total: number; filteredCount: number }) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-[var(--text-dim)]">Items listed</div>
          <div className="text-xl font-semibold">{filteredCount} / {total}</div>
        </div>
        <div className="rounded-full border border-emerald-300/20 bg-[rgb(var(--bg-1))] px-3 py-1 text-xs text-emerald-300">
          Updated daily
        </div>
      </div>
    </Card>
  );
}




















