import { useEffect, useState } from "react";
import Section from "@ui/components/common/section";
import Card from "@ui/components/common/card";
import Skeleton from "@ui/components/common/skeleton";
//import { motion } from "framer-motion";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import {
  getSalesKpis,
  getSalesByMonth,
  getExpensesByMonth,
  getProfitByMonth,
  getCashflow,
  type BarPoint,
  type LinePoint,
} from "@admin/api/metrics";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-sm text-[var(--text-dim)]">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

function toCurrency(n: number) {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n); }
  catch { return String(n); }
}

function Bars({ data }: { data: BarPoint[] }) {
  const tooltipStyle = { background: 'rgba(12,16,22,0.96)', border: '1px solid rgba(255,255,255,.12)', color: 'rgb(var(--text))' } as React.CSSProperties;
  return (
    <div className="h-[160px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
          <XAxis dataKey="label" hide tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ ...tooltipStyle, fontSize: 12 }}
            itemStyle={{ color: 'rgb(var(--text))' }}
            labelStyle={{ color: 'rgb(var(--text))', fontWeight: 600 }}
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
          />
          <Bar dataKey="value" fill="var(--accent,#60a5fa)" radius={[4,4,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function LineMini({ data }: { data: LinePoint[] }) {
  const tooltipStyle = { background: 'rgba(12,16,22,0.96)', border: '1px solid rgba(255,255,255,.12)', color: 'rgb(var(--text))' } as React.CSSProperties;
  return (
    <div className="h-[160px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
          <XAxis dataKey="label" hide />
          <Tooltip
            contentStyle={{ ...tooltipStyle, fontSize: 12 }}
            itemStyle={{ color: 'rgb(var(--text))' }}
            labelStyle={{ color: 'rgb(var(--text))', fontWeight: 600 }}
            cursor={{ stroke: 'rgba(255,255,255,0.2)' }}
          />
          <Line type="monotone" dataKey="value" stroke="currentColor" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<any | null>(null);
  const [sales, setSales] = useState<BarPoint[]>([]);
  const [expenses, setExpenses] = useState<BarPoint[]>([]);
  const [profit, setProfit] = useState<BarPoint[]>([]);
  const [cashflow, setCashflow] = useState<LinePoint[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [k, s, e, p, c] = await Promise.all([
          getSalesKpis(), getSalesByMonth(), getExpensesByMonth(), getProfitByMonth(), getCashflow()
        ]);
        if (!cancelled) {
          setKpis(k); setSales(s); setExpenses(e); setProfit(p); setCashflow(c);
        }
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading || !kpis) {
    return (
      <Section className="p-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <Card key={i} className="p-4"><Skeleton className="h-6 w-1/2" /><Skeleton className="h-10 w-1/3 mt-3" /><Skeleton className="h-24 w-full mt-4" /></Card>
        ))}
      </Section>
    );
  }

  return (
    <Section className="p-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="p-4"><Stat label="Cash" value={toCurrency(kpis.cash)} /></Card>
        <Card className="p-4">
          <div className="text-sm text-[var(--text-dim)] mb-1">Sales Goal</div>
          <div className="grid grid-cols-2 gap-2 items-center">
            <div className="h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie dataKey="value" data={[{name:'Done', value:kpis.goalPct},{name:'Remain', value:100-kpis.goalPct}]}
                       innerRadius={40} outerRadius={60} startAngle={90} endAngle={-270} stroke="none">
                    <Cell fill="var(--accent,#60a5fa)" />
                    <Cell fill="rgba(255,255,255,0.08)" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="text-right">
              <div className="text-2xl font-semibold">{kpis.goalPct}%</div>
              <div className="text-xs text-[var(--text-dim)] mt-1">
                <span className="inline-flex items-center gap-1 mr-2"><span className="h-2 w-2 rounded-full bg-[var(--accent,#60a5fa)]" />Done</span>
                <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-white/20"/>Remain</span>
              </div>
            </div>
          </div>
        </Card>
        <Card className="p-4"><Stat label="Cashflow forecast" value={toCurrency(kpis.cashflowForecast)} /></Card>

        <Card className="p-4"><div className="text-sm text-[var(--text-dim)] mb-2">Sales (12m)</div><Bars data={sales} /></Card>
        <Card className="p-4"><div className="text-sm text-[var(--text-dim)] mb-2">Expenses (12m)</div><Bars data={expenses} /></Card>
        <Card className="p-4"><div className="text-sm text-[var(--text-dim)] mb-2">Profit (12m)</div><Bars data={profit} /></Card>

        <Card className="p-4">
          <div className="text-sm text-[var(--text-dim)]">Cards evolution</div>
          <div className="grid grid-cols-3 gap-2 mt-2">
            <Stat label="Pending" value={String(kpis.cards.pending)} />
            <Stat label="In Progress" value={String(kpis.cards.inProgress)} />
            <Stat label="Done" value={String(kpis.cards.done)} />
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-[var(--text-dim)]">Productivity (7d)</div>
          <div className="mt-2"><LineMini data={cashflow} /></div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-[var(--text-dim)] mb-2">To-do</div>
          <ul className="text-sm space-y-1 list-disc pl-5">
            <li>Review supplier invoices</li>
            <li>Approve two product listings</li>
            <li>Check weekly ad spend</li>
            <li>Follow up with vendor</li>
          </ul>
        </Card>
      </div>
    </Section>
  );
}


