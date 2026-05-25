import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#1A6FD4', '#3B8FE8', '#0D4A8F', '#16A34A', '#D97706', '#E31B23', '#64748B', '#8B5CF6'];

export default function PipelineChart({ data = [] }) {
  if (!data.length) {
    return <p className="muted-text chart-empty">No pipeline data yet</p>;
  }

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 28 }}>
        <XAxis dataKey="status" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={48} />
        <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={28} />
        <Tooltip />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
    </div>
  );
}
