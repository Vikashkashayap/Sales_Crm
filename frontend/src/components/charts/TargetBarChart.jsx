import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';

const COLORS = ['#1A6FD4', '#16A34A'];

function clampPct(pct) {
  if (!Number.isFinite(pct)) return 0;
  return Math.max(0, Math.min(100, pct));
}

function defaultValueLabel(v) {
  return v == null ? '' : String(v);
}

export default function TargetBarChart({
  admissions = 0,
  admissionsTarget = 0,
  revenue = 0,
  revenueTarget = 0,
  revenueLabel = defaultValueLabel,
  height = 180,
}) {
  const admissionsPct =
    admissionsTarget > 0 ? clampPct((Number(admissions) / Number(admissionsTarget)) * 100) : 0;
  const revenuePct =
    revenueTarget > 0 ? clampPct((Number(revenue) / Number(revenueTarget)) * 100) : 0;

  const data = [
    {
      metric: 'Admissions',
      pct: admissionsPct,
      current: Number(admissions) || 0,
      target: Number(admissionsTarget) || 0,
      kind: 'count',
    },
    {
      metric: 'Revenue',
      pct: revenuePct,
      current: Number(revenue) || 0,
      target: Number(revenueTarget) || 0,
      kind: 'money',
    },
  ];

  return (
    <div className="chart-container" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 10, right: 16, left: 10, bottom: 6 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.35} />
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
          <YAxis type="category" dataKey="metric" tick={{ fontSize: 11 }} width={82} />
          <Tooltip
            formatter={(value, _name, props) => {
              const row = props?.payload;
              if (!row) return [`${value}%`, 'Achieved'];
              const currentLabel =
                row.kind === 'money' ? revenueLabel(row.current) : String(row.current);
              const targetLabel =
                row.kind === 'money' ? revenueLabel(row.target) : String(row.target);
              return [`${Math.round(row.pct)}% (${currentLabel} / ${targetLabel})`, 'Achieved'];
            }}
          />
          <Bar dataKey="pct" radius={[6, 6, 6, 6]} maxBarSize={28} isAnimationActive={false}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

