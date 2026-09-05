import React from 'react';
import Shell from '../components/Shell.jsx';
import StatCard, { STAT_PALETTE } from '../components/charts/StatCard.jsx';
import Badge from '../components/charts/Badge.jsx';

const deals = [
  { name: 'FoodSense', domain: 'Food service · MVP', score: 60, readiness: 62, risk: 'MEDIUM' },
];

export default function InvestorDashboard() {
  return (
    <Shell persona="INVESTOR" title="Raj Capital" subtitle="Early-stage food-tech thesis">
      <div className="mb-6">
        <p className="text-xs text-ink-500 mb-1">Good evening, Raj</p>
        <h1 className="text-[26px] font-semibold text-ink-900 tracking-tight">Which ventures deserve your attention</h1>
      </div>

      <div className="grid grid-cols-4 gap-5 mb-7">
        <StatCard label="Deal flow" value="1" sub="Matching your thesis" icon="◈" {...STAT_PALETTE.lavender} />
        <StatCard label="Avg. thesis fit" value="60%" sub="Across recommendations" icon="◎" {...STAT_PALETTE.blue} />
        <StatCard label="Saved" value="0" sub="Watching" icon="◐" {...STAT_PALETTE.peach} />
        <StatCard label="Connections" value="1" sub="Pending" icon="◍" {...STAT_PALETTE.cream} />
      </div>

      <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
        <p className="text-[15px] font-semibold text-ink-900 mb-4">Top match</p>
        {deals.map((d) => (
          <div key={d.name} className="flex items-center justify-between py-3">
            <div>
              <p className="text-[15px] font-medium text-ink-900">{d.name}</p>
              <p className="text-[13px] text-ink-500">{d.domain} · readiness {d.readiness}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge label={`Risk: ${d.risk}`} priority={d.risk} />
              <span className="text-sm font-medium text-violet-600">{d.score}%</span>
            </div>
          </div>
        ))}
      </div>
    </Shell>
  );
}
