import React from 'react';
import Shell from '../components/Shell.jsx';
import StatCard, { STAT_PALETTE } from '../components/charts/StatCard.jsx';
import GapBarChart from '../components/charts/GapBarChart.jsx';
import DonutChart from '../components/charts/DonutChart.jsx';
import AvatarRow from '../components/charts/AvatarRow.jsx';
import Badge from '../components/charts/Badge.jsx';

/**
 * Founder Dashboard — Sprint 18: refactored to use the shared chart
 * component library (StatCard, GapBarChart, DonutChart, AvatarRow, Badge)
 * instead of one-off inline implementations. This is also the proof that
 * the shared components actually work before Sprint 19 builds 15 more
 * screens on top of them.
 */

const gaps = [
  { role: 'Full Stack', coverage: 0, priority_level: 'CRITICAL' },
  { role: 'UX/UI', coverage: 0, priority_level: 'CRITICAL' },
  { role: 'Data Sci.', coverage: 100, priority_level: 'LOW' },
];

const readinessData = [
  { name: 'Team', value: 33, color: '#7C5CFC' },
  { name: 'Problem', value: 90, color: '#4C86F9' },
  { name: 'Solution', value: 90, color: '#3FB081' },
  { name: 'Market', value: 100, color: '#F0A84E' },
];

export default function FounderDashboard() {
  return (
    <Shell title="FoodSense2" subtitle="AI-powered demand forecasting" activeNav="Dashboard">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs text-ink-500 mb-1">Good evening, Founder</p>
          <h1 className="text-[26px] font-semibold text-ink-900 tracking-tight">FoodSense2</h1>
        </div>
        <button className="text-sm bg-ink-900 hover:bg-ink-700 text-white px-4 py-2.5 rounded-lg shadow-card transition-colors">
          + Discover talent
        </button>
      </div>

      <div className="grid grid-cols-4 gap-5 mb-7">
        <StatCard label="Readiness" value="62" sub="↑ from 50 last week" icon="◒" {...STAT_PALETTE.lavender} />
        <StatCard label="Team coverage" value="33%" sub="1 of 3 roles filled" icon="◎" {...STAT_PALETTE.blue} />
        <StatCard label="Pending requests" value="1" sub="Awaiting response" icon="◐" {...STAT_PALETTE.peach} />
        <StatCard label="Milestones" value="6" sub="AI-suggested" icon="◈" {...STAT_PALETTE.cream} />
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="col-span-2 bg-surface rounded-xl border border-surface-border shadow-card p-7">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[15px] font-semibold text-ink-900">Team coverage by role</p>
              <p className="text-[13px] text-ink-500">2 critical gaps remaining</p>
            </div>
          </div>
          <GapBarChart gaps={gaps} />

          <div className="mt-5 pt-5 border-t border-surface-border">
            <p className="text-[15px] font-medium text-ink-900 mb-3">Recommended for Full Stack Engineer</p>
            <AvatarRow
              initial="P" name="Priya Data" subtitle="Full-stack · 4 yrs · part-time"
              trailing={
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-violet-600">76%</span>
                  <button className="text-xs bg-violet-50 text-violet-700 px-3 py-1.5 rounded-lg font-medium hover:bg-violet-100 transition-colors">Connect</button>
                </div>
              }
            />
          </div>
        </div>

        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
          <p className="text-[15px] font-semibold text-ink-900 mb-1">Readiness breakdown</p>
          <p className="text-[13px] text-ink-500 mb-2">By dimension</p>
          <DonutChart data={readinessData} />
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
        <p className="text-[15px] font-semibold text-ink-900 mb-3">Top risk</p>
        <div className="flex items-start gap-3">
          <Badge label="TEAM · HIGH" priority="HIGH" />
          <p className="text-[15px] text-ink-700">2 critical roles unfilled — Full Stack Engineer, UX/UI Designer.</p>
        </div>
      </div>
    </Shell>
  );
}
