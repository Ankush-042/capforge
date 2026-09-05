import React, { useState, useEffect } from 'react';
import { Compass, Sparkles } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import { getMyStartups, getCompetitorAnalysis, runCompetitorAnalysis } from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';

export default function CompetitorAnalysis() {
  const showToast = useToast();
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [startup, setStartup] = useState(null);
  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    async function load() {
      const { ok, data } = await getMyStartups();
      if (ok && data.success && data.startups.length > 0) {
        setStartup(data.startups[0]);
        const res = await getCompetitorAnalysis(data.startups[0].id);
        if (res.ok && res.data.success && res.data.analyses.length > 0) setAnalysis(res.data.analyses[0]);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleRun() {
    if (!startup) { showToast('No startup found.', 'error'); return; }
    setRunning(true);
    const { ok, data } = await runCompetitorAnalysis(startup.id);
    setRunning(false);
    if (!ok || !data.success) { showToast(data.detail || data.error || 'Analysis failed.', 'error'); return; }
    setAnalysis(data.competitorAnalysis);
    showToast('Analysis complete.');
  }

  if (loading) return <Shell title="Market positioning"><div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" /></div></Shell>;

  return (
    <Shell title={startup?.name || 'Market positioning'} subtitle="Competitor analysis">
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center"><Compass size={18} /></div>
          <div>
            <h1 className="text-[26px] font-semibold text-ink-900 tracking-tight">Market positioning</h1>
            <p className="text-sm text-ink-500 mt-1">AI-interpreted — validate before acting on it.</p>
          </div>
        </div>
        <button onClick={handleRun} disabled={running || !startup}
          className="flex items-center gap-2 text-sm bg-ink-900 hover:bg-ink-700 text-white px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50">
          <Sparkles size={14} />{running ? 'Analyzing…' : 'Run analysis'}
        </button>
      </div>

      {!analysis ? (
        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-12 text-center">
          <p className="text-[15px] text-ink-500">No analysis yet. Click "Run analysis" above.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
              <p className="text-[13px] font-medium text-ink-500 mb-2">Comparable category</p>
              <p className="text-[15px] text-ink-900 font-medium">{analysis.comparable_category}</p>
            </div>
            <div className="col-span-2 bg-surface rounded-xl border border-surface-border shadow-card p-7">
              <p className="text-[13px] font-medium text-ink-500 mb-2">Potential overlap</p>
              <p className="text-[15px] text-ink-700 leading-relaxed">{analysis.potential_overlap}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
              <p className="text-[15px] font-semibold text-ink-900 mb-4">Differentiation opportunities</p>
              <div className="space-y-3">
                {(analysis.differentiation_opportunities || []).map((d) => <p key={d} className="text-[15px] text-ink-700 flex gap-2"><span className="text-mint-500">✓</span>{d}</p>)}
              </div>
            </div>
            <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
              <p className="text-[15px] font-semibold text-ink-900 mb-4">Worth validating</p>
              <div className="space-y-3">
                {(analysis.positioning_questions || []).map((q) => <p key={q} className="text-[15px] text-ink-700 flex gap-2"><span className="text-amber-500">?</span>{q}</p>)}
              </div>
            </div>
          </div>
        </>
      )}
    </Shell>
  );
}
