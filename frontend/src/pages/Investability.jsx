import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { AlertTriangle, ArrowUpRight, Users, Presentation } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import SignalPanel from '../components/SignalPanel.jsx';
import { getVentureSummary } from '../services/startups.js';
import { useActiveStartup } from '../context/ActiveStartupContext.jsx';

/**
 * Yourself, through an investor's eyes.
 *
 * This page rendered the shared VentureSummaryCard and left it there, with a
 * heading explaining what the page was. That is a page describing itself
 * rather than doing something.
 *
 * The point of standing here is uncomfortable and useful: this is what
 * someone deciding whether to fund you actually sees, including the parts
 * you would rather they did not. So it leads with the verdict, shows the
 * risks an investor would raise before you can, and puts the pitch one click
 * away, because that is what you do about it.
 */

const INVESTOR_BAR = 35;

const DIM_META = {
  team_composition: { label: 'Team', color: '#7C5CFC' },
  market_positioning: { label: 'Market', color: '#4C86F9' },
  product_readiness: { label: 'Product', color: '#3FB081' },
  funding_readiness: { label: 'Funding', color: '#F0A84E' },
};
const dimLabel = (k) => DIM_META[k]?.label || k.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');

const SEVERITY = {
  CRITICAL: { fg: '#E15C4D', bg: '#FDEEF0', label: 'Critical' },
  HIGH: { fg: '#F0A84E', bg: '#FEF3E8', label: 'High' },
  MEDIUM: { fg: '#C5A93A', bg: '#FFF9E8', label: 'Medium' },
  LOW: { fg: '#3FB081', bg: '#EAF7F0', label: 'Low' },
};

