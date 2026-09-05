import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Shell from '../components/Shell.jsx';
import DonutChart from '../components/charts/DonutChart.jsx';
import Badge from '../components/charts/Badge.jsx';
import { getStartup, getGaps, getReadiness } from '../services/startups.js';

const COLORS = ['#7C5CFC', '#4C86F9', '#3FB081', '#F0A84E', '#EF6E85', '#C58A00', '#6D28D9'];

export default function StartupDetail() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [startup, setStartup] = useState(null);
  const [gaps, setGaps] = useState([]);
  const [readiness, setReadiness] = useState(null);

  useEffect(() => {
    async function load() {
      const { ok, data } = await getStartup(id);
      if (ok && data.success) {
        setStartup(data.startup);
        const [gapsRes, readinessRes] = await Promise.all([getGaps(id), getReadiness(id)]);
        if (gapsRes.ok && gapsRes.data.success) setGaps(gapsRes.data.gaps);
        if (readinessRes.ok && readinessRes.data.success) setReadiness(readinessRes.data.readiness);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return <Shell title="Startup profile"><div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" /></div></Shell>;
  if (!startup) return <Shell title="Startup profile"><div className="bg-surface rounded-xl border border-surface-border shadow-card p-12 text-center"><p className="text-[15px] text-ink-500">This startup isn't discoverable, or doesn't exist.</p></div></Shell>;

  const dims = readiness ? Object.entries(readiness.dimensions).map(([name, value], i) => ({
    name: name[0].toUpperCase() + name.slice(1), value: Math.round(value * 100), color: COLORS[i % COLORS.length]
  })) : [];

  return (
    <Shell title={startup.name} subtitle="Startup profile">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-[26px] font-semibold text-ink-900 tracking-tight">{startup.name}</h1>
          <p className="text-sm text-ink-500 mt-1">{(startup.domain || []).join(', ')} · {startup.stage} stage · {startup.visibility}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
            <p className="text-[15px] font-semibold text-ink-900 mb-2">Problem</p>
            <p className="text-[15px] text-ink-700 leading-relaxed mb-5">{startup.problem}</p>
            <p className="text-[15px] font-semibold text-ink-900 mb-2">Solution</p>
            <p className="text-[15px] text-ink-700 leading-relaxed">{startup.solution}</p>
          </div>

          <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
            <p className="text-[15px] font-semibold text-ink-900 mb-4">Open capability gaps</p>
            {gaps.length === 0 ? <p className="text-[13px] text-ink-500">No gaps diagnosed yet.</p> : (
              <div className="space-y-3">
                {gaps.map((g) => (
                  <div key={g.id} className="flex items-center justify-between">
                    <span className="text-[15px] text-ink-900">{g.role}</span>
                    <Badge label={g.priority_level} priority={g.priority_level} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7 text-center">
            <p className="text-[13px] font-medium text-ink-500 mb-2">Readiness</p>
            <p className="text-4xl font-bold text-violet-600">{readiness ? Math.round(readiness.overall_score) : '—'}</p>
          </div>
          {readiness && (
            <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
              <p className="text-[13px] font-medium text-ink-500 mb-3">By dimension</p>
              <DonutChart data={dims} height={160} />
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
