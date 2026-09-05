import React from 'react';
import Shell from '../components/Shell.jsx';
import Badge from '../components/charts/Badge.jsx';

const deals = [
  { name: 'FoodSense', domain: 'Food service · MVP', score: 60, readiness: 62, risk: 'MEDIUM',
    strengths: ['Matches stated domain interest: food service'],
    watch: ['Startup stage is outside preferred (MVP vs Idea)', '2 critical roles unfilled'] },
];

export default function InvestorDealFlow() {
  return (
    <Shell persona="INVESTOR" title="Raj Capital" subtitle="Deal flow">
      <div className="mb-6">
        <h1 className="text-[26px] font-semibold text-ink-900 tracking-tight">Deal flow</h1>
        <p className="text-sm text-ink-500 mt-1">Ranked against your stated thesis, with real evidence.</p>
      </div>
      <div className="space-y-4">
        {deals.map((d) => (
          <div key={d.name} className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-[15px] font-semibold text-ink-900">{d.name}</p>
                <p className="text-[13px] text-ink-500">{d.domain}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-semibold text-violet-600">{d.score}%</span>
                <Badge label={d.risk} priority={d.risk} />
              </div>
            </div>
            <div className="space-y-1 mb-4">
              {d.strengths.map((s) => <p key={s} className="text-[13px] text-ink-700 flex gap-1.5"><span className="text-mint-500">✓</span>{s}</p>)}
              {d.watch.map((s) => <p key={s} className="text-[13px] text-amber-500 flex gap-1.5"><span>△</span>{s}</p>)}
            </div>
            <div className="flex gap-2">
              <button className="text-xs px-3 py-1.5 rounded-lg border border-surface-border text-ink-500 hover:bg-surface-muted transition-colors">Save</button>
              <button className="text-xs bg-violet-50 text-violet-700 px-3 py-1.5 rounded-lg font-medium hover:bg-violet-100 transition-colors">View startup</button>
            </div>
          </div>
        ))}
      </div>
    </Shell>
  );
}
