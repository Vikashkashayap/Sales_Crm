import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function TrendChart({ data = [] }) {
  if (!data.length) {
    return <p className="muted-text chart-empty">No trend data yet</p>;
  }

  const formatted = data.map((d) => ({
    date: d._id,
    created: d.created,
    converted: d.converted,
  }));

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height="100%">
      <LineChart data={formatted} margin={{ top: 4, right: 12, left: -8, bottom: 4 }}>
        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={28} />
        <Tooltip />
        <Legend iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
        <Line type="monotone" dataKey="created" stroke="#1A6FD4" strokeWidth={2} name="Created" dot={false} />
        <Line type="monotone" dataKey="converted" stroke="#16A34A" strokeWidth={2} name="Converted" dot={false} />
      </LineChart>
    </ResponsiveContainer>
    </div>
  );
}
