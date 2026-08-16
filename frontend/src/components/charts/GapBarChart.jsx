import React from 'react';
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip, Cell } from 'recharts';

const PRIORITY_COLOR = { CRITICAL: '#E15C4D', HIGH: '#F0A84E', MEDIUM: '#E0C64B', LOW: '#3FB081' };

/**
 * Reusable bar chart for role/gap coverage — color-coded by priority level,
 * driven by real gap data (role, coverage, priority_level) once wired.
 */
export default function GapBarChart({ gaps, height = 230 }) {
  const data = gaps.map(g => ({ role: g.role, coverage: g.coverage, fill: PRIORITY_COLOR[g.priority_level] || PRIORITY_COLOR.LOW }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <XAxis dataKey="role" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6E7079' }} />
        <Tooltip cursor={{ fill: '#FAFAFB' }} contentStyle={{ borderRadius: 10, border: '1px solid #EDEDF1', fontSize: 12 }} />
        <Bar dataKey="coverage" radius={[8, 8, 0, 0]} barSize={48}>
          {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
