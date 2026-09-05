import React from 'react';
import { useParams } from 'react-router-dom';
import Shell from '../components/Shell.jsx';
import DonutChart from '../components/charts/DonutChart.jsx';
import Badge from '../components/charts/Badge.jsx';

/**
 * Startup Detail — the screen that closes a real gap in the discovery
 * flow: a contributor or investor finds a startup via search, clicks in,
 * and sees its real profile, readiness, gaps, and positioning. Per App
 * Flow §6.4 (investor startup detail) and the general discovery flow —
 * this didn't exist before; Search results had nowhere to link to.
 */

const readinessDims = [
  { name: 'Team', value: 33, color: '#7C5CFC' },
  { name: 'Problem', value: 90, color: '#4C86F9' },
  { name: 'Solution', value: 90, color: '#3FB081' },
  { name: 'Market', value: 100, color: '#F0A84E' },
];

export default function StartupDetail() {
  const { id } = useParams();

  return (
    <Shell title="Startup profile" subtitle={`#${id}`}>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-[26px] font-semibold text-ink-900 tracking-tight">FoodSense2</h1>
          <p className="text-sm text-ink-500 mt-1">Food service · Idea stage · Discoverable</p>
        </div>
        <button className="text-sm bg-violet-50 text-violet-700 px-4 py-2.5 rounded-lg font-medium hover:bg-violet-100 transition-colors">Connect</button>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
            <p className="text-[15px] font-semibold text-ink-900 mb-2">Problem</p>
            <p className="text-[15px] text-ink-700 leading-relaxed mb-5">Food waste due to inaccurate inventory management in small restaurants.</p>
            <p className="text-[15px] font-semibold text-ink-900 mb-2">Solution</p>
            <p className="text-[15px] text-ink-700 leading-relaxed">An app that predicts daily food demand using past sales and weather data.</p>
          </div>

          <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
            <p className="text-[15px] font-semibold text-ink-900 mb-4">Open capability gaps</p>
            <div className="space-y-3">
              {[['Full Stack Engineer', 'CRITICAL'], ['UX/UI Designer', 'CRITICAL'], ['Data Scientist', 'LOW']].map(([role, priority]) => (
                <div key={role} className="flex items-center justify-between">
                  <span className="text-[15px] text-ink-900">{role}</span>
                  <Badge label={priority} priority={priority} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7 text-center">
            <p className="text-[13px] font-medium text-ink-500 mb-2">Readiness</p>
            <p className="text-4xl font-bold text-violet-600">62</p>
          </div>
          <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
            <p className="text-[13px] font-medium text-ink-500 mb-3">By dimension</p>
            <DonutChart data={readinessDims} height={160} />
          </div>
        </div>
      </div>
    </Shell>
  );
}
