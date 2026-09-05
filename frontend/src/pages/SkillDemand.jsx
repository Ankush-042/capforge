import React from 'react';
import Shell from '../components/Shell.jsx';

const skills = [
  { name: 'Machine Learning', demand: 'HIGH', have: true },
  { name: 'B2B Sales', demand: 'HIGH', have: false },
  { name: 'React', demand: 'HIGH', have: false },
  { name: 'Healthcare Operations', demand: 'MEDIUM', have: false },
  { name: 'DevOps', demand: 'MEDIUM', have: false },
];

const DEMAND_COLOR = { HIGH: 'text-signal-critical', MEDIUM: 'text-signal-medium', LOW: 'text-signal-low' };

export default function SkillDemand() {
  return (
    <Shell persona="CONTRIBUTOR" title="Priya Data" subtitle="Skill demand">
      <div className="mb-6">
        <h1 className="text-[26px] font-semibold text-ink-900 tracking-tight">Skills in demand</h1>
        <p className="text-sm text-ink-500 mt-1">Aggregated from real, currently-open startup gaps across the platform.</p>
      </div>
      <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
        {skills.map((s) => (
          <div key={s.name} className="flex items-center justify-between py-3 border-b border-surface-border last:border-0">
            <div className="flex items-center gap-3">
              <p className="text-[15px] text-ink-900">{s.name}</p>
              {s.have && <span className="text-xs px-2 py-0.5 rounded-md bg-mint-50 text-mint-500 font-medium">You have this</span>}
            </div>
            <span className={`text-xs font-medium ${DEMAND_COLOR[s.demand]}`}>{s.demand}</span>
          </div>
        ))}
      </div>
      <div className="bg-violet-50 rounded-xl p-6 mt-6">
        <p className="text-[15px] text-violet-700 leading-relaxed">B2B sales capability appears frequently among high-priority startup gaps, while your profile currently shows limited evidence in this area.</p>
      </div>
    </Shell>
  );
}
