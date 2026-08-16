import React from 'react';
import Shell from '../components/Shell.jsx';
import Badge from '../components/charts/Badge.jsx';

const risks = [
  { category: 'TEAM', severity: 'HIGH', title: '2 critical roles unfilled', description: 'Full Stack Engineer, UX/UI Designer have no meaningful coverage.', action: 'Prioritize finding a contributor for: Full Stack Engineer.' },
  { category: 'MARKET', severity: 'MEDIUM', title: 'Positioning requires validation', description: 'Pricing model and menu-variation handling remain unclear.', action: 'Clarify these points before pursuing contributors or investors.' },
];

export default function RiskPage() {
  return (
    <Shell title="FoodSense2" subtitle="Risk overview">
      <div className="mb-6">
        <h1 className="text-[26px] font-semibold text-ink-900 tracking-tight">Risk overview</h1>
        <p className="text-sm text-ink-500 mt-1">Medium overall risk</p>
      </div>
      <div className="space-y-4">
        {risks.map((r, i) => (
          <div key={r.title} className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-ink-300 text-sm">{String(i + 1).padStart(2, '0')}</span>
                <p className="text-[15px] font-semibold text-ink-900">{r.title}</p>
              </div>
              <Badge label={`${r.category} · ${r.severity}`} priority={r.severity} />
            </div>
            <p className="text-[15px] text-ink-700 mb-3 pl-8">{r.description}</p>
            <p className="text-[13px] text-violet-600 pl-8">→ {r.action}</p>
          </div>
        ))}
      </div>
    </Shell>
  );
}
