import React from 'react';
import Shell from '../components/Shell.jsx';
import StatCard, { STAT_PALETTE } from '../components/charts/StatCard.jsx';

const recommended = [
  { name: 'FoodSense2', domain: 'Food service · Idea', score: 92, gap: 'Full Stack Engineer' },
  { name: 'FinGuard', domain: 'FinTech · MVP', score: 74, gap: 'Backend Engineer' },
];

export default function ContributorDashboard() {
  return (
    <Shell persona="CONTRIBUTOR" title="Priya Data" subtitle="Data Scientist">
      <div className="mb-6">
        <p className="text-xs text-ink-500 mb-1">Good evening, Priya</p>
        <h1 className="text-[26px] font-semibold text-ink-900 tracking-tight">Where your skills create the most value</h1>
      </div>

      <div className="grid grid-cols-4 gap-5 mb-7">
        <StatCard label="Recommended" value="2" sub="New startups match you" icon="◈" {...STAT_PALETTE.lavender} />
        <StatCard label="Profile strength" value="80%" sub="Add skills to improve" icon="◎" {...STAT_PALETTE.blue} />
        <StatCard label="Pending" value="1" sub="Awaiting your response" icon="◐" {...STAT_PALETTE.peach} />
        <StatCard label="Active" value="1" sub="Startup you've joined" icon="◍" {...STAT_PALETTE.cream} />
      </div>

      <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
        <p className="text-[15px] font-semibold text-ink-900 mb-4">Recommended for you</p>
        {recommended.map((r) => (
          <div key={r.name} className="flex items-center justify-between py-4 border-b border-surface-border last:border-0">
            <div>
              <p className="text-[15px] font-medium text-ink-900">{r.name}</p>
              <p className="text-[13px] text-ink-500">{r.domain} · needs {r.gap}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-violet-600">{r.score}%</span>
              <button className="text-xs bg-violet-50 text-violet-700 px-3 py-1.5 rounded-lg font-medium hover:bg-violet-100 transition-colors">View</button>
            </div>
          </div>
        ))}
      </div>
    </Shell>
  );
}
