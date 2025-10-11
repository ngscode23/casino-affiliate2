import { useEffect, useMemo, useState } from "react";

type Props = {
  sourceSchema: string;
  sourceTable: string;
  sourcePk: string;
  reloadKey?: number;
};

type ReviewItem = { rating: number; title: string; body: string; created_at: string };
type Stats = { avg_rating: number; ratings_count: number } | null;

export default function ReviewList({ sourceSchema, sourceTable, sourcePk, reloadKey = 0 }: Props) {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [stats, setStats] = useState<Stats>(null);
  const [loading, setLoading] = useState(false);
  const valid = useMemo(() => Boolean(sourceSchema && sourceTable && sourcePk), [sourceSchema, sourceTable, sourcePk]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!valid) return;
      setLoading(true);
      try {
        const url = new URL("/api/reviews/list", window.location.origin);
        url.searchParams.set("source_schema", sourceSchema);
        url.searchParams.set("source_table", sourceTable);
        url.searchParams.set("source_pk", sourcePk);
        url.searchParams.set("limit", "100");
        const res = await fetch(url.toString(), { headers: { accept: "application/json" } });
        let json: unknown = {};
        try { json = await res.json(); } catch (_e) { /* handled */ void _e; }
        const j = (json as Record<string, unknown>) || {};
        if (!res.ok || j?.ok === false) throw new Error(String(j?.message || j?.code || `HTTP ${res.status}`));
        if (cancelled) return;
        const items = Array.isArray(j?.items as unknown[]) ? (j.items as ReviewItem[]) : [];
        setItems(items);
        setStats((j?.stats as Stats) ?? null);
      } catch (_e) {
        /* handled */ void _e;
        if (!cancelled) {
          setItems([]);
          setStats(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [valid, sourceSchema, sourceTable, sourcePk, reloadKey]);

  if (!valid) return null;

  return (
    <div>
      {stats ? (
        <div className="text-sm text-muted">
          Средняя оценка: <b>{Number(stats.avg_rating || 0).toFixed(1)}</b>, всего отзывов: <b>{stats.ratings_count || 0}</b>
        </div>
      ) : null}

      {loading ? (
        <div className="mt-3 text-muted">Загрузка отзывов…</div>
      ) : items.length === 0 ? (
        <div className="mt-3 text-muted">Пока нет отзывов.</div>
      ) : (
        <ul className="mt-3 space-y-3">
          {items.map((r, i) => (
            <li key={i} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-center gap-2">
                <div className="font-semibold">{r.title}</div>
                <div className="ml-auto text-xs text-muted">{new Date(r.created_at).toLocaleDateString()}</div>
              </div>
              <div className="text-sm opacity-80">Оценка: {Number(r.rating) || 0}</div>
              <div className="mt-1 text-sm">{r.body}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
