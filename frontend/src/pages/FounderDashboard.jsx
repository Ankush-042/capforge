import React, { useState, useEffect, useRef } from 'react';
import { Link, Navigate } from 'react-router-dom';
import gsap from 'gsap';
import { ArrowUpRight, Target, Users, Gauge, ListChecks } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import RoleCoverageGrid from '../components/charts/RoleCoverageGrid.jsx';
import { useActiveStartup } from '../context/ActiveStartupContext.jsx';
import { useMyIdentity } from '../context/MyIdentityContext.jsx';
import { getGaps, getReadiness, getReadinessHistory } from '../services/startups.js';

/**
 * Phase A reference screen — rebuilt as a real bento-grid NARRATIVE,
 * not a stat grid. Every card is genuinely clickable (fixes the
 * confirmed bug: nothing on the old Dashboard led anywhere). Real
 * explanatory text on readiness (fixes the confirmed bug: bare numbers
 * with zero explanation). Real staggered entrance motion per the
 * persisted design system (design-system/capforge/MASTER.md).
 */
export default function FounderDashboard() {
  const { isAdmin } = useMyIdentity();
  const { activeStartup, loading: startupLoading } = useActiveStartup();
  const [loading, setLoading] = useState(true);
  const [startup, setStartup] = useState(null);
  const [gaps, setGaps] = useState([]);
  const [readiness, setReadiness] = useState(null);
  const [history, setHistory] = useState([]);
  const gridRef = useRef(null);

  useEffect(() => {
    async function load() {
      if (startupLoading) return;
      if (!activeStartup) { setLoading(false); return; }
      const s = activeStartup;
      setStartup(s);

      const [gapsRes, readinessRes, historyRes] = await Promise.all([getGaps(s.id), getReadiness(s.id), getReadinessHistory(s.id)]);
      if (gapsRes.ok && gapsRes.data.success) setGaps(gapsRes.data.gaps);
      if (readinessRes.ok && readinessRes.data.success) setReadiness(readinessRes.data.readiness);
      if (historyRes.ok && historyRes.data.success) setHistory(historyRes.data.history);
      setLoading(false);
    }
    load();
  }, [activeStartup?.id, startupLoading]);

  useEffect(() => {
    if (!loading && gridRef.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.from(gridRef.current.children, { opacity: 0, scale: 0.94, y: 16, duration: 0.5, stagger: { each: 0.07, from: 'start' }, ease: 'back.out(1.4)' });
    }
  }, [loading]);

  if (isAdmin) return <Navigate to="/app/admin" replace />;

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

  // The real stage this venture is at, from real data. Investors only see
  // ventures at 35+, so that number is a threshold worth naming rather than
  // a score to interpret.
  const INVESTOR_BAR = 35;
  const score = readiness ? Math.round(readiness.overall_score) : null;
  const teamSize = startup.current_team_size || 1;
  const openCount = gaps.filter(g => g.status !== 'FILLED' && g.status !== 'DISMISSED').length;
  const criticalCount = gaps.filter(g => g.status !== 'FILLED' && g.status !== 'DISMISSED' && g.priority_level === 'CRITICAL').length;

  let stage;
  if (teamSize <= 1) {
    stage = {
      label: 'Building the team',
      next: criticalGap
        ? `You are still the only one here. Finding a ${criticalGap.role} is the thing that moves everything else.`
        : 'You are still the only one here. Finding your first teammate is what moves everything else.',
    };
  } else if (score === null) {
    stage = { label: 'Building the team', next: 'Run a readiness assessment to see how close you are to investors finding you.' };
  } else if (score < INVESTOR_BAR) {
    const away = INVESTOR_BAR - score;
    stage = {
      label: 'Not yet visible to investors',
      next: `You are ${away} point${away === 1 ? '' : 's'} away from investors being able to find you. ${openCount > 0 ? `Filling ${openCount === 1 ? 'the open role' : `one of your ${openCount} open roles`} is the fastest way there.` : 'Closing your open risks is the fastest way there.'}`,
    };
  } else {
    stage = {
      label: 'Investors can find you',
      next: `At ${score}, you are above the bar where investors see ventures. ${openCount > 0 ? `${openCount} role${openCount === 1 ? '' : 's'} still open, and every one you fill raises the number.` : 'Keep the momentum: every milestone you close raises the number.'}`,
    };
  }

  return (
    <Shell title={startup.name} subtitle={startup.problem?.slice(0, 60) + '…'}>
      {/* WHERE YOU ARE, and what happens next.
          This said "Good evening, Founder" over a wall of cards. A founder
          opening this should know, without reading anything else, what stage
          their company is at and the one thing that moves it forward. The
          readiness number is framed as a DISTANCE to something they want
          (investors seeing them) rather than as a grade out of 100. */}
      <div className="mb-7">
        <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-violet-600 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
          {stage.label}
        </p>
        <h1 className="font-editorial italic text-[32px] text-trust-fg leading-tight max-w-3xl">
          {criticalGap
            ? (criticalGap.seeking_type === 'CO_FOUNDER'
                ? `You're looking for a co-founder: someone to own ${criticalGap.role}.`
                : `Right now, you need a ${criticalGap.role} on your team.`)
            : 'Your venture is in good shape.'}
        </h1>
        <p className="text-[15px] text-ink-700 mt-3 max-w-2xl leading-relaxed">{stage.next}</p>
      </div>

      {/* METRIC STRIP — four equal tiles, one rhythm.
          This was a 4-column grid holding a 2-col card, another 2-col card,
          then two 1-col cards of different heights: no alignment, no
          hierarchy, cards ending at different points down the page. A
          dashboard reads top-down, so the numbers come first, all the same
          size, then the things you act on. */}
      <div ref={gridRef} className="grid grid-cols-4 gap-4 mb-8">
        <Link to="/app/readiness" className="group bg-surface rounded-xl border border-surface-border shadow-card p-5 hover:border-violet-500/50 hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-start justify-between mb-4">
            <span className="text-[11px] font-medium tracking-wide uppercase text-ink-300">Readiness</span>
            <Gauge size={14} className="text-ink-300 group-hover:text-violet-500 transition-colors" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[34px] font-semibold text-ink-950 leading-none tabular-nums tracking-tight">{score !== null ? score : '—'}</span>
            <span className="text-[13px] text-ink-300">/ {INVESTOR_BAR}+</span>
          </div>
          {/* The bar makes the threshold visible instead of asking someone to
              do the arithmetic. It turns green the moment they cross it. */}
          <div className="mt-3 relative h-1.5 rounded-full bg-surface-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${score !== null && score >= INVESTOR_BAR ? 'bg-mint-500' : 'bg-violet-500'}`}
              style={{ width: `${Math.min(100, ((score || 0) / INVESTOR_BAR) * 100)}%` }}
            />
          </div>
          <p className="text-[12px] text-ink-500 mt-2 leading-snug">
            {score === null ? 'Not assessed yet'
              : score < INVESTOR_BAR ? `${INVESTOR_BAR - score} from investor visibility`
              : 'Visible to investors'}
          </p>
        </Link>

        <Link to="/app/team" className="group bg-surface rounded-xl border border-surface-border shadow-card p-5 hover:border-violet-500/50 hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-start justify-between mb-4">
            <span className="text-[11px] font-medium tracking-wide uppercase text-ink-300">Team</span>
            <Users size={14} className="text-ink-300 group-hover:text-violet-500 transition-colors" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[34px] font-semibold text-ink-950 leading-none tabular-nums tracking-tight">{filledCount}</span>
            <span className="text-[13px] text-ink-300">/ {gaps.length} roles</span>
          </div>
          {/* A thin bar reads faster than a radial gauge at this size. */}
          <div className="mt-3 h-1.5 rounded-full bg-surface-muted overflow-hidden">
            <div className="h-full rounded-full bg-blue-500 transition-all duration-700" style={{ width: `${coveragePct}%` }} />
          </div>
          <p className="text-[12px] text-ink-500 mt-2 leading-snug">
            {filledCount === 0 ? 'You are the only one here' : `${coveragePct}% covered`}
          </p>
        </Link>

        <Link to="/app/gaps" className="group bg-surface rounded-xl border border-surface-border shadow-card p-5 hover:border-violet-500/50 hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-start justify-between mb-4">
            <span className="text-[11px] font-medium tracking-wide uppercase text-ink-300">Open roles</span>
            <Target size={14} className="text-ink-300 group-hover:text-violet-500 transition-colors" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[34px] font-semibold text-ink-950 leading-none tabular-nums tracking-tight">{openCount}</span>
            {criticalCount > 0 && <span className="text-[11px] font-semibold text-signal-critical bg-signal-critical/10 px-2 py-0.5 rounded-md">{criticalCount} critical</span>}
          </div>
          <p className="text-[12px] text-ink-500 mt-2 leading-snug">
            {openCount === 0 ? 'Nothing open' : 'Ranked candidates waiting'}
          </p>
        </Link>

        <Link to="/app/milestones" className="group bg-surface rounded-xl border border-surface-border shadow-card p-5 hover:border-violet-500/50 hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-start justify-between mb-4">
            <span className="text-[11px] font-medium tracking-wide uppercase text-ink-300">Momentum</span>
            <ListChecks size={14} className="text-ink-300 group-hover:text-violet-500 transition-colors" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-[34px] font-semibold leading-none tabular-nums tracking-tight ${scoreDelta === null ? 'text-ink-950' : scoreDelta >= 0 ? 'text-mint-500' : 'text-signal-critical'}`}>
              {scoreDelta !== null ? (scoreDelta >= 0 ? `+${scoreDelta}` : scoreDelta) : '—'}
            </span>
            <span className="text-[13px] text-ink-300">since last check</span>
          </div>
          <p className="text-[12px] text-ink-500 mt-2 leading-snug">
            {weakestDim ? `Weakest: ${dimLabel(weakestDim[0])}` : 'Run an assessment'}
          </p>
        </Link>
      </div>

      {/* THE ONE THING TO DO — given its own section header and full width,
          because it is the point of the page rather than one card among four. */}
      <div className="mb-8">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-[15px] font-semibold text-ink-900">Your next move</h2>
          <Link to="/app/gaps" className="text-[13px] text-ink-500 hover:text-violet-600 transition-colors">All roles</Link>
        </div>
        <Link
          // CONFIRMED BUG: GapDetail reads the startup from ?startup= and this
          // link omitted it, so 'See candidates' always landed on "Gap not
          // found". The same link works from the Roles page because that page
          // includes the param.
          to={criticalGap ? `/app/gaps/${criticalGap.id}?startup=${startup.id}` : '/app/gaps'}
          className="group block relative overflow-hidden rounded-xl bg-ink-950 p-7 hover:shadow-elevated transition-shadow"
        >
          <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle at 15% 20%, #7C5CFC 0%, transparent 55%), radial-gradient(circle at 85% 80%, #1F5D52 0%, transparent 55%)' }} />
          <div className="relative flex items-start justify-between gap-8">
            <div className="min-w-0">
              {criticalGap ? (
                <>
                  <p className="text-[11px] font-medium tracking-[0.12em] uppercase text-mint-500 mb-2">
                    {criticalGap.seeking_type === 'CO_FOUNDER' ? 'Co-founder search' : 'Critical role'}
                  </p>
                  <p className="font-display text-[26px] font-semibold text-white leading-tight mb-2">{criticalGap.role}</p>
                  <p className="text-[14px] text-white/60 leading-relaxed max-w-xl mb-5">{criticalGap.reason}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(criticalGap.required_skills || []).slice(0, 5).map(sk => (
                      <span key={sk} className="text-[11px] px-2.5 py-1 rounded-md bg-white/10 text-white/70 border border-white/10">{sk}</span>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <p className="text-[11px] font-medium tracking-[0.12em] uppercase text-mint-500 mb-2">All clear</p>
                  <p className="font-display text-[26px] font-semibold text-white leading-tight">No critical roles open right now.</p>
                </>
              )}
            </div>
            <div className="shrink-0 flex items-center gap-2 text-[13px] font-medium text-white/70 group-hover:text-white transition-colors">
              See candidates <ArrowUpRight size={15} />
            </div>
          </div>
        </Link>
      </div>

      {/* COVERAGE — its own section, header outside the card so the page has
          a readable rhythm instead of nested boxes inside boxes. */}
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-[15px] font-semibold text-ink-900">Where the team stands</h2>
          <Link to="/app/gaps" className="text-[13px] text-ink-500 hover:text-violet-600 transition-colors">Fill a role</Link>
        </div>
        {gaps.length > 0
          ? <RoleCoverageGrid gaps={gaps} />
          : (
            <div className="bg-surface rounded-xl border border-surface-border shadow-card">
              <p className="text-[13px] text-ink-500 py-12 text-center">No roles diagnosed yet. Run analysis from Roles.</p>
            </div>
          )}
      </div>
    </Shell>
  );
}
