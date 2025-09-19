
import Card from "@/components/common/card";

export default function RankingTable({ total, filteredCount }: { total: number; filteredCount: number }) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-[var(--text-dim)]">Casinos listed</div>
          <div className="text-xl font-semibold">{filteredCount} / {total}</div>
        </div>
        <div className="neon-badge badge-green">Updated daily</div>
      </div>
    </Card>
  );
}




















