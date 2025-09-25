import { describe, it, expect } from 'vitest';

type Click = { ts: string; slug: string };
type Impression = { ts: string; slug: string };

function computeCTR(clicks: Click[], impressions: Impression[], from?: Date, to?: Date) {
  const inRange = (ts: string) => {
    const t = new Date(ts).getTime();
    if (from && t < from.getTime()) return false;
    if (to && t > to.getTime()) return false;
    return true;
  };
  const cMap = new Map<string, number>();
  for (const c of clicks) if (inRange(c.ts)) cMap.set(c.slug, (cMap.get(c.slug) ?? 0) + 1);
  const iMap = new Map<string, number>();
  for (const i of impressions) if (inRange(i.ts)) iMap.set(i.slug, (iMap.get(i.slug) ?? 0) + 1);
  const slugs = new Set<string>([...cMap.keys(), ...iMap.keys()]);
  return [...slugs].map(slug => {
    const clicksCount = cMap.get(slug) ?? 0;
    const imprCount = iMap.get(slug) ?? 0;
    const ctr = imprCount > 0 ? clicksCount / imprCount : 0;
    return { slug, clicks: clicksCount, impressions: imprCount, ctr };
  }).sort((a,b)=> b.ctr - a.ctr);
}

describe('CTR calculation', () => {
  const now = Date.now();
  const d = (offsetDays: number) => new Date(now + offsetDays*86400000).toISOString();
  const clicks: Click[] = [
    { ts: d(-1), slug: 'a' },
    { ts: d(-1), slug: 'a' },
    { ts: d(-1), slug: 'b' },
    { ts: d(-2), slug: 'b' },
    { ts: d(-2), slug: 'c' },
  ];
  const imps: Impression[] = [
    { ts: d(-1), slug: 'a' },
    { ts: d(-1), slug: 'a' },
    { ts: d(-1), slug: 'a' },
    { ts: d(-1), slug: 'b' },
    { ts: d(-2), slug: 'b' },
    { ts: d(-2), slug: 'c' },
    { ts: d(-2), slug: 'c' },
  ];

  it('computes CTR per slug and sorts by CTR', () => {
    const out = computeCTR(clicks, imps);
    const map = new Map(out.map(r=>[r.slug,r]));
    expect(map.get('a')).toEqual({ slug:'a', clicks:2, impressions:3, ctr: 2/3 });
    expect(map.get('b')).toEqual({ slug:'b', clicks:2, impressions:2, ctr: 1 });
    expect(map.get('c')).toEqual({ slug:'c', clicks:1, impressions:2, ctr: 0.5 });
    expect(out[0]?.slug).toBe('b');
  });

  it('respects date filters', () => {
    const from = new Date(d(-1).slice(0,10) + 'T00:00:00Z');
    const to = new Date(d(-1).slice(0,10) + 'T23:59:59Z');
    const out = computeCTR(clicks, imps, from, to);
    const map = new Map(out.map(r=>[r.slug,r]));
    expect(map.get('a')).toEqual({ slug:'a', clicks:2, impressions:3, ctr: 2/3 });
    expect(map.get('b')).toEqual({ slug:'b', clicks:1, impressions:1, ctr: 1 });
    expect(map.get('c')).toBeUndefined();
  });
});


