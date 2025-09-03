import { describe, it, expect } from 'vitest';

type Row = { slug: string; clicks: number; impressions: number; ctr: number };

function buildCTRExport(rows: Row[]) {
  const json = JSON.stringify(rows.map(r => ({ ...r, ctr: Number(r.ctr.toFixed(4)) })), null, 2);
  const csv = ['slug,clicks,impressions,ctr', ...rows.map(r => [r.slug, r.clicks, r.impressions, r.ctr.toFixed(4)].join(','))].join('\n');
  return { json, csv };
}

function filterByDate<T extends { ts: string }>(rows: T[], from?: Date, to?: Date): T[] {
  return rows.filter(r => {
    const t = new Date(r.ts).getTime();
    if (from && t < from.getTime()) return false;
    if (to && t > to.getTime()) return false;
    return true;
  });
}

describe('Exports', () => {
  it('exports CTR rows to CSV/JSON with correct formatting', () => {
    const rows: Row[] = [
      { slug: 'a', clicks: 10, impressions: 100, ctr: 0.1 },
      { slug: 'b', clicks: 5, impressions: 25, ctr: 0.2 },
    ];
    const { json, csv } = buildCTRExport(rows);
    expect(json).toContain('"slug": "a"');
    expect(json).toContain('"ctr": 0.1');
    expect(csv.split('\n')[0]).toBe('slug,clicks,impressions,ctr');
    expect(csv).toContain('a,10,100,0.1000');
    expect(csv).toContain('b,5,25,0.2000');
  });

  it('filters by date correctly', () => {
    const now = Date.now();
    const d = (off: number) => new Date(now + off*86400000).toISOString();
    const rows = [
      { ts: d(-2) },
      { ts: d(-1) },
      { ts: d(0) },
    ];
    const from = new Date(d(-1).slice(0,10) + 'T00:00:00Z');
    const to = new Date(d(-1).slice(0,10) + 'T23:59:59Z');
    const out = filterByDate(rows, from, to);
    expect(out.length).toBe(1);
    expect(out[0]?.ts.slice(0,10)).toBe(d(-1).slice(0,10));
  });
});

