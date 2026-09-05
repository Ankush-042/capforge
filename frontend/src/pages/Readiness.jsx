import React, { useState, useEffect } from 'react';
import { Gauge, RefreshCw } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import DonutChart from '../components/charts/DonutChart.jsx';
import { getMyStartups, getReadiness, assessReadinessRisk } from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';

const COLORS = ['#7C5CFC', '#4C86F9', '#3FB081', '#F0A84E', '#EF6E85', '#C58A00', '#6D28D9'];

export default function Readiness() {
  const [loading, setLoading] = useState(true);
  const [assessing, setAssessing] = useState(false);
  const [startup, setStartup] = useState(null);
  const [readiness, setReadiness] = useState(null);

  async function loadReadiness(startupId) {
    const { ok, data } = await getReadiness(startupId);
    if (ok && data.success) setReadiness(data.readiness);
  }

  useEffect(() => {
    async function load() {
      const { ok, data } = await getMyStartups();
      if (ok && data.success && data.startups.length > 0) {
        setStartup(data.startups[0]);
        await loadReadiness(data.startups[0].id);
      }
      setLoading(false);
    }
    load();
  }, []);

  const showToast = useToast();

  async function handleAssess() {
    if (!startup) {
      showToast('No startup found — complete onboarding first.', 'error');
      return;
    }
    setAssessing(true);
    const { ok, data } = await assessReadinessRisk(startup.id);
    if (!ok || !data.success) {
      showToast(data.detail || data.error || 'Assessment failed — try again.', 'error');
      setAssessing(false);
      return;
    }
    await loadReadiness(startup.id);
    setAssessing(false);
    showToast('Readiness assessment updated.');
  }

  if (loading) return <Shell title="Readiness"><div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" /></div></Shell>;

  const dims = readiness ? Object.entries(readiness.dimensions).map(([name, value], i) => ({
    name: name.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' '), value: Math.round(value * 100), color: COLORS[i % COLORS.length]
  })) : [];

  return (
    <Shell title={startup?.name || 'Readiness'} subtitle="Readiness">
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center"><Gauge size={18} /></div>
          <div>
            <h1 className="text-[26px] font-semibold text-ink-900 tracking-tight">Readiness</h1>
            <p className="text-sm text-ink-500 mt-1">Based on currently available information — not a guarantee of success.</p>
          </div>
        </div>
        <button onClick={handleAssess} disabled={assessing || !startup}
          className="flex items-center gap-2 text-sm bg-ink-900 hover:bg-ink-700 text-white px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50">
          <RefreshCw size={14} className={assessing ? 'animate-spin' : ''} />{assessing ? 'Assessing…' : 'Re-assess'}
        </button>
      </div>

      {!readiness ? (
        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-12 text-center">
          <p className="text-[15px] text-ink-500 mb-4">No readiness assessment yet.</p>
          <button onClick={handleAssess} className="text-sm bg-violet-50 text-violet-700 px-4 py-2.5 rounded-lg font-medium hover:bg-violet-100 transition-colors">Run assessment</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7 flex flex-col items-center justify-center text-center">
              <p className="text-5xl font-bold text-violet-600">{Math.round(readiness.overall_score)}</p>
              <p className="text-[13px] text-ink-500 mt-2">Overall readiness</p>
            </div>
            <div className="col-span-2 bg-surface rounded-xl border border-surface-border shadow-card p-7">
              <p className="text-[15px] font-semibold text-ink-900 mb-4">By dimension</p>
              <DonutChart data={dims} height={200} />
            </div>
          </div>
          {readiness.critical_issues?.length > 0 && (
            <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
              <p className="text-[15px] font-semibold text-ink-900 mb-4">Critical issues</p>
              <div className="space-y-3">
                {readiness.critical_issues.map((a) => (
                  <div key={a} className="flex items-center gap-3 text-[15px] text-ink-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-signal-critical" />{a}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Shell>
  );
}
