import React from 'react';
import { Link } from 'react-router-dom';
import Shell from '../components/Shell.jsx';
import Badge from '../components/charts/Badge.jsx';

const gaps = [
  { id: '1', role: 'Full Stack Engineer', priority: 'CRITICAL', coverage: 0, reason: 'No current team member covers the "Full Stack Engineer" role.' },
  { id: '2', role: 'UX/UI Designer', priority: 'CRITICAL', coverage: 0, reason: 'No current team member covers the "UX/UI Designer" role.' },
  { id: '3', role: 'Data Scientist', priority: 'LOW', coverage: 100, reason: 'Covered — a current team member holds the "Data Scientist" role.' },
];

function GapRow({ gap }) {
  return (
    <Link to={`/gaps/${gap.id}`} className="flex items-center justify-between py-4 px-1 border-b border-surface-border last:border-0 hover:bg-surface-muted/50 -mx-1 rounded-lg transition-colors">
      <div className="min-w-0">
        <p className="text-[15px] font-medium text-ink-900">{gap.role}</p>
        <p className="text-[13px] text-ink-500 mt-0.5 max-w-md truncate">{gap.reason}</p>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <div className="w-24">
          <div className="h-1.5 bg-surface-muted rounded-full overflow-hidden">
            <div className="h-full bg-violet-500 rounded-full" style={{ width: `${gap.coverage}%` }} />
          </div>
          <p className="text-[11px] text-ink-300 mt-1">{gap.coverage}% covered</p>
        </div>
        <Badge label={gap.priority} priority={gap.priority} />
      </div>
    </Link>
  );
}

export default function GapDashboard() {
  return (
    <Shell title="FoodSense2" subtitle="Gap diagnosis">
      <div className="mb-6">
        <h1 className="text-[26px] font-semibold text-ink-900 tracking-tight">Gap diagnosis</h1>
        <p className="text-sm text-ink-500 mt-1">What this venture needs, ranked by priority.</p>
      </div>
      <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
        {gaps.map((g) => <GapRow key={g.id} gap={g} />)}
      </div>
    </Shell>
  );
}
