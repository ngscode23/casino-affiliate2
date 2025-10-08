export default function StatusBadge({ status }: { status: string }) {
  const s = (status || '').toLowerCase();
  const map: Record<string, string> = {
    draft: 'bg-yellow-500/20 text-yellow-200 border-yellow-500/30',
    published: 'bg-green-500/20 text-green-200 border-green-500/30',
    archived: 'bg-neutral-500/20 text-neutral-200 border-neutral-500/30',
  };
  const cls = map[s] || 'bg-neutral-500/20 text-neutral-200 border-neutral-500/30';
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs border ${cls}`}>{status || '-'}</span>;
}


