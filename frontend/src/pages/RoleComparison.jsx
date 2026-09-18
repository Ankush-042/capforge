import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowUpRight, AlertTriangle, Check, Users } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import { getRoleComparison } from '../services/startups.js';
import { useActiveStartup } from '../context/ActiveStartupContext.jsx';

/**
 * Which role to fill first.
 *
 * A founder with three critical gaps and the capacity to fill one had no way
 * to compare them. They opened a role, saw its candidates, went back, opened
 * another, and held the whole thing in their head. The engine is symmetric;
 * the experience was not. A contributor can weigh ventures side by side and a
 * founder could not weigh roles.
 *
 * The page is honest that it suggests rather than decides: urgency and
 * candidate strength are shown SEPARATELY as well as combined, so a founder
 * who disagrees with the ordering can still use it.
 */

const PRIORITY = {
  CRITICAL: { fg: '#E15C4D', bg: '#FDEEF0', label: 'Critical' },
  HIGH: { fg: '#F0A84E', bg: '#FEF3E8', label: 'High' },
  MEDIUM: { fg: '#C5A93A', bg: '#FFF9E8', label: 'Medium' },
  LOW: { fg: '#3FB081', bg: '#EAF7F0', label: 'Low' },
};

function RoleRow({ r, startupId, isTop, index }) {
  const p = PRIORITY[r.priority] || PRIORITY.LOW;
  const bestPct = r.best ? Math.round(r.best.score * 100) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.25) }}
      className={`relative overflow-hidden bg-surface rounded-xl border shadow-card p-6 pl-7 ${
        isTop ? 'border-violet-500/50' : 'border-surface-border'
      }`}
    >
      <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: isTop ? '#7C5CFC' : p.fg }} />

      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5 mb-1.5">
            <p className="text-[16px] font-semibold text-ink-950">{r.role}</p>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md" style={{ backgroundColor: p.bg, color: p.fg }}>
              {p.label}
            </span>
            {r.seekingType === 'CO_FOUNDER' && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-violet-50 text-violet-700">Co-founder</span>
            )}
          </div>

          {r.best ? (
            <p className="text-[13.5px] text-ink-700 leading-relaxed">
              Best available: <Link to={`/app/profile/${r.best.userId}?startupId=${startupId}&gapId=${r.gapId}`} className="font-medium text-ink-950 hover:text-violet-700 transition-colors">{r.best.name}</Link>
              {r.best.headline && <span className="text-ink-500"> · {r.best.headline}</span>}
              <span className="text-ink-500"> · {bestPct}% fit</span>
            </p>
          ) : (
            <p className="text-[13.5px] text-ink-500 leading-relaxed">
              Nobody ranked for this yet. Open it and search.
            </p>
          )}

          <p className="text-[12.5px] text-ink-500 mt-1.5">
            {r.candidateCount === 0 ? 'No candidates' : `${r.candidateCount} ${r.candidateCount === 1 ? 'candidate' : 'candidates'} found`}
          </p>
        </div>

        {/* Both inputs shown, not just the combined number. A founder who
            disagrees with the ordering can still read the parts. */}
        <div className="shrink-0 flex items-center gap-6">
          <div className="text-right">
            <p className="text-[13px] font-semibold text-ink-900 tabular-nums">{Math.round(r.urgency * 100)}%</p>
            <p className="text-[11px] text-ink-300">urgency</p>
          </div>
          <div className="text-right">
            <p className="text-[13px] font-semibold text-ink-900 tabular-nums">{bestPct === null ? '—' : `${bestPct}%`}</p>
            <p className="text-[11px] text-ink-300">best fit</p>
          </div>
          <div className="text-right w-16">
            <p className="text-[22px] font-bold leading-none tabular-nums" style={{ color: isTop ? '#6845F0' : '#3E4047' }}>
              {r.actionability}
            </p>
            <p className="text-[11px] text-ink-300 mt-0.5">movable</p>
          </div>
          <Link
            to={`/app/gaps/${r.gapId}?startup=${startupId}`}
            className="shrink-0 flex items-center gap-1.5 text-[13px] font-medium text-violet-700 hover:text-violet-600 transition-colors"
          >
            Open <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

export default function RoleComparison() {
  const { activeStartup, loading: startupLoading } = useActiveStartup();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    async function load() {
      if (startupLoading) return;
      if (!activeStartup) { setLoading(false); return; }
      const { ok, data: d } = await getRoleComparison(activeStartup.id);
      if (ok && d.success) setData(d);
      setLoading(false);
    }
    load();
  }, [activeStartup?.id, startupLoading]);

  if (loading) {
    return (
      <Shell title="Which role first">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" />
        </div>
      </Shell>
    );
  }

  const roles = data?.roles || [];
  const startHere = data?.startHere || null;
  const stuck = data?.urgentButStuck || [];

  return (
    <Shell title={activeStartup?.name || 'Which role first'} subtitle="Every open role, side by side">
      <div className="mb-7">
        <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-violet-600 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
          {roles.length === 0 ? 'Nothing open' : `${roles.length} open ${roles.length === 1 ? 'role' : 'roles'}`}
        </p>
        <h1 className="font-editorial italic text-[32px] text-trust-fg leading-tight max-w-3xl">
          {startHere
            ? `Start with the ${startHere.role}.`
            : roles.length === 0
              ? 'Every role is covered.'
              : 'Nobody is ranked for any of these yet.'}
        </h1>
        <p className="text-[15px] text-ink-700 mt-3 max-w-2xl leading-relaxed">
          {startHere
            ? 'The right role to fill first is not always the most critical one. It is where urgency and a genuinely available person meet, because that is the one you can actually close.'
            : roles.length === 0
              ? 'Nothing outstanding. Re-run role analysis when the venture changes.'
              : 'Open each role and search for candidates, then come back and this will tell you where to start.'}
        </p>
      </div>

      {roles.length === 0 ? (
        <div className="bg-surface rounded-xl border border-surface-border shadow-card py-16 text-center">
          <Check size={22} className="text-mint-500 mx-auto mb-3" />
          <p className="text-[15px] text-ink-700 mb-1">No open roles.</p>
          <Link to="/app/gaps" className="text-[13px] text-violet-700 hover:text-violet-600 transition-colors">Work out what you need</Link>
        </div>
      ) : (
        <>
          {/* Urgent but nobody available is a genuinely different situation,
              and the one most likely to be missed if everything is sorted by
              actionability alone. */}
          {stuck.length > 0 && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
              <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-[14px] font-semibold text-amber-800">
                  {stuck.length === 1 ? 'One urgent role has nobody strong available' : `${stuck.length} urgent roles have nobody strong available`}
                </p>
                <p className="text-[13px] text-amber-700 mt-0.5 leading-relaxed">
                  {stuck.map((r) => r.role).join(', ')}. These will not move until the right person joins the platform, so they sit below roles you can actually close today. Worth reaching out beyond CapForge for these.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-baseline justify-between mb-3">
            <div>
              <h2 className="text-[15px] font-semibold text-ink-900">Ranked by what you can actually move</h2>
              <p className="text-[13px] text-ink-500 mt-0.5">Urgency times the strength of who is available. Both parts shown, so you can disagree with the order.</p>
            </div>
            <Link to="/app/gaps" className="text-[13px] text-ink-500 hover:text-violet-600 transition-colors">All roles</Link>
          </div>

          <div className="space-y-3">
            {roles.map((r, i) => (
              <RoleRow key={r.gapId} r={r} startupId={activeStartup.id} isTop={i === 0 && !!r.best} index={i} />
            ))}
          </div>
        </>
      )}
    </Shell>
  );
}
