import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#1A6FD4', '#3B8FE8', '#16A34A', '#D97706', '#E31B23', '#0D4A8F', '#64748B', '#8B5CF6'];

const renderLegend = (props) => {
  const { payload } = props;
  if (!payload?.length) return null;
  return (
    <ul className="chart-legend-list">
      {payload.map((entry) => (
        <li key={entry.value} className="chart-legend-item">
          <span className="chart-legend-dot" style={{ background: entry.color }} />
          <span className="chart-legend-label">{entry.value}</span>
          <span className="chart-legend-value">{entry.payload?.value ?? ''}</span>
        </li>
      ))}
    </ul>
  );
};

export default function SourceChart({ data = [] }) {
  const chartData = data.map((d) => ({ name: d.source, value: d.count }));
  if (!chartData.length) {
    return <p className="muted-text chart-empty">No source data yet</p>;
  }

  return (
    <div className="chart-container chart-container-pie">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="42%"
            innerRadius={42}
            outerRadius={68}
            paddingAngle={2}
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend
            content={renderLegend}
            verticalAlign="bottom"
            wrapperStyle={{ paddingTop: 8 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
