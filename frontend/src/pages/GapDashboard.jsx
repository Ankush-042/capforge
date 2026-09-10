import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { RefreshCw, ArrowUpRight, Check, Users } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import MetricTile, { TILE_PALETTE } from '../components/charts/MetricTile.jsx';
import { getGaps, diagnoseGaps } from '../services/startups.js';
import { useActiveStartup } from '../context/ActiveStartupContext.jsx';
import { useToast } from '../components/Toast.jsx';

/**
 * Who you're missing.
 *
 * This was "Gap diagnosis": a list of rows inside one box, each row a role
 * name, a reason, a thin bar and a priority pill. Accurate, and it told a
 * founder nothing about what to do. Every role looked the same weight, and
 * the thing that actually matters — that nobody covers this and there are
 * ranked people waiting — was invisible.
 *
 * It now leads with the single role that matters most, separates roles you
 * still need from roles you have covered, and every card says plainly what
 * is missing and what happens if you click it.
 */

const PRIORITY_ACCENT = {
  CRITICAL: '#E15C4D',
  HIGH: '#F0A84E',
  MEDIUM: '#C5A93A',
  LOW: '#3FB081',
};

function priorityLabel(p) {
  if (!p) return 'Low';
  return p.charAt(0) + p.slice(1).toLowerCase();
}

