import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ArrowUpRight, Target, Users, Gauge, ListChecks } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import GapBarChart from '../components/charts/GapBarChart.jsx';
import { getMyStartups, getGaps, getReadiness, getReadinessHistory } from '../services/startups.js';

/**
 * Phase A reference screen — rebuilt as a real bento-grid NARRATIVE,
 * not a stat grid. Every card is genuinely clickable (fixes the
 * confirmed bug: nothing on the old Dashboard led anywhere). Real
 * explanatory text on readiness (fixes the confirmed bug: bare numbers
 * with zero explanation). Real staggered entrance motion per the
 * persisted design system (design-system/capforge/MASTER.md).
 */
export default function FounderDashboard() {
  const [loading, setLoading] = useState(true);
  const [startup, setStartup] = useState(null);
  const [gaps, setGaps] = useState([]);
  const [readiness, setReadiness] = useState(null);
  const [history, setHistory] = useState([]);
  const gridRef = useRef(null);

  useEffect(() => {
    async function load() {
      const { ok, data } = await getMyStartups();
      if (!ok || !data.success || data.startups.length === 0) { setLoading(false); return; }
      const s = data.startups[0];
      setStartup(s);

      const [gapsRes, readinessRes, historyRes] = await Promise.all([getGaps(s.id), getReadiness(s.id), getReadinessHistory(s.id)]);
      if (gapsRes.ok && gapsRes.data.success) setGaps(gapsRes.data.gaps);
      if (readinessRes.ok && readinessRes.data.success) setReadiness(readinessRes.data.readiness);
      if (historyRes.ok && historyRes.data.success) setHistory(historyRes.data.history);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (!loading && gridRef.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.from(gridRef.current.children, { opacity: 0, scale: 0.94, y: 16, duration: 0.5, stagger: { each: 0.07, from: 'start' }, ease: 'back.out(1.4)' });
    }
  }, [loading]);

  if (loading) return <Shell title="Dashboard"><div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-trust animate-spin" /></div></Shell>;

  if (!startup) {
    return (
      <Shell title="Dashboard">
        <div className="bg-white rounded-xl border border-surface-border shadow-card p-12 text-center">
          <p className="text-[15px] text-ink-500 mb-4">You haven't created a startup yet.</p>
          <Link to="/app/onboarding" className="inline-block bg-trust hover:bg-trust-light text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
            Describe your idea
          </Link>
        </div>
      </Shell>
    );
  }

  const criticalGap = gaps.filter(g => g.priority_level === 'CRITICAL' && g.status !== 'FILLED')[0];
  const filledCount = gaps.filter(g => g.status === 'FILLED').length;
  const coveragePct = gaps.length > 0 ? Math.round((filledCount / gaps.length) * 100) : 0;

  // Real narrative: pick the weakest real dimension and its real justification.
  let weakestDim = null;
  if (readiness) {
    const entries = Object.entries(readiness.dimensions);
    weakestDim = entries.reduce((min, e) => e[1] < min[1] ? e : min, entries[0]);
  }
  const dimLabel = (k) => k.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');

  // Real story: score delta if history exists.
  const scoreDelta = history.length >= 2 ? Math.round(history[history.length - 1].overall_score - history[history.length - 2].overall_score) : null;

  return (
    <Shell title={startup.name} subtitle={startup.problem?.slice(0, 60) + '…'}>
      <div className="mb-7">
        <p className="text-xs text-ink-500 mb-1">Good evening, Founder</p>
        <h1 className="font-editorial italic text-[32px] text-trust-fg leading-tight">
          {criticalGap
            ? (criticalGap.seeking_type === 'CO_FOUNDER'
                ? `You're looking for a co-founder: someone to own ${criticalGap.role}.`
                : `Right now, you need a ${criticalGap.role} on your team.`)
            : 'Your venture is in good shape.'}
        </h1>
      </div>

      <div ref={gridRef} className="grid grid-cols-4 gap-5 mb-6 items-start">
        {/* Hero insight card — the single sharpest thing to act on, real and clickable */}
        <Link to={criticalGap ? `/app/gaps/${criticalGap.id}` : '/app/gaps'}
          className="col-span-2 bg-trust-bg border border-trust-border rounded-xl p-7 hover:shadow-trust-lg transition-shadow cursor-pointer">
          <div className="flex items-center justify-between mb-5">
            <div className="w-10 h-10 rounded-xl bg-trust text-white flex items-center justify-center"><Target size={18} /></div>
            <ArrowUpRight size={18} className="text-trust" />
          </div>
          {criticalGap ? (
            <>
              <p className="text-[13px] font-medium text-trust mb-1">{criticalGap.seeking_type === 'CO_FOUNDER' ? 'CO-FOUNDER SEARCH' : 'CRITICAL HIRE'}</p>
              <p className="text-xl font-semibold text-trust-fg mb-2">{criticalGap.role}</p>
              <p className="text-[13px] text-ink-700 leading-relaxed mb-4">{criticalGap.reason}</p>
              <div className="flex flex-wrap gap-1.5">
                {(criticalGap.required_skills || []).slice(0, 4).map(s => (
                  <span key={s} className="text-[11px] px-2 py-1 rounded-md bg-white/60 text-trust-fg">{s}</span>
                ))}
              </div>
            </>
          ) : (
            <p className="text-[15px] text-trust-fg">No critical gaps open right now — see the full picture.</p>
          )}
        </Link>

        {/* Readiness — real score + real explanation of WHY, not a bare number */}
        <Link to="/app/readiness" className="col-span-2 bg-white border border-surface-border rounded-xl p-6 hover:shadow-elevated transition-shadow cursor-pointer">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center"><Gauge size={16} /></div>
            <span className="text-3xl font-bold text-ink-900">{readiness ? Math.round(readiness.overall_score) : '—'}</span>
          </div>
          <p className="text-[13px] text-ink-500">
            {scoreDelta !== null ? `${scoreDelta >= 0 ? '↑' : '↓'} ${Math.abs(scoreDelta)} points since last assessment. ` : ''}
            {weakestDim ? `Weakest: ${dimLabel(weakestDim[0])} — ${readiness.dimension_justifications?.[weakestDim[0]] || ''}` : 'Run an assessment to see your real readiness.'}
          </p>
        </Link>

        {/* Team coverage — clickable */}
        <Link to="/app/team" className="bg-white border border-surface-border rounded-xl p-6 hover:shadow-elevated transition-shadow cursor-pointer">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center mb-3"><Users size={16} /></div>
          <p className="text-2xl font-bold text-ink-900">{coveragePct}%</p>
          <p className="text-[13px] text-ink-500 mt-1">{filledCount} of {gaps.length} roles filled</p>
        </Link>

        {/* Milestones — clickable */}
        <Link to="/app/milestones" className="bg-white border border-surface-border rounded-xl p-6 hover:shadow-elevated transition-shadow cursor-pointer">
          <div className="w-9 h-9 rounded-lg bg-mint-50 text-mint-500 flex items-center justify-center mb-3"><ListChecks size={16} /></div>
          <p className="text-[15px] font-semibold text-ink-900">Next milestones</p>
          <p className="text-[13px] text-ink-500 mt-1">Real, AI-suggested steps →</p>
        </Link>
      </div>

      <Link to="/app/gaps" className="block bg-white rounded-xl border border-surface-border shadow-card p-7 hover:shadow-elevated transition-shadow cursor-pointer">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[15px] font-semibold text-ink-900">Team coverage by role</p>
            <p className="text-[13px] text-ink-500">Click through to find real people for every open role</p>
          </div>
          <ArrowUpRight size={18} className="text-ink-300" />
        </div>
        {gaps.length > 0 ? <GapBarChart gaps={gaps} /> : <p className="text-[13px] text-ink-500 py-10 text-center">No gaps diagnosed yet — run analysis from the Gaps page.</p>}
      </Link>
    </Shell>
  );
}
