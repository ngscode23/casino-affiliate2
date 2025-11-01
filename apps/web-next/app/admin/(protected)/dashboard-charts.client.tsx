"use client";

import type { CSSProperties } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, LineChart, Line, PieChart, Pie, Cell } from "recharts";

import type { BarPoint, LinePoint } from "@/lib/admin/metrics";

const tooltipStyle: CSSProperties = {
  background: "rgba(12,16,22,0.96)",
  border: "1px solid rgba(255,255,255,.12)",
  color: "rgb(var(--text))",
};

export function BarsChart({ data }: { data: BarPoint[] }) {
  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
          <XAxis dataKey="label" hide tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ ...tooltipStyle, fontSize: 12 }}
            itemStyle={{ color: "rgb(var(--text))" }}
            labelStyle={{ color: "rgb(var(--text))", fontWeight: 600 }}
            cursor={{ fill: "rgba(255,255,255,0.05)" }}
          />
          <Bar dataKey="value" fill="var(--accent,#60a5fa)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function LineMiniChart({ data }: { data: LinePoint[] }) {
  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
          <XAxis dataKey="label" hide />
          <Tooltip
            contentStyle={{ ...tooltipStyle, fontSize: 12 }}
            itemStyle={{ color: "rgb(var(--text))" }}
            labelStyle={{ color: "rgb(var(--text))", fontWeight: 600 }}
            cursor={{ stroke: "rgba(255,255,255,0.2)" }}
          />
          <Line type="monotone" dataKey="value" stroke="currentColor" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GoalPieChart({ value }: { value: number }) {
  return (
    <div className="h-[140px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            dataKey="value"
            data={[
              { name: "Done", value },
              { name: "Remain", value: Math.max(0, 100 - value) },
            ]}
            innerRadius={40}
            outerRadius={60}
            startAngle={90}
            endAngle={-270}
            stroke="none"
          >
            <Cell fill="var(--accent,#60a5fa)" />
            <Cell fill="rgba(255,255,255,0.08)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
