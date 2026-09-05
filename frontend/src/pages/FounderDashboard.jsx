import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Shell from '../components/Shell.jsx';
import StatCard, { STAT_PALETTE } from '../components/charts/StatCard.jsx';
import GapBarChart from '../components/charts/GapBarChart.jsx';
import DonutChart from '../components/charts/DonutChart.jsx';
import { getMyStartups, getGaps, getReadiness } from '../services/startups.js';

export default function FounderDashboard() {
  const [loading, setLoading] = useState(true);
  const [startup, setStartup] = useState(null);
  const [gaps, setGaps] = useState([]);
  const [readiness, setReadiness] = useState(null);

  useEffect(() => {
    async function load() {
      const { ok, data } = await getMyStartups();
      if (!ok || !data.success || data.startups.length === 0) { setLoading(false); return; }
      const s = data.startups[0];
      setStartup(s);

      const [gapsRes, readinessRes] = await Promise.all([getGaps(s.id), getReadiness(s.id)]);
      if (gapsRes.ok && gapsRes.data.success) setGaps(gapsRes.data.gaps);
      if (readinessRes.ok && readinessRes.data.success) setReadiness(readinessRes.data.readiness);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <Shell title="Dashboard"><div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" /></div></Shell>;
  }

  if (!startup) {
    return (
      <Shell title="Dashboard">
        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-12 text-center">
          <p className="text-[15px] text-ink-500 mb-4">You haven't created a startup yet.</p>
          <Link to="/app/onboarding" className="inline-block bg-ink-900 hover:bg-ink-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
            Describe your idea
          </Link>
        </div>
      </Shell>
    );
  }

  const criticalGaps = gaps.filter((g) => g.priority_level === 'CRITICAL').length;
  const filledCount = gaps.filter((g) => g.status === 'FILLED').length;
  const coveragePct = gaps.length > 0 ? Math.round((filledCount / gaps.length) * 100) : 0;

  const readinessDims = readiness ? Object.entries(readiness.dimensions).map(([name, value], i) => ({
    name: name.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' '),
    value: Math.round(value * 100),
    color: ['#7C5CFC', '#4C86F9', '#3FB081', '#F0A84E', '#EF6E85', '#C58A00', '#6D28D9'][i % 7]
  })) : [];

  return (
    <Shell title={startup.name} subtitle={startup.problem?.slice(0, 60) + '…'}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs text-ink-500 mb-1">Good evening, Founder</p>
          <h1 className="text-[26px] font-semibold text-ink-900 tracking-tight">{startup.name}</h1>
        </div>
        <Link to="/app/gaps" className="text-sm bg-ink-900 hover:bg-ink-700 text-white px-4 py-2.5 rounded-lg shadow-card transition-colors">
          + Discover talent
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-5 mb-7">
        <StatCard label="Readiness" value={readiness ? Math.round(readiness.overall_score) : '—'} sub={readiness ? 'Live score' : 'Run analysis'} icon="◒" {...STAT_PALETTE.lavender} />
        <StatCard label="Team coverage" value={`${coveragePct}%`} sub={`${filledCount} of ${gaps.length} roles filled`} icon="◎" {...STAT_PALETTE.blue} />
        <StatCard label="Critical gaps" value={criticalGaps} sub="Need attention" icon="◐" {...STAT_PALETTE.peach} />
        <StatCard label="Status" value={startup.status} sub={startup.founder_confirmed ? 'Confirmed' : 'Draft'} icon="◍" {...STAT_PALETTE.cream} />
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="col-span-2 bg-surface rounded-xl border border-surface-border shadow-card p-7">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[15px] font-semibold text-ink-900">Team coverage by role</p>
              <p className="text-[13px] text-ink-500">{criticalGaps} critical gap{criticalGaps !== 1 ? 's' : ''} remaining</p>
            </div>
          </div>
          {gaps.length > 0 ? <GapBarChart gaps={gaps} /> : <p className="text-[13px] text-ink-500 py-10 text-center">No gaps diagnosed yet — run analysis from the Gaps page.</p>}
        </div>

        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
          <p className="text-[15px] font-semibold text-ink-900 mb-1">Readiness breakdown</p>
          <p className="text-[13px] text-ink-500 mb-2">By dimension</p>
          {readiness ? <DonutChart data={readinessDims} /> : <p className="text-[13px] text-ink-500 py-10 text-center">No readiness assessment yet.</p>}
        </div>
      </div>
    </Shell>
  );
}
