import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { RefreshCw, AlertTriangle, ArrowUpRight, Eye } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import VentureAssistant from '../components/VentureAssistant.jsx';
import { getReadiness, assessReadinessRisk } from '../services/startups.js';
import { useActiveStartup } from '../context/ActiveStartupContext.jsx';
import { useToast } from '../components/Toast.jsx';

/**
 * How close you are to investors finding you.
 *
 * This was a number in a donut beside four progress bars. Accurate, and it
 * asked a founder to interpret it themselves. 43 out of what? Good or bad?
 *
 * The number only means something against the threshold investors actually
 * use, which this product already knows: 35. So the page leads with the
 * distance, names the one dimension holding it back, and links to the thing
 * that moves it.
 */

const INVESTOR_BAR = 35;

const DIM_META = {
  team_composition: { label: 'Team', color: '#7C5CFC', fixes: 'Fill an open role. Every person who joins moves this most.', to: '/app/gaps' },
  market_positioning: { label: 'Market', color: '#4C86F9', fixes: 'Sharpen who this is for and who else is doing it.', to: '/app/competitors' },
  product_readiness: { label: 'Product', color: '#3FB081', fixes: 'Ship the next milestone. Evidence of building moves this.', to: '/app/milestones' },
  funding_readiness: { label: 'Funding', color: '#F0A84E', fixes: 'Write your ask and get the pitch ready.', to: '/app/pitch' },
};

const dimLabel = (k) => DIM_META[k]?.label || k.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');

