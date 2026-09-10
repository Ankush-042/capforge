import React from 'react';
import { RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';

const PRIORITY_COLOR = { CRITICAL: '#E15C4D', HIGH: '#2563EB', MEDIUM: '#E0C64B', LOW: '#3FB081' };
const PRIORITY_BG = { CRITICAL: '#FDEEF0', HIGH: '#EAF1FE', MEDIUM: '#FFF9E8', LOW: '#EAF7F0' };

/**
 * Real replacement for the bar-chart-with-ghost-boxes treatment,
 * confirmed directly to look broken/unfinished (huge dead space above
 * a few dashed outline boxes). Uses the SAME radial-gauge visual
 * language already approved elsewhere on the Dashboard (readiness
 * gauge, team-coverage mini gauge) — consistent, not a one-off style,
 * and a card grid naturally sizes to content instead of leaving a
 * fixed-height void.
 */
function RoleRing({ coverage, color }) {
  const pct = Math.round(coverage * 100);
  return (
    <div className="relative w-16 h-16 shrink-0">
      <RadialBarChart width={64} height={64} innerRadius="72%" outerRadius="100%" barSize={7}
        data={[{ value: Math.max(pct, 2), fill: color }]} startAngle={90} endAngle={-270}>
        <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
        <RadialBar background={{ fill: '#F1EEFE' }} dataKey="value" cornerRadius={5} />
      </RadialBarChart>
      <div className="absolute inset-0 flex items-center justify-center text-[12px] font-bold" style={{ color }}>{pct}%</div>
    </div>
  );
}

export default function RoleCoverageGrid({ gaps }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {gaps.map((g) => {
        const color = PRIORITY_COLOR[g.priority_level] || PRIORITY_COLOR.LOW;
        const bg = PRIORITY_BG[g.priority_level] || PRIORITY_BG.LOW;
        return (
          // These were tinted rectangles sitting inside a white card sitting on
          // a tinted page: three stacked surfaces, which is why the whole
          // section read as flat. They are real cards now, on the canvas
          // directly, with the priority carried by a left edge rather than by
          // washing the entire tile in colour.
          <div
            key={g.id}
            className="group relative flex items-center gap-3.5 rounded-xl bg-surface border border-surface-border shadow-card p-4 pl-5 overflow-hidden hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-200"
          >
            <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: g.coverage === 0 ? color : '#3FB081' }} />
            <RoleRing coverage={g.coverage} color={color} />
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-ink-950 truncate">{g.role}</p>
              <p className="text-[12px] font-medium mt-0.5" style={{ color: g.coverage === 0 ? color : '#3FB081' }}>
                {g.coverage === 0 ? 'Seeking' : 'Covered'}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
