// src/admin/api/metrics.ts
// Fake metrics with deterministic seed. TODO: Wire to Supabase RPC/views.

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    // xorshift32
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000; // 0..1
  };
}

function monthLabels(n = 12): string[] {
  const now = new Date();
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push(d.toLocaleString(undefined, { month: 'short' }));
  }
  return out;
}

export async function getSalesKpis() {
  const rnd = seeded(42);
  return {
    cash: 350000 + Math.round(rnd() * 120000),
    cashflowForecast: 12000 + Math.round(rnd() * 6000),
    goalPct: Math.round(65 + rnd() * 30),
    cards: { pending: 22, inProgress: 15, done: 8 },
    productivityPct: 50 + Math.round(rnd() * 50),
  };
}

export async function getSalesByMonth() {
  const rnd = seeded(1001);
  const labels = monthLabels(12);
  const data = labels.map((label) => ({ label, value: 6000 + Math.round(rnd() * 12000) }));
  return data;
}

export async function getExpensesByMonth() {
  const rnd = seeded(2002);
  const labels = monthLabels(12);
  const data = labels.map((label) => ({ label, value: 3000 + Math.round(rnd() * 8000) }));
  return data;
}

export async function getProfitByMonth() {
  const sales = await getSalesByMonth();
  const expenses = await getExpensesByMonth();
  return sales.map((s, i) => ({ label: s.label, value: Math.max(0, s.value - (expenses[i]?.value || 0)) }));
}

export async function getCashflow() {
  const rnd = seeded(3333);
  const labels = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  });
  return labels.map((label) => ({ label, value: 300 + Math.round(rnd() * 900) }));
}

export type BarPoint = { label: string; value: number };
export type LinePoint = { label: string; value: number };


