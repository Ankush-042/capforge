import React from 'react';
import Shell from '../components/Shell.jsx';
import AvatarRow from '../components/charts/AvatarRow.jsx';

const roster = [
  { initial: 'F', name: 'Founder', subtitle: 'Founder · Full-time', status: 'filled', gradientFrom: 'from-amber-500', gradientTo: 'to-rose-500' },
  { initial: 'P', name: 'Priya Data', subtitle: 'Data Scientist · Part-time', status: 'filled', gradientFrom: 'from-blue-500', gradientTo: 'to-violet-500' },
];
const openRoles = ['Full Stack Engineer', 'UX/UI Designer'];

export default function Team() {
  return (
    <Shell title="FoodSense2" subtitle="Team">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-semibold text-ink-900 tracking-tight">Team</h1>
          <p className="text-sm text-ink-500 mt-1">2 of 3 roles filled — 33% coverage</p>
        </div>
        <button className="text-sm bg-ink-900 hover:bg-ink-700 text-white px-4 py-2.5 rounded-lg shadow-card transition-colors">+ Discover talent</button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
          <p className="text-[15px] font-semibold text-ink-900 mb-4">Current team</p>
          <div className="space-y-4">
            {roster.map((m) => <AvatarRow key={m.name} {...m} trailing={<span className="text-xs px-2 py-1 rounded-md bg-mint-50 text-mint-500 font-medium">Active</span>} />)}
          </div>
        </div>
        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
          <p className="text-[15px] font-semibold text-ink-900 mb-4">Open roles</p>
          <div className="space-y-3">
            {openRoles.map((r) => (
              <div key={r} className="flex items-center justify-between py-2 border-b border-surface-border last:border-0">
                <p className="text-[15px] text-ink-900">{r}</p>
                <span className="text-xs px-2 py-1 rounded-md bg-rose-50 text-rose-500 font-medium">Open</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}
