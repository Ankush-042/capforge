import React from 'react';
import Shell from '../components/Shell.jsx';

const milestones = [
  { title: 'Conduct Market Research', description: 'Validate the problem and solution with potential restaurant customers.', status: 'SUGGESTED' },
  { title: 'Define MVP Requirements', description: 'Determine core features: data integration, prediction algorithm, UI.', status: 'SUGGESTED' },
  { title: 'Hire Full Stack Engineer and UX/UI Designer', description: 'Fill open positions to assemble a team capable of building the MVP.', status: 'SUGGESTED' },
  { title: 'Develop a Functional Prototype', description: 'Test the prediction algorithm, UX, and technical feasibility.', status: 'SUGGESTED' },
];

export default function Milestones() {
  return (
    <Shell title="FoodSense2" subtitle="Milestones">
      <div className="mb-6">
        <h1 className="text-[26px] font-semibold text-ink-900 tracking-tight">Milestones</h1>
        <p className="text-sm text-ink-500 mt-1">AI-suggested — edit, accept, or reject any of these.</p>
      </div>
      <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
        {milestones.map((m, i) => (
          <div key={m.title} className="flex gap-4 py-4 border-b border-surface-border last:border-0">
            <div className="w-7 h-7 rounded-full bg-violet-50 text-violet-600 text-sm font-medium flex items-center justify-center shrink-0">{i + 1}</div>
            <div className="flex-1">
              <p className="text-[15px] font-medium text-ink-900">{m.title}</p>
              <p className="text-[13px] text-ink-500 mt-0.5">{m.description}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button className="text-xs px-3 py-1.5 rounded-lg border border-surface-border text-ink-500 hover:bg-surface-muted transition-colors">Edit</button>
              <button className="text-xs px-3 py-1.5 rounded-lg bg-violet-50 text-violet-700 font-medium hover:bg-violet-100 transition-colors">Accept</button>
            </div>
          </div>
        ))}
      </div>
    </Shell>
  );
}