function RoleCard({ gap, startupId, index }) {
  // Postgres returns NUMERIC as a string. Coercing by accident has caused
  // real bugs on this codebase twice, so parse explicitly.
  const coverage = Math.round((parseFloat(gap.coverage) || 0) * 100);
  const covered = coverage > 0;
  const accent = covered ? '#3FB081' : (PRIORITY_ACCENT[gap.priority_level] || PRIORITY_ACCENT.LOW);
  const isCoFounder = gap.seeking_type === 'CO_FOUNDER';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.3), ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        to={`/app/gaps/${gap.id}?startup=${startupId}`}
        className="group relative block overflow-hidden bg-surface rounded-xl border border-surface-border shadow-card p-6 pl-7 hover:border-violet-500/50 hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-200"
      >
        <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: accent }} />

        <div className="flex items-start justify-between gap-4 mb-2.5">
          <div className="min-w-0">
            <p className="text-[17px] font-semibold text-ink-950 leading-tight">{gap.role}</p>
            <p className="text-[12px] font-medium mt-1" style={{ color: accent }}>
              {covered ? 'Covered by the team' : `${priorityLabel(gap.priority_level)} priority${isCoFounder ? ' · Co-founder' : ''}`}
            </p>
          </div>
          <ArrowUpRight size={16} className="text-ink-300 group-hover:text-violet-600 transition-colors shrink-0 mt-1" />
        </div>

        <p className="text-[13.5px] text-ink-700 leading-relaxed line-clamp-2 mb-4">{gap.reason}</p>

        {(gap.required_skills || []).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {(gap.required_skills || []).slice(0, 4).map((sk) => (
              <span key={sk} className="text-[11px] px-2 py-1 rounded-md bg-surface-muted text-ink-700">{sk}</span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-4 pt-3 border-t border-surface-border">
          <div className="flex-1 min-w-0">
            <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${coverage}%`, backgroundColor: accent }} />
            </div>
          </div>
          <span className="text-[12px] font-medium text-ink-500 shrink-0 tabular-nums">
            {covered ? `${coverage}% covered` : 'Nobody covers this'}
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

export default function GapDashboard() {
  const { activeStartup, loading: startupLoading } = useActiveStartup();
  const [loading, setLoading] = useState(true);
  const [diagnosing, setDiagnosing] = useState(false);
  const [startup, setStartup] = useState(null);
  const [gaps, setGaps] = useState([]);
  const showToast = useToast();

  async function loadGaps(startupId) {
    const { ok, data } = await getGaps(startupId);
    if (ok && data.success) setGaps(data.gaps);
  }

  useEffect(() => {
    async function load() {
      if (startupLoading) return;
      if (activeStartup) {
        setStartup(activeStartup);
        await loadGaps(activeStartup.id);
      }
      setLoading(false);
    }
    load();
  }, [activeStartup?.id, startupLoading]);

  async function handleDiagnose() {
    if (!startup) {
      showToast('No venture yet. Describe your idea first.', 'error');
      return;
    }
    setDiagnosing(true);
    const { ok, data } = await diagnoseGaps(startup.id);
    if (!ok || !data.success) {
      showToast(data.detail || data.error || 'Could not work out what you need. Try again.', 'error');
      setDiagnosing(false);
      return;
    }
    await loadGaps(startup.id);
    setDiagnosing(false);
    showToast('Updated. Here is what your venture needs now.');
  }

  if (loading) {
    return (
      <Shell title="Roles">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" />
        </div>
      </Shell>
    );
  }

  const open = gaps.filter((g) => (parseFloat(g.coverage) || 0) === 0 && g.status !== 'FILLED' && g.status !== 'DISMISSED');
  const covered = gaps.filter((g) => (parseFloat(g.coverage) || 0) > 0 || g.status === 'FILLED');
  const criticalCount = open.filter((g) => g.priority_level === 'CRITICAL').length;
  const topRole = open.find((g) => g.priority_level === 'CRITICAL') || open[0] || null;
  const coveragePct = gaps.length > 0 ? Math.round((covered.length / gaps.length) * 100) : 0;

  return (
    <Shell title={startup?.name || 'Roles'} subtitle="The people this venture still needs">
      {/* WHERE YOU ARE. Not "Gap diagnosis": the actual state of the team and
          the one hire that unblocks the most. */}
      <div className="mb-7 flex items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-violet-600 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
            {open.length === 0 ? 'Fully covered' : `${open.length} role${open.length === 1 ? '' : 's'} still open`}
          </p>
          <h1 className="font-editorial italic text-[32px] text-trust-fg leading-tight max-w-3xl">
            {topRole
              ? (topRole.seeking_type === 'CO_FOUNDER'
                  ? `You need a co-founder to own ${topRole.role}.`
                  : `The ${topRole.role} is the one that unblocks the most.`)
              : gaps.length === 0
                ? 'Nobody has worked out what you need yet.'
                : 'Every role you need is covered.'}
          </h1>
          <p className="text-[15px] text-ink-700 mt-3 max-w-2xl leading-relaxed">
            {gaps.length === 0
              ? 'Run an analysis and CapForge will read your venture and tell you which roles it actually needs, and why.'
              : topRole
                ? 'Open any role to see real people ranked against it, each with the reason they fit.'
                : 'Re-run the analysis whenever the venture changes and this will update.'}
          </p>
        </div>
        <button
          onClick={handleDiagnose}
          disabled={diagnosing || !startup}
          className="shrink-0 flex items-center gap-2 text-[13px] font-medium bg-ink-900 hover:bg-ink-700 text-white px-4 py-2.5 rounded-full transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={diagnosing ? 'animate-spin' : ''} />
          {diagnosing ? 'Working it out…' : gaps.length === 0 ? 'Work out what I need' : 'Re-run'}
        </button>
      </div>

      {gaps.length > 0 && (
        <div className="grid grid-cols-4 gap-4 mb-8">
          <MetricTile
            label="Still open" value={open.length}
            icon={Users} {...TILE_PALETTE.peach}
            badge={criticalCount > 0 ? `${criticalCount} critical` : null}
            caption={open.length === 0 ? 'Nothing outstanding' : 'Nobody covers these'}
          />
          <MetricTile
            label="Covered" value={covered.length} unit={`/ ${gaps.length}`}
            icon={Check} {...TILE_PALETTE.blue}
            progress={coveragePct}
            caption={`${coveragePct}% of what you need`}
          />
          <MetricTile
            label="Co-founder" value={open.filter((g) => g.seeking_type === 'CO_FOUNDER').length}
            icon={Users} {...TILE_PALETTE.lavender}
            caption={open.some((g) => g.seeking_type === 'CO_FOUNDER') ? 'Searching for a partner' : 'Not currently looking'}
          />
          <MetricTile
            label="Assessed" value={gaps.length}
            icon={RefreshCw} {...TILE_PALETTE.cream}
            caption="Roles this venture was read against"
          />
        </div>
      )}

      {gaps.length === 0 ? (
        <div className="bg-surface rounded-xl border border-surface-border shadow-card py-16 text-center">
          <p className="text-[15px] text-ink-700 mb-1">No roles worked out yet.</p>
          <p className="text-[13px] text-ink-500 mb-6 max-w-sm mx-auto">
            CapForge reads your problem, your solution and who is already on the team, then tells you what is missing.
          </p>
          <button
            onClick={handleDiagnose}
            disabled={diagnosing}
            className="inline-flex items-center gap-2 text-[13px] font-medium bg-ink-900 hover:bg-ink-700 text-white px-5 py-2.5 rounded-full transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={diagnosing ? 'animate-spin' : ''} />
            {diagnosing ? 'Working it out…' : 'Work out what I need'}
          </button>
        </div>
      ) : (
        <>
          {open.length > 0 && (
            <div className="mb-8">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-[15px] font-semibold text-ink-900">Who you're missing</h2>
                <span className="text-[13px] text-ink-500">Ranked by what unblocks the most</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {open.map((g, i) => <RoleCard key={g.id} gap={g} startupId={startup.id} index={i} />)}
              </div>
            </div>
          )}

          {covered.length > 0 && (
            <div>
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-[15px] font-semibold text-ink-900">Already covered</h2>
                <Link to="/app/team" className="text-[13px] text-ink-500 hover:text-violet-600 transition-colors">See the team</Link>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {covered.map((g, i) => <RoleCard key={g.id} gap={g} startupId={startup.id} index={i} />)}
              </div>
            </div>
          )}
        </>
      )}
    </Shell>
  );
}
