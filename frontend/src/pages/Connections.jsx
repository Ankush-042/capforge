import React from 'react';
import Shell from '../components/Shell.jsx';
import AvatarRow from '../components/charts/AvatarRow.jsx';

const connections = [
  { name: 'FoodSense2', subtitle: 'Full Stack Engineer request', status: 'PENDING' },
  { name: 'FinGuard', subtitle: 'You expressed interest', status: 'ACCEPTED' },
];

const STATUS_STYLE = { PENDING: 'bg-amber-50 text-amber-500', ACCEPTED: 'bg-mint-50 text-mint-500', REJECTED: 'bg-rose-50 text-rose-500' };

export default function Connections({ persona = 'CONTRIBUTOR' }) {
  return (
    <Shell persona={persona} title="Connections" subtitle="Sent and received">
      <div className="mb-6">
        <h1 className="text-[26px] font-semibold text-ink-900 tracking-tight">Connections</h1>
      </div>
      <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
        {connections.map((c) => (
          <div key={c.name} className="flex items-center justify-between py-4 border-b border-surface-border last:border-0">
            <AvatarRow initial={c.name[0]} name={c.name} subtitle={c.subtitle} />
            <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${STATUS_STYLE[c.status]}`}>{c.status}</span>
          </div>
        ))}
      </div>
    </Shell>
  );
}
