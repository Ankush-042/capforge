import React from 'react';
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip, Cell, LabelList } from 'recharts';

const PRIORITY_COLOR = { CRITICAL: '#E15C4D', HIGH: '#F0A84E', MEDIUM: '#E0C64B', LOW: '#3FB081' };

/**
 * Real fix for a confirmed problem: an open (0% coverage) role rendered
 * as a literal zero-height bar, which reads as "blank/broken" rather
 * than "actively being sought" — exactly the complaint for an early
 * venture with a small team, where most roles are legitimately open.
 * Open roles now render as a distinct dashed "seeking" ghost-bar with
 * a real label, never invisible empty space.
 */
function GapBar(props) {
  const { x, y, width, height, fill, payload } = props;
  const isOpen = payload.coverage === 0;

  if (isOpen) {
    const ghostHeight = 34; // fixed, deliberate height — never invisible
    const ghostY = y + height - ghostHeight;
    return (
      <g>
        <rect x={x} y={ghostY} width={width} height={ghostHeight} rx={8} fill="none" stroke={fill} strokeWidth={2} strokeDasharray="4 4" />
      </g>
    );
  }
  return <rect x={x} y={y} width={width} height={height} rx={8} fill={fill} />;
}

export default function GapBarChart({ gaps, height = 230 }) {
  const data = gaps.map(g => ({
    role: g.role,
    coverage: g.coverage * 100,
    label: g.coverage === 0 ? 'Seeking' : `${Math.round(g.coverage * 100)}%`,
    fill: PRIORITY_COLOR[g.priority_level] || PRIORITY_COLOR.LOW
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 24, right: 8, left: 8, bottom: 0 }}>
        <XAxis dataKey="role" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6E7079' }} />
        <Tooltip cursor={{ fill: '#FAFAFB' }} contentStyle={{ borderRadius: 10, border: '1px solid #EDEDF1', fontSize: 12 }}
          formatter={(value, name, props) => [props.payload.label, 'Coverage']} />
        <Bar dataKey="coverage" barSize={48} shape={GapBar}>
          {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
          <LabelList dataKey="label" position="top" style={{ fontSize: 11, fontWeight: 600, fill: '#3E4047' }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
