import React from 'react';
import Shell from '../components/Shell.jsx';
import DonutChart from '../components/charts/DonutChart.jsx';

const dims = [
  { name: 'Team', value: 33, color: '#7C5CFC' },
  { name: 'Problem', value: 90, color: '#4C86F9' },
  { name: 'Solution', value: 90, color: '#3FB081' },
  { name: 'Market', value: 100, color: '#F0A84E' },
  { name: 'Execution', value: 30, color: '#EF6E85' },
  { name: 'Technical', value: 33, color: '#C58A00' },
  { name: 'Business', value: 70, color: '#6D28D9' },
];

export default function Readiness() {
  return (
    <Shell title="FoodSense2" subtitle="Readiness">
      <div className="mb-6">
        <h1 className="text-[26px] font-semibold text-ink-900 tracking-tight">Readiness</h1>
        <p className="text-sm text-ink-500 mt-1">Based on currently available information — not a guarantee of success.</p>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7 flex flex-col items-center justify-center text-center">
          <p className="text-5xl font-bold text-violet-600">62</p>
          <p className="text-[13px] text-ink-500 mt-2">↑ from 50 last week</p>
        </div>
        <div className="col-span-2 bg-surface rounded-xl border border-surface-border shadow-card p-7">
          <p className="text-[15px] font-semibold text-ink-900 mb-4">By dimension</p>
          <DonutChart data={dims} height={200} />
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
        <p className="text-[15px] font-semibold text-ink-900 mb-4">Recommended next actions</p>
        <div className="space-y-3">
          {['Address the "Full Stack Engineer" gap (critical priority)', 'Address the "UX/UI Designer" gap (critical priority)'].map((a) => (
            <div key={a} className="flex items-center gap-3 text-[15px] text-ink-700">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />{a}
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}
