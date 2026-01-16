export default function StatusBadge({ status }: { status: string }) {
  const s = (status || "").toLowerCase();
  const map: Record<string, string> = {
    draft: "bg-yellow-500/20 text-yellow-200 border-yellow-500/30",
    pending: "bg-yellow-500/20 text-yellow-200 border-yellow-500/30",
    processing: "bg-amber-500/20 text-amber-200 border-amber-500/30",
    published: "bg-green-500/20 text-green-200 border-green-500/30",
    active: "bg-green-500/20 text-green-200 border-green-500/30",
    paid: "bg-green-500/20 text-green-200 border-green-500/30",
    succeeded: "bg-green-500/20 text-green-200 border-green-500/30",
    captured: "bg-green-500/20 text-green-200 border-green-500/30",
    authorized: "bg-blue-500/20 text-blue-200 border-blue-500/30",
    archived: "bg-neutral-500/20 text-neutral-200 border-neutral-500/30",
    refunded: "bg-emerald-500/20 text-emerald-200 border-emerald-500/30",
    partial_refund: "bg-amber-500/20 text-amber-200 border-amber-500/30",
    requires_action: "bg-purple-500/20 text-purple-200 border-purple-500/30",
    requires_payment_method: "bg-rose-500/20 text-rose-200 border-rose-500/30",
    failed: "bg-rose-500/20 text-rose-200 border-rose-500/30",
    canceled: "bg-rose-500/20 text-rose-200 border-rose-500/30",
    cancelled: "bg-rose-500/20 text-rose-200 border-rose-500/30",
    pending_manual_review: "bg-purple-500/20 text-purple-200 border-purple-500/30",
    desync: "bg-amber-500/20 text-amber-200 border-amber-500/30",
    warning: "bg-amber-500/20 text-amber-200 border-amber-500/30",
    info: "bg-slate-500/20 text-slate-200 border-slate-500/30",
  };
  const cls = map[s] || "bg-neutral-500/20 text-neutral-200 border-neutral-500/30";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs border ${cls}`}>
      {status || "-"}
    </span>
  );
}


