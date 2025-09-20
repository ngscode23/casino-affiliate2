import { useEffect, useState } from "react";
import Section from "@ui/components/common/section";
import Card from "@ui/components/common/card";
import Input from "@ui/components/common/input";
import Button from "@ui/components/common/button";
import { supabase } from "@shared/lib/supabase";

type Row = { id: string; type: string; created_at: string; payload: any };

export default function WebhooksPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 50;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true); setError(null);
        const from = page * pageSize;
        const to = from + pageSize - 1;
        let qb = (supabase as any).from('webhook_logs').select('id,type,created_at,payload').order('created_at', { ascending: false });
        if (q.trim()) qb = qb.ilike('type', `%${q.trim()}%`);
        const { data, error } = await qb.range(from, to);
        if (error) throw error;
        if (!cancelled) setRows((data as any) ?? []);
      } catch (e:any) { if (!cancelled) setError(String(e?.message||e)); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true };
  }, [q, page]);

  const purge = async () => {
    try {
      const cutoff = new Date(Date.now() - 30*86400000).toISOString();
      const { error } = await (supabase as any).rpc('purge_webhook_logs', { cutoff_ts: cutoff });
      if (error) throw error;
      setPage(0);
      // refetch
      const { data } = await (supabase as any)
        .from('webhook_logs').select('id,type,created_at,payload').order('created_at', { ascending: false }).range(0, pageSize-1);
      setRows((data as any) ?? []);
    } catch (e:any) {
      alert('Purge failed: ' + String(e?.message||e));
    }
  };

  return (
    <Section className="p-6 space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-3">
          <h1 className="text-xl font-semibold">Webhook Logs</h1>
          <div className="ml-auto flex items-center gap-2">
            <Input className="w-[220px] h-9" placeholder="Filter by type" value={q} onChange={e=>{ setPage(0); setQ(e.target.value) }} />
            <Button variant="soft" className="h-9 min-h-0 px-3 text-sm" onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0}>Prev</Button>
            <span className="text-sm">Page {page+1}</span>
            <Button variant="soft" className="h-9 min-h-0 px-3 text-sm" onClick={()=>setPage(p=>p+1)}>Next</Button>
            <Button variant="soft" className="h-9 min-h-0 px-3 text-sm" onClick={purge} title="Delete logs older than 30d">Purge &gt;30d</Button>
          </div>
        </div>
        {loading ? <div>Loading…</div> : error ? <div className="text-red-400">{error}</div> : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.id} className="rounded border border-white/10 p-3">
                <div className="flex justify-between text-sm">
                  <span className="font-mono">{r.type}</span>
                  <span className="text-[var(--text-dim)]">{r.created_at}</span>
                </div>
                <details className="mt-1">
                  <summary className="cursor-pointer text-[var(--text-dim)]">payload</summary>
                  <pre className="overflow-auto text-xs whitespace-pre-wrap">{JSON.stringify(r.payload, null, 2)}</pre>
                </details>
              </div>
            ))}
            {rows.length === 0 && <div className="text-sm text-[var(--text-dim)]">No rows.</div>}
          </div>
        )}
      </Card>
    </Section>
  );
}

