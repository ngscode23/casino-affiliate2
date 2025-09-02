// src/pages/Admin/metrics/index.tsx
import { useEffect, useMemo, useState } from 'react';
import Section from '@/components/common/section';
import Card from '@/components/common/card';
import { supabase } from '@/lib/supabase';

type PartnerRow = { plan: string; expires_at: string | null };
type ClickRow = { ts: string; slug: string | null };
type ImprRow = { ts: string; slug: string };

type RangeKey = '7'|'30'|'90';

const PLAN_MRR: Record<string, number> = {
  BASIC: Number((import.meta.env as any).VITE_PLAN_BASIC_MRR || 0),
  FEATURED: Number((import.meta.env as any).VITE_PLAN_FEATURED_MRR || 0),
  TOP: Number((import.meta.env as any).VITE_PLAN_TOP_MRR || 0),
};

export default function MetricsIndex() {
  const [range, setRange] = useState<RangeKey>('30');
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [clicks, setClicks] = useState<ClickRow[]>([]);
  const [impr, setImpr] = useState<ImprRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);

  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        setLoading(true); setError(null);
        const days = Number(range);
        const from = new Date(Date.now() - days * 86400000).toISOString();
        const nowIso = new Date().toISOString();
        const [p, c, i] = await Promise.all([
          (supabase as any).from('partners').select('plan,expires_at').gte('created_at', from).lte('created_at', nowIso).limit(10000),
          (supabase as any).from('clicks').select('ts,slug').gte('ts', from).lte('ts', nowIso).limit(10000),
          (supabase as any).from('impressions').select('ts,slug').gte('ts', from).lte('ts', nowIso).limit(10000),
        ]);
        if (p.error) throw p.error; if (c.error) throw c.error; if (i.error) throw i.error;
        if (!canceled) { setPartners(p.data || []); setClicks(c.data || []); setImpr(i.data || []); }
      } catch (e:any) { if (!canceled) setError(String(e?.message||e)); }
      finally { if (!canceled) setLoading(false); }
    })();
    return () => { canceled = true; };
  }, [range]);

  const activeNowByPlan = useMemo(() => {
    const now = Date.now();
    const map = new Map<string, number>();
    for (const p of partners) {
      const active = p.expires_at ? new Date(p.expires_at).getTime() > now : true;
      if (active) map.set(p.plan, (map.get(p.plan) ?? 0) + 1);
    }
    return map;
  }, [partners]);

  const mrr = useMemo(() => {
    let sum = 0;
    for (const [plan, cnt] of activeNowByPlan.entries()) {
      sum += (PLAN_MRR[plan] || 0) * cnt;
    }
    return sum;
  }, [activeNowByPlan]);

  const arr = useMemo(() => mrr * 12, [mrr]);

  const ctrTop = useMemo(() => {
    const cMap = new Map<string, number>();
    for (const c of clicks) cMap.set(c.slug || '-', (cMap.get(c.slug || '-') ?? 0) + 1);
    const iMap = new Map<string, number>();
    for (const r of impr) iMap.set(r.slug, (iMap.get(r.slug) ?? 0) + 1);
    const slugs = new Set<string>([...cMap.keys(), ...iMap.keys()]);
    const rows = [...slugs].map(slug => {
      const cl = cMap.get(slug) ?? 0;
      const im = iMap.get(slug) ?? 0;
      const ctr = im > 0 ? cl / im : 0;
      return { slug, clicks: cl, impressions: im, ctr };
    }).sort((a,b)=> b.ctr - a.ctr).slice(0, 10);
    return rows;
  }, [clicks, impr]);

  const arpa = useMemo(() => {
    const totalAccounts = Array.from(activeNowByPlan.values()).reduce((a,b)=>a+b,0) || 1;
    return mrr / totalAccounts;
  }, [mrr, activeNowByPlan]);

  // Approx churn in range: partners that expired within range / active at range start
  const churn = useMemo(() => {
    const fromTs = Date.now() - Number(range) * 86400000;
    let expiredInRange = 0;
    let activeAtStart = 0;
    for (const p of partners) {
      const exp = p.expires_at ? new Date(p.expires_at).getTime() : Infinity;
      if (exp > fromTs) activeAtStart++;
      if (exp >= fromTs && exp <= Date.now()) expiredInRange++;
    }
    return activeAtStart > 0 ? expiredInRange / activeAtStart : 0;
  }, [partners, range]);

  function exportJSON() {
    const payload = { range, mrr, arr, arpa, churn, ctrTop };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `metrics_${range}.json`; a.click(); URL.revokeObjectURL(url);
  }
  function exportCSV() {
    const lines = [
      'metric,value',
      `MRR,${mrr}`,
      `ARR,${arr}`,
      `ARPA,${arpa}`,
      `churn,${churn.toFixed(4)}`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `metrics_${range}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <Section className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Metrics</h1>
        <div className="flex items-center gap-2">
          <select className="neon-input" value={range} onChange={e=>setRange(e.target.value as RangeKey)}>
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
          </select>
          <button className="neon-btn" onClick={exportCSV}>Export CSV</button>
          <button className="neon-btn" onClick={exportJSON}>Export JSON</button>
        </div>
      </div>

      {loading ? <Card className="p-4">Loading…</Card> : error ? <Card className="p-4 text-red-400">{error}</Card> : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-4"><div className="text-sm text-[var(--text-dim)]">MRR</div><div className="text-2xl font-bold">${'{'}{mrr}{'}'}</div></Card>
          <Card className="p-4"><div className="text-sm text-[var(--text-dim)]">ARR</div><div className="text-2xl font-bold">${'{'}{arr}{'}'}</div></Card>
          <Card className="p-4"><div className="text-sm text-[var(--text-dim)]">ARPA</div><div className="text-2xl font-bold">${'{'}{arpa.toFixed(2)}{'}'}</div></Card>
          <Card className="p-4"><div className="text-sm text-[var(--text-dim)]">Churn</div><div className="text-2xl font-bold">${'{'}{(churn*100).toFixed(1)}{'%'}{'}'}</div></Card>

          <Card className="p-4 md:col-span-2">
            <h2 className="font-semibold mb-2">CTR (top slugs)</h2>
            <div className="grid grid-cols-4 text-sm font-semibold text-[var(--text-dim)] mb-1">
              <div>Slug</div><div className="text-right">Clicks</div><div className="text-right">Impr</div><div className="text-right">CTR</div>
            </div>
            <div className="text-sm space-y-1">
              {ctrTop.map((r) => (
                <div key={r.slug} className="grid grid-cols-4">
                  <div className="truncate">{r.slug}</div>
                  <div className="text-right">{r.clicks}</div>
                  <div className="text-right">{r.impressions}</div>
                  <div className="text-right">{(r.ctr*100).toFixed(1)}%</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </Section>
  );
}

