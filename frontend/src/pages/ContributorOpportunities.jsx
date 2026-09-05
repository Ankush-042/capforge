import React from 'react';
import Shell from '../components/Shell.jsx';

const opportunities = [
  { name: 'FoodSense2', domain: 'Food service', stage: 'Idea', score: 92, role: 'Full Stack Engineer', reasons: ['Skill match: mobile app development, backend', 'Prefers early-stage startups'] },
  { name: 'FinGuard', domain: 'FinTech', stage: 'MVP', score: 74, role: 'Backend Engineer', reasons: ['Partial skill overlap', 'Domain preference not stated'] },
];

export default function ContributorOpportunities() {
  return (
    <Shell persona="CONTRIBUTOR" title="Priya Data" subtitle="Opportunities">
      <div className="mb-6">
        <h1 className="text-[26px] font-semibold text-ink-900 tracking-tight">Opportunities</h1>
        <p className="text-sm text-ink-500 mt-1">Ranked by real fit — not a generic search list.</p>
      </div>
      <div className="space-y-4">
        {opportunities.map((o) => (
          <div key={o.name} className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[15px] font-semibold text-ink-900">{o.name}</p>
                <p className="text-[13px] text-ink-500">{o.domain} · {o.stage} · needs {o.role}</p>
              </div>
              <span className="text-lg font-semibold text-violet-600">{o.score}%</span>
            </div>
            <div className="space-y-1 mb-4">
              {o.reasons.map((r) => <p key={r} className="text-[13px] text-ink-700 flex gap-1.5"><span className="text-mint-500">✓</span>{r}</p>)}
            </div>
            <div className="flex gap-2">
              <button className="text-xs px-3 py-1.5 rounded-lg border border-surface-border text-ink-500 hover:bg-surface-muted transition-colors">Save</button>
              <button className="text-xs bg-violet-50 text-violet-700 px-3 py-1.5 rounded-lg font-medium hover:bg-violet-100 transition-colors">Express interest</button>
            </div>
          </div>
        ))}
      </div>
    </Shell>
  );
}
