import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const DEFAULT_COLORS = ['#7C5CFC', '#4C86F9', '#3FB081', '#F0A84E', '#EF6E85'];

/**
 * Reusable donut chart — used for readiness dimension breakdowns,
 * skill-demand distributions, or any labeled proportion set.
 */
export default function DonutChart({ data, height = 230, colors = DEFAULT_COLORS }) {
  const withColors = data.map((d, i) => ({ ...d, color: d.color || colors[i % colors.length] }));
  return (
    <>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={withColors} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={3}>
            {withColors.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #EDEDF1', fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-1.5 mt-2">
        {withColors.map((d) => (
          <div key={d.name} className="flex items-center justify-between text-[13px]">
            <span className="flex items-center gap-1.5 text-ink-500">
              <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
              {d.name}
            </span>
            <span className="text-ink-900 font-medium">{d.value}%</span>
          </div>
        ))}
      </div>
    </>
  );
}