export default function Investability() {
  const { activeStartup, loading: startupLoading } = useActiveStartup();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    async function load() {
      if (startupLoading) return;
      if (activeStartup) {
        const res = await getVentureSummary(activeStartup.id);
        if (res.ok && res.data.success) setSummary(res.data.summary);
      }
      setLoading(false);
    }
    load();
  }, [activeStartup?.id, startupLoading]);

  if (loading) {
    return (
      <Shell title="Investor view">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" />
        </div>
      </Shell>
    );
  }

  if (!summary) {
    return (
      <Shell title="Investor view" subtitle="What an investor sees">
        <div className="bg-surface rounded-xl border border-surface-border shadow-card py-16 text-center">
          <p className="text-[15px] text-ink-700 mb-1">No venture yet.</p>
          <p className="text-[13px] text-ink-500">Describe your idea first and this will show you how it looks to an investor.</p>
        </div>
      </Shell>
    );
  }

  const score = summary.readiness ? Math.round(parseFloat(summary.readiness.overall_score)) : null;
  const visible = score !== null && score >= INVESTOR_BAR;
  const away = score !== null ? INVESTOR_BAR - score : null;
  const coverage = summary.team_coverage || { roles_filled: 0, roles_open: 0 };
  const totalRoles = (coverage.roles_filled || 0) + (coverage.roles_open || 0);
  const coveragePct = totalRoles > 0 ? Math.round((coverage.roles_filled / totalRoles) * 100) : 0;
  const risks = summary.top_risks || [];
  const dims = summary.readiness
    ? Object.entries(summary.readiness.dimensions || {}).filter(([, v]) => typeof v === 'number').sort((a, b) => a[1] - b[1])
    : [];

  return (
    <Shell title={summary.name} subtitle="Exactly what an investor sees">
      <div className="mb-7">
        <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-violet-600 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
          {visible ? 'Discoverable by investors' : 'Not yet discoverable'}
        </p>
        <h1 className="font-editorial italic text-[32px] text-trust-fg leading-tight max-w-3xl">
          {score === null
            ? 'An investor would have nothing to go on yet.'
            : visible
              ? 'This is what they see when they find you.'
              : `They cannot see you yet. You are ${away} point${away === 1 ? '' : 's'} short.`}
        </h1>
        <p className="text-[15px] text-ink-700 mt-3 max-w-2xl leading-relaxed">
          Nothing here is written for you. It is assembled from what your venture actually is, the same way it is assembled for every other venture an investor scrolls past.
        </p>
      </div>

      {/* Market context first: an investor reads your venture against what is
          happening in the market, so you should see both together. */}
      {activeStartup?.id && (
        <div className="mb-8"><SignalPanel endpoint={`/signal/startup/${activeStartup.id}`} /></div>
      )}

      {/* THE CARD AN INVESTOR ACTUALLY SEES */}
      <div className="mb-8">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-[15px] font-semibold text-ink-900">Your venture, as they see it</h2>
          <Link to="/app/pitch" className="flex items-center gap-1.5 text-[13px] font-medium text-violet-700 hover:text-violet-600 transition-colors">
            <Presentation size={13} /> Your pitch
          </Link>
        </div>

        <div className="relative overflow-hidden rounded-xl bg-ink-950 p-8">
          <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle at 15% 20%, #7C5CFC 0%, transparent 55%), radial-gradient(circle at 85% 80%, #1F5D52 0%, transparent 55%)' }} />
          <div className="relative">
            <div className="flex items-start justify-between gap-8 mb-6">
              <div className="min-w-0">
                <p className="text-[11px] font-medium tracking-[0.12em] uppercase text-mint-500 mb-2">
                  {(summary.domain || []).slice(0, 3).join(' · ') || 'Venture'}{summary.stage ? ` · ${summary.stage}` : ''}
                </p>
                <p className="font-display text-[30px] font-semibold text-white leading-tight">{summary.name}</p>
              </div>
              {score !== null && (
                <div className="shrink-0 text-right">
                  <span className="font-display text-[44px] font-bold text-white leading-none tabular-nums">{score}</span>
                  <p className="text-[11px] text-white/50 mt-1">readiness</p>
                </div>
              )}
            </div>

            {summary.problem && (
              <div className="mb-5">
                <p className="text-[11px] font-medium tracking-wide uppercase text-white/40 mb-1.5">The problem</p>
                <p className="text-[15px] text-white/80 leading-relaxed max-w-2xl">{summary.problem}</p>
              </div>
            )}
            {summary.solution && (
              <div className="mb-6">
                <p className="text-[11px] font-medium tracking-wide uppercase text-white/40 mb-1.5">What they are building</p>
                <p className="text-[15px] text-white/80 leading-relaxed max-w-2xl">{summary.solution}</p>
              </div>
            )}

            <div className="flex items-center gap-6 pt-5 border-t border-white/10">
              <div>
                <p className="text-[20px] font-semibold text-white tabular-nums leading-none">{coverage.roles_filled}<span className="text-[14px] text-white/40">/{totalRoles}</span></p>
                <p className="text-[11px] text-white/50 mt-1">roles filled</p>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div>
                <p className="text-[20px] font-semibold text-white tabular-nums leading-none">{coverage.roles_open}</p>
                <p className="text-[11px] text-white/50 mt-1">still open</p>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div className="flex-1 min-w-0">
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${coveragePct}%` }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full rounded-full bg-mint-500"
                  />
                </div>
                <p className="text-[11px] text-white/50 mt-1.5">{coveragePct}% of the team they would expect</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* WHAT THEY WOULD PUSH ON */}
      {risks.length > 0 && (
        <div className="mb-8">
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <h2 className="text-[15px] font-semibold text-ink-900">What they would push on</h2>
              <p className="text-[13px] text-ink-500 mt-0.5">Better to have an answer before they ask.</p>
            </div>
            <Link to="/app/risk" className="text-[13px] text-ink-500 hover:text-violet-600 transition-colors">All risks</Link>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {risks.map((r, i) => {
              const sev = SEVERITY[r.severity] || SEVERITY.MEDIUM;
              return (
                <motion.div
                  key={r.id || i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: Math.min(i * 0.06, 0.25) }}
                  className="bg-surface rounded-xl border border-surface-border shadow-card p-5"
                >
                  <div className="flex items-center gap-2 mb-2.5">
                    <AlertTriangle size={14} style={{ color: sev.fg }} />
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md" style={{ backgroundColor: sev.bg, color: sev.fg }}>
                      {sev.label}
                    </span>
                  </div>
                  <p className="text-[14px] font-semibold text-ink-950 leading-snug mb-1.5">{r.title || r.category}</p>
                  <p className="text-[13px] text-ink-700 leading-relaxed line-clamp-3">{r.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* WHERE THE SCORE COMES FROM */}
      {dims.length > 0 && (
        <div>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-[15px] font-semibold text-ink-900">How they would break it down</h2>
            <Link to="/app/readiness" className="text-[13px] text-ink-500 hover:text-violet-600 transition-colors">Work on this</Link>
          </div>
          <div className="bg-surface rounded-xl border border-surface-border shadow-card p-6">
            <div className="space-y-5">
              {dims.map(([key, value], i) => {
                const meta = DIM_META[key] || {};
                const pct = Math.round(value * 100);
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[13.5px] font-medium text-ink-900">
                        {dimLabel(key)}
                        {i === 0 && <span className="text-[11px] text-amber-600 ml-2">weakest</span>}
                      </span>
                      <span className="text-[13.5px] font-semibold tabular-nums" style={{ color: meta.color || '#7C5CFC' }}>{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.7, delay: i * 0.06 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: meta.color || '#7C5CFC' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {coverage.roles_open > 0 && (
              <div className="mt-6 pt-5 border-t border-surface-border flex items-center justify-between gap-4">
                <p className="text-[13px] text-ink-700">
                  {coverage.roles_open} open role{coverage.roles_open === 1 ? '' : 's'} is the fastest thing you can change.
                </p>
                <Link to="/app/gaps" className="flex items-center gap-1.5 text-[13px] font-medium text-violet-700 hover:text-violet-600 transition-colors shrink-0">
                  <Users size={13} /> Find people <ArrowUpRight size={13} />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </Shell>
  );
}