export default function Readiness() {
  const { activeStartup, loading: startupLoading } = useActiveStartup();
  const [loading, setLoading] = useState(true);
  const [assessing, setAssessing] = useState(false);
  const [startup, setStartup] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const showToast = useToast();

  async function loadReadiness(startupId) {
    const { ok, data } = await getReadiness(startupId);
    if (ok && data.success) setReadiness(data.readiness);
  }

  useEffect(() => {
    async function load() {
      if (startupLoading) return;
      if (activeStartup) {
        setStartup(activeStartup);
        await loadReadiness(activeStartup.id);
      }
      setLoading(false);
    }
    load();
  }, [activeStartup?.id, startupLoading]);

  async function handleAssess() {
    if (!startup) { showToast('No venture yet. Describe your idea first.', 'error'); return; }
    setAssessing(true);
    const { ok, data } = await assessReadinessRisk(startup.id);
    if (!ok || !data.success) {
      showToast(data.detail || data.error || 'Could not assess right now. Try again.', 'error');
      setAssessing(false);
      return;
    }
    await loadReadiness(startup.id);
    setAssessing(false);
    showToast('Updated. Here is where you stand.');
  }

  if (loading) {
    return (
      <Shell title="Readiness">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" />
        </div>
      </Shell>
    );
  }

  const score = readiness ? Math.round(parseFloat(readiness.overall_score)) : null;
  const visible = score !== null && score >= INVESTOR_BAR;
  const away = score !== null ? INVESTOR_BAR - score : null;

  const dims = readiness ? Object.entries(readiness.dimensions || {}).filter(([, v]) => typeof v === 'number') : [];
  const sorted = [...dims].sort((a, b) => a[1] - b[1]);
  const weakest = sorted[0] || null;
  const strongest = sorted[sorted.length - 1] || null;

  return (
    <Shell title={startup?.name || 'Readiness'} subtitle={visible ? 'Investors can find you' : 'Not yet visible to investors'}>
      <div className="mb-7 flex items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-violet-600 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
            {score === null ? 'Not assessed' : visible ? 'Above the bar' : 'Below the bar'}
          </p>
          <h1 className="font-editorial italic text-[32px] text-trust-fg leading-tight max-w-3xl">
            {score === null
              ? 'Nobody has assessed this venture yet.'
              : visible
                ? 'Investors can find you.'
                : `You are ${away} point${away === 1 ? '' : 's'} from investors finding you.`}
          </h1>
          <p className="text-[15px] text-ink-700 mt-3 max-w-2xl leading-relaxed">
            {score === null
              ? 'CapForge reads your team, your market, what you have built and your funding position, then tells you honestly where you stand.'
              : weakest
                ? `${dimLabel(weakest[0])} is holding you back the most. ${DIM_META[weakest[0]]?.fixes || ''}`
                : 'Re-assess whenever the venture changes.'}
          </p>
        </div>
        <button
          onClick={handleAssess}
          disabled={assessing || !startup}
          className="shrink-0 flex items-center gap-2 text-[13px] font-medium bg-ink-900 hover:bg-ink-700 text-white px-4 py-2.5 rounded-full transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={assessing ? 'animate-spin' : ''} />
          {assessing ? 'Assessing…' : score === null ? 'Assess my venture' : 'Re-assess'}
        </button>
      </div>

      {!readiness ? (
        <div className="bg-surface rounded-xl border border-surface-border shadow-card py-16 text-center">
          <p className="text-[15px] text-ink-700 mb-1">No assessment yet.</p>
          <p className="text-[13px] text-ink-500 mb-6 max-w-sm mx-auto">
            Investors only see ventures scoring {INVESTOR_BAR} or above. Find out where you stand.
          </p>
          <button
            onClick={handleAssess}
            disabled={assessing}
            className="inline-flex items-center gap-2 text-[13px] font-medium bg-ink-900 hover:bg-ink-700 text-white px-5 py-2.5 rounded-full transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={assessing ? 'animate-spin' : ''} />
            {assessing ? 'Assessing…' : 'Assess my venture'}
          </button>
        </div>
      ) : (
        <>
          {/* THE NUMBER, AGAINST THE ONLY SCALE THAT MATTERS.
              A track with the investor threshold marked on it, so 43 stops
              being an abstract grade and becomes a position. */}
          <div className="relative overflow-hidden rounded-xl bg-ink-950 p-8 mb-8">
            <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle at 15% 20%, #7C5CFC 0%, transparent 55%), radial-gradient(circle at 85% 80%, #1F5D52 0%, transparent 55%)' }} />
            <div className="relative">
              <div className="flex items-end justify-between gap-8 mb-6">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-mint-500 mb-2">Where you stand</p>
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-[64px] font-bold text-white leading-none tabular-nums">{score}</span>
                    <span className="text-[17px] text-white/50">out of 100</span>
                  </div>
                </div>
                <Link to="/app/investability" className="shrink-0 flex items-center gap-2 text-[13px] font-medium text-white/70 hover:text-white transition-colors">
                  <Eye size={15} /> See what an investor sees
                </Link>
              </div>

              <div className="relative h-2.5 rounded-full bg-white/10 overflow-hidden mb-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, score)}%` }}
                  transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: visible ? '#3FB081' : '#7C5CFC' }}
                />
                <div className="absolute top-0 bottom-0 w-[2px] bg-white/50" style={{ left: `${INVESTOR_BAR}%` }} />
              </div>
              <div className="relative h-4">
                <span className="absolute text-[11px] text-white/50 -translate-x-1/2 whitespace-nowrap" style={{ left: `${INVESTOR_BAR}%` }}>
                  investors look here
                </span>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-[15px] font-semibold text-ink-900">What is holding it up, and what is not</h2>
              {strongest && <span className="text-[13px] text-ink-500">Strongest: {dimLabel(strongest[0])}</span>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {sorted.map(([key, value], i) => {
                const meta = DIM_META[key] || {};
                const pct = Math.round(value * 100);
                const isWeakest = weakest && key === weakest[0];
                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: Math.min(i * 0.06, 0.3), ease: [0.16, 1, 0.3, 1] }}
                    className="bg-surface rounded-xl border border-surface-border shadow-card p-6"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="text-[15px] font-semibold text-ink-950">{dimLabel(key)}</p>
                        {isWeakest && (
                          <span className="inline-block text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md mt-1">
                            Holding you back most
                          </span>
                        )}
                      </div>
                      <span className="text-[26px] font-bold leading-none tabular-nums" style={{ color: meta.color || '#7C5CFC' }}>{pct}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden mb-3">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.7, delay: 0.1 + i * 0.05 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: meta.color || '#7C5CFC' }}
                      />
                    </div>
                    {/* dimension_justifications is COMPUTED at assessment time and
                        never stored, so it is absent when the assessment is
                        loaded back from the database. Verified in
                        readinessService. The fallback is the real advice for
                        that dimension rather than an empty gap. */}
                    <p className="text-[13px] text-ink-700 leading-relaxed">
                      {readiness.dimension_justifications?.[key] || meta.fixes}
                    </p>
                    {meta.to && (
                      <Link to={meta.to} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-violet-700 hover:text-violet-600 transition-colors mt-3">
                        {isWeakest ? 'Fix this first' : 'Work on this'} <ArrowUpRight size={13} />
                      </Link>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {readiness.critical_issues?.length > 0 && (
            <div>
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-[15px] font-semibold text-ink-900">What an investor would ask about</h2>
                <Link to="/app/risk" className="text-[13px] text-ink-500 hover:text-violet-600 transition-colors">All risks</Link>
              </div>
              <div className="bg-surface rounded-xl border border-surface-border shadow-card divide-y divide-surface-border">
                {readiness.critical_issues.map((issue) => (
                  <div key={issue} className="flex items-start gap-3 p-5">
                    <AlertTriangle size={15} className="text-signal-critical shrink-0 mt-0.5" />
                    <p className="text-[14px] text-ink-700 leading-relaxed">{issue}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      <VentureAssistant startupId={startup?.id} startupName={startup?.name} />
    </Shell>
  );
}
