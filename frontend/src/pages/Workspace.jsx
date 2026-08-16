import React from 'react';
import Shell from '../components/Shell.jsx';
import AvatarRow from '../components/charts/AvatarRow.jsx';

const tasks = [
  { title: 'Set up analytics pipeline', assignee: 'Priya Data', status: 'IN_PROGRESS' },
  { title: 'Draft MVP wireframes', assignee: 'Unassigned', status: 'TODO' },
];
const discussions = [
  { author: 'Founder', content: "Let's finalize the weather API integration approach this week.", time: '2h ago' },
];

export default function Workspace() {
  return (
    <Shell title="FoodSense2" subtitle="Workspace">
      <div className="mb-6">
        <h1 className="text-[26px] font-semibold text-ink-900 tracking-tight">Workspace</h1>
        <p className="text-sm text-ink-500 mt-1">Team-only</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-surface rounded-xl border border-surface-border shadow-card p-7">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[15px] font-semibold text-ink-900">Tasks</p>
            <button className="text-xs bg-violet-50 text-violet-700 px-3 py-1.5 rounded-lg font-medium hover:bg-violet-100 transition-colors">+ New task</button>
          </div>
          {tasks.map((t) => (
            <div key={t.title} className="flex items-center justify-between py-3 border-b border-surface-border last:border-0">
              <div>
                <p className="text-[15px] text-ink-900">{t.title}</p>
                <p className="text-[13px] text-ink-500">{t.assignee}</p>
              </div>
              <span className="text-xs px-2 py-1 rounded-md bg-blue-50 text-blue-500 font-medium">{t.status.replace('_', ' ')}</span>
            </div>
          ))}
        </div>

        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
          <p className="text-[15px] font-semibold text-ink-900 mb-4">Discussion</p>
          {discussions.map((d, i) => (
            <div key={i} className="mb-3">
              <AvatarRow initial={d.author[0]} name={d.author} subtitle={d.time} />
              <p className="text-[13px] text-ink-700 pl-12 mt-1">{d.content}</p>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}
