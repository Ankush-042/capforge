import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ShieldAlert, ArrowUpRight, Check } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import MetricTile, { TILE_PALETTE } from '../components/charts/MetricTile.jsx';
import { getRisks } from '../services/startups.js';
import { useActiveStartup } from '../context/ActiveStartupContext.jsx';

/**
 * What could go wrong, and what to do about it.
 *
 * This was a numbered list where every risk got identical weight and the
 * suggested action, the only actionable thing on the page, sat at the bottom
 * of each card in small violet text prefixed with an arrow.
 *
 * A risk register nobody acts on is filing. The critical ones now lead, the
 * action is given the same weight as the risk itself, and the page frames
 * them as what an investor will ask about, because that is when they stop
 * being hypothetical.
 */

const SEVERITY = {
  CRITICAL: { fg: '#E15C4D', bg: '#FDEEF0', label: 'Critical', weight: 4 },
  HIGH: { fg: '#F0A84E', bg: '#FEF3E8', label: 'High', weight: 3 },
  MEDIUM: { fg: '#C5A93A', bg: '#FFF9E8', label: 'Medium', weight: 2 },
  LOW: { fg: '#3FB081', bg: '#EAF7F0', label: 'Low', weight: 1 },
};

function RiskCard({ r, index, featured }) {
  const sev = SEVERITY[r.severity] || SEVERITY.MEDIUM;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.3), ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden bg-surface rounded-xl border border-surface-border shadow-card p-6 pl-7"
    >
      <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: sev.fg }} />

      <div className="flex items-start justify-between gap-4 mb-2.5">
        <p className={`font-semibold text-ink-950 leading-snug ${featured ? 'text-[17px]' : 'text-[15px]'}`}>{r.title}</p>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md" style={{ backgroundColor: sev.bg, color: sev.fg }}>
            {sev.label}
          </span>
          {r.category && <span className="text-[11px] text-ink-300 capitalize">{String(r.category).toLowerCase()}</span>}
        </div>
      </div>

      <p className="text-[14px] text-ink-700 leading-relaxed">{r.description}</p>

      {/* The action was small violet text at the bottom prefixed with an
          arrow. It is the only actionable thing on the page and should not
          be the quietest element on the card. */}
      {r.suggested_action && (
        <div className="mt-4 pt-4 border-t border-surface-border">
          <p className="text-[11px] font-semibold tracking-wide uppercase text-ink-300 mb-1.5">What closes it</p>
          <p className="text-[14px] text-ink-900 leading-relaxed">{r.suggested_action}</p>
        </div>
      )}
    </motion.div>
  );
}

export default function RiskPage() {
  const { activeStartup, loading: startupLoading } = useActiveStartup();
  const [loading, setLoading] = useState(true);
  const [startup, setStartup] = useState(null);
  const [risks, setRisks] = useState([]);

  useEffect(() => {
    async function load() {
      if (startupLoading) return;
      if (activeStartup) {
        setStartup(activeStartup);
        const res = await getRisks(activeStartup.id);
        if (res.ok && res.data.success) setRisks(res.data.risks);
      }
      setLoading(false);
    }
    load();
  }, [activeStartup?.id, startupLoading]);

  if (loading) {
    return (
      <Shell title="What could go wrong">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" />
        </div>
      </Shell>
    );
  }

  const sorted = [...risks].sort((a, b) => (SEVERITY[b.severity]?.weight || 0) - (SEVERITY[a.severity]?.weight || 0));
  const serious = sorted.filter((r) => r.severity === 'CRITICAL' || r.severity === 'HIGH');
  const rest = sorted.filter((r) => r.severity !== 'CRITICAL' && r.severity !== 'HIGH');
  const criticalCount = sorted.filter((r) => r.severity === 'CRITICAL').length;

  return (
    <Shell title={startup?.name || 'What could go wrong'} subtitle="What an investor will ask about">
      <div className="mb-7">
        <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-violet-600 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
          {risks.length === 0 ? 'Nothing flagged' : `${risks.length} flagged`}
        </p>
        <h1 className="font-editorial italic text-[32px] text-trust-fg leading-tight max-w-3xl">
          {risks.length === 0
            ? 'Nothing has been flagged yet.'
            : criticalCount > 0
              ? `${criticalCount} of these will come up in the first serious conversation.`
              : 'Nothing critical, but these are worth knowing.'}
        </h1>
        <p className="text-[15px] text-ink-700 mt-3 max-w-2xl leading-relaxed">
          {risks.length === 0
            ? 'Risks are found when your venture is assessed. Run one from Readiness and they will appear here.'
            : 'Better to have an answer ready than to hear these from someone deciding whether to fund you.'}
        </p>
      </div>

      {risks.length === 0 ? (
        <div className="bg-surface rounded-xl border border-surface-border shadow-card py-16 text-center">
          <Check size={22} className="text-mint-500 mx-auto mb-3" />
          <p className="text-[15px] text-ink-700 mb-1">Nothing flagged yet.</p>
          <p className="text-[13px] text-ink-500 mb-6 max-w-sm mx-auto">
            Either your venture has not been assessed, or nothing came up. Assessing it also tells you how close you are to investors finding you.
          </p>
          <Link
            to="/app/readiness"
            className="inline-flex items-center gap-2 text-[13px] font-medium bg-ink-900 hover:bg-ink-700 text-white px-5 py-2.5 rounded-full transition-colors"
          >
            Assess my venture <ArrowUpRight size={14} />
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-8">
            <MetricTile
              label="Serious" value={serious.length}
              icon={ShieldAlert} {...TILE_PALETTE.peach}
              badge={criticalCount > 0 ? `${criticalCount} critical` : null}
              caption={serious.length === 0 ? 'Nothing serious' : 'Will come up in a raise'}
            />
            <MetricTile
              label="Worth knowing" value={rest.length}
              icon={ShieldAlert} {...TILE_PALETTE.cream}
              caption={rest.length === 0 ? 'None' : 'Lower priority'}
            />
            <MetricTile
              label="With a fix" value={sorted.filter((r) => r.suggested_action).length} unit={`/ ${sorted.length}`}
              icon={Check} {...TILE_PALETTE.blue}
              caption="Have a suggested action"
            />
          </div>

          {serious.length > 0 && (
            <div className="mb-8">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-[15px] font-semibold text-ink-900">Deal with these</h2>
                <Link to="/app/readiness" className="text-[13px] text-ink-500 hover:text-violet-600 transition-colors">How they affect readiness</Link>
              </div>
              <div className="space-y-4">
                {serious.map((r, i) => <RiskCard key={r.id} r={r} index={i} featured />)}
              </div>
            </div>
          )}

          {rest.length > 0 && (
            <div>
              <h2 className="text-[15px] font-semibold text-ink-900 mb-3">
                {serious.length > 0 ? 'Also flagged' : 'Flagged'}
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {rest.map((r, i) => <RiskCard key={r.id} r={r} index={i} />)}
              </div>
            </div>
          )}
        </>
      )}
    </Shell>
  );
}
