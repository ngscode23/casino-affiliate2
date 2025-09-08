// src/pages/Admin/analytics/index.tsx
import { useEffect, useMemo, useState } from "react";
import Section from "@/components/common/section";
import Card from "@/components/common/card";
import { supabase } from "@/lib/supabase";

type ClickRow = {
  ts: string;
  slug: string | null;
  referrer: string | null;
  params: Record<string, any> | null;
};
type ImpressionRow = {
  ts: string;
  slug: string;
  device: string | null;
  lang: string | null;
};

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function AnalyticsIndex() {
  const [range, setRange] = useState<'7'|'30'|'90'|'custom'>('30');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [rows, setRows] = useState<ClickRow[]>([]);
  const [impr, setImpr] = useState<ImpressionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const q1 = (supabase as any).from("clicks").select("ts, slug, referrer, params");
        const q2 = (supabase as any).from("impressions").select("ts, slug, device, lang");
        if (range === 'custom' && fromDate && toDate) {
          const fromIso = new Date(fromDate + 'T00:00:00Z').toISOString();
          const toIso = new Date(toDate + 'T23:59:59Z').toISOString();
          q1.gte('ts', fromIso).lte('ts', toIso);
          q2.gte('ts', fromIso).lte('ts', toIso);
        } else {
          const days = Number(range);
          const from = new Date(Date.now() - days * 86400000).toISOString();
          q1.gte('ts', from);
          q2.gte('ts', from);
        }
        const [{ data: cdata, error: e1 }, { data: idata, error: e2 }] = await Promise.all([
          q1.order("ts", { ascending: false }).limit(5000),
          q2.order("ts", { ascending: false }).limit(5000),
        ]);
        if (e1) throw e1; if (e2) throw e2;
        if (!cancelled) { setRows((cdata as any) || []); setImpr((idata as any) || []); }
      } catch (e: any) {
        if (!cancelled) setError(String(e?.message || e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [range, fromDate, toDate]);

  const byDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      const day = fmtDate(new Date(r.ts));
      map.set(day, (map.get(day) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a,b) => a[0].localeCompare(b[0]));
  }, [rows]);

  const topSlugs = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      const k = r.slug || "-";
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a,b) => b[1]-a[1]).slice(0,10);
  }, [rows]);

  const impressionsBySlug = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of impr) {
      const k = r.slug || '-';
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return map;
  }, [impr]);

  const ctrBySlug = useMemo(() => {
    const out: Array<{ slug: string; clicks: number; impressions: number; ctr: number }> = [];
    const clicksMap = new Map<string, number>();
    for (const r of rows) {
      const k = r.slug || '-';
      clicksMap.set(k, (clicksMap.get(k) ?? 0) + 1);
    }
    const slugs = new Set<string>([...clicksMap.keys(), ...impressionsBySlug.keys()]);
    for (const s of slugs) {
      const clicks = clicksMap.get(s) ?? 0;
      const imps = impressionsBySlug.get(s) ?? 0;
      const ctr = imps > 0 ? clicks / imps : 0;
      out.push({ slug: s, clicks, impressions: imps, ctr });
    }
    return out.sort((a,b)=> b.ctr - a.ctr).slice(0, 20);
  }, [rows, impressionsBySlug]);

  const topSources = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      const p = (r.params || {}) as any;
      const src = p.utm_source || '-';
      map.set(src, (map.get(src) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a,b) => b[1]-a[1]).slice(0,10);
  }, [rows]);

  const utmReport = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      const p = (r.params || {}) as any;
      const key = `${p.utm_source || '-'} | ${p.utm_campaign || '-'}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a,b)=>b[1]-a[1]).slice(0,20);
  }, [rows]);

  function Spark({ data }: { data: Array<[string, number]> }) {
    const w = 240, h = 40, pad = 2;
    const ys = data.map(([,c])=>c);
    const max = Math.max(1, ...ys);
    const step = (w - pad*2) / Math.max(1, data.length-1);
    const d = data.map(([,c],i)=> `${i===0?'M':'L'} ${pad + i*step} ${h-pad - (c/max)*(h-pad*2)}`).join(' ');
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
        <path d={d} fill="none" stroke="currentColor" strokeOpacity={0.7} strokeWidth={2} />
      </svg>
    );
  }

  function downloadCsv() {
    const cols = ["ts","slug","referrer","utm_source","utm_medium","utm_campaign","utm_term","utm_content"];
    const lines = [cols.join(',')];
    for (const r of rows) {
      const p = (r.params || {}) as any;
      const vals = [r.ts, r.slug || '', r.referrer || '', p.utm_source||'', p.utm_medium||'', p.utm_campaign||'', p.utm_term||'', p.utm_content||'']
        .map(v=>`"${String(v).replace(/"/g,'""')}"`);
      lines.push(vals.join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `clicks_${fmtDate(new Date())}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  function exportTopSlugsJSON() {
    const data = topSlugs.map(([slug, clicks]) => ({ slug, clicks, impressions: impressionsBySlug.get(slug) ?? 0, ctr: (impressionsBySlug.get(slug) ?? 0) > 0 ? clicks/(impressionsBySlug.get(slug) ?? 1) : 0 }));
    const blob = new Blob([JSON.stringify({ range, fromDate, toDate, data }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `top_slugs_${fmtDate(new Date())}.json`; a.click(); URL.revokeObjectURL(url);
  }

  function exportTopSlugsCSV() {
    const cols = ["slug","clicks","impressions","ctr"];
    const lines = [cols.join(',')];
    for (const [slug, clicks] of topSlugs) {
      const imps = impressionsBySlug.get(slug) ?? 0;
      const ctr = imps > 0 ? clicks / imps : 0;
      lines.push([slug, String(clicks), String(imps), String(ctr.toFixed(4))].join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `top_slugs_${fmtDate(new Date())}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  function exportSourcesJSON() {
    const data = topSources.map(([source, clicks]) => ({ source, clicks }));
    const blob = new Blob([JSON.stringify({ range, fromDate, toDate, data }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `top_sources_${fmtDate(new Date())}.json`; a.click(); URL.revokeObjectURL(url);
  }

  function exportSourcesCSV() {
    const cols = ["source","clicks"];
    const lines = [cols.join(',')];
    for (const [source, clicks] of topSources) lines.push([source, String(clicks)].join(','));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `top_sources_${fmtDate(new Date())}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  function exportCTRJSON() {
    const data = ctrBySlug.map(r => ({ ...r, ctr: Number(r.ctr.toFixed(4)) }));
    const blob = new Blob([JSON.stringify({ range, fromDate, toDate, data }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `ctr_${fmtDate(new Date())}.json`; a.click(); URL.revokeObjectURL(url);
  }

  function exportCTRCSV() {
    const cols = ["slug","clicks","impressions","ctr"];
    const lines = [cols.join(',')];
    for (const r of ctrBySlug) lines.push([r.slug, String(r.clicks), String(r.impressions), String(r.ctr.toFixed(4))].join(','));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `ctr_${fmtDate(new Date())}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <Section className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Analytics</h1>
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm">Range:</label>
        <select className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/40 w-[160px]" value={range} onChange={e=>setRange(e.target.value as any)}>
          <option value="7">7 days</option>
          <option value="30">30 days</option>
          <option value="90">90 days</option>
          <option value="custom">Custom</option>
        </select>
        {range === 'custom' && (
          <>
            <input type="date" className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/40" value={fromDate} onChange={e=>setFromDate(e.target.value)} />
            <input type="date" className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/40" value={toDate} onChange={e=>setToDate(e.target.value)} />
          </>
        )}
      </div>

      {loading ? <Card className="p-4">Loading…</Card> : error ? <Card className="p-4 text-red-400">{error}</Card> : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-4">
            <h2 className="font-semibold mb-2">Clicks by day</h2>
            <Spark data={byDay} />
            <div className="text-sm grid grid-cols-2 gap-1 mt-2">
              {byDay.slice(-10).map(([d,c])=> (
                <div key={d} className="flex justify-between"><span>{d}</span><span>{c}</span></div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">Top slugs</h2>
              <div className="flex gap-2">
                <button className="rounded-xl px-3 py-2 border border-white/10 hover:bg-white/5" onClick={exportTopSlugsCSV}>Export CSV</button>
                <button className="rounded-xl px-3 py-2 border border-white/10 hover:bg-white/5" onClick={exportTopSlugsJSON}>Export JSON</button>
              </div>
            </div>
            <div className="text-sm space-y-1">
              {topSlugs.map(([k,c])=> {
                const imps = impressionsBySlug.get(k) ?? 0;
                const ctr = imps > 0 ? (c / imps) : 0;
                return (
                  <div key={k} className="flex justify-between gap-3">
                    <span className="truncate">{k}</span>
                    <span className="shrink-0 inline-flex items-center gap-2">
                      <span className="text-[var(--text-dim)]">{c}</span>
                      <span title="CTR" className="rounded px-1.5 py-0.5 text-[10px] border border-white/10 text-[var(--text-dim)]">CTR {(ctr*100).toFixed(1)}%</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="font-semibold mb-2">Slugs — daily sparkline</h2>
            <div className="space-y-3">
              {topSlugs.slice(0,6).map(([slug]) => {
                const by = new Map<string, number>();
                for (const r of rows) {
                  if ((r.slug||'-') !== slug) continue;
                  const d = fmtDate(new Date(r.ts));
                  by.set(d, (by.get(d) ?? 0) + 1);
                }
                const data = Array.from(by.entries()).sort((a,b)=>a[0].localeCompare(b[0]));
                return (
                  <div key={slug} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-[var(--text-dim)]">{slug}</span>
                    <Spark data={data} />
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">Top sources</h2>
              <div className="flex gap-2">
                <button className="rounded-xl px-3 py-2 border border-white/10 hover:bg-white/5" onClick={exportSourcesCSV}>Export CSV</button>
                <button className="rounded-xl px-3 py-2 border border-white/10 hover:bg-white/5" onClick={exportSourcesJSON}>Export JSON</button>
              </div>
            </div>
            <div className="text-sm space-y-1">
              {topSources.map(([k,c])=> (
                <div key={k} className="flex justify-between"><span>{k}</span><span>{c}</span></div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">UTM source/campaign</h2>
              <button className="rounded-xl px-3 py-2 border border-white/10 hover:bg-white/5" onClick={downloadCsv}>Export CSV</button>
            </div>
            <div className="text-sm space-y-1">
              {utmReport.map(([k,c])=> (
                <div key={k} className="flex justify-between"><span>{k}</span><span>{c}</span></div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">CTR by slug</h2>
              <div className="flex gap-2">
                <button className="rounded-xl px-3 py-2 border border-white/10 hover:bg-white/5" onClick={exportCTRCSV}>Export CSV</button>
                <button className="rounded-xl px-3 py-2 border border-white/10 hover:bg-white/5" onClick={exportCTRJSON}>Export JSON</button>
              </div>
            </div>
            <div className="text-sm space-y-1">
              {ctrBySlug.map(r => (
                <div key={r.slug} className="grid grid-cols-4 gap-2">
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
