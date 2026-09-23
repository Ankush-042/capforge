import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ArrowUpRight, AlertTriangle, Users, Flag, TrendingUp, TrendingDown, Eye } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import VentureAssistant from '../components/VentureAssistant.jsx';
import { getProgress } from '../services/startups.js';
import { useActiveStartup } from '../context/ActiveStartupContext.jsx';

/**
 * How this venture is doing, and why.
 *
 * Readiness, Risks, Milestones and Analytics were four screens answering
 * variations of the same question, none of them connected. Readiness said
 * "team composition 25%" and never named WHICH open roles caused it. Risks
 * listed team problems without saying they were the reason the score was low.
 * Analytics drew a line with no explanation of what moved it.
 *
 * A founder had to hold four screens in their head and join them themselves.
 * That is work the product should do.
 *
 * This does not replace those four. They still hold the depth. This is the
 * page that tells you which of them to open, and why.
 */

const DIM_COLOR = {
  team_composition: '#7C5CFC',
  idea_clarity: '#4C86F9',
  market_positioning: '#4C86F9',   // pre-rename rows
  product_readiness: '#3FB081',
  funding_readiness: '#F0A84E',
};

const SEVERITY = {
  CRITICAL: { fg: '#E15C4D', bg: '#FDEEF0' },
  HIGH: { fg: '#F0A84E', bg: '#FEF3E8' },
  MEDIUM: { fg: '#C5A93A', bg: '#FFF9E8' },
  LOW: { fg: '#3FB081', bg: '#EAF7F0' },
};

function DimensionCard({ d, isWeakest, index }) {
  const color = DIM_COLOR[d.key] || '#7C5CFC';
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.06, 0.3), ease: [0.16, 1, 0.3, 1] }}
      className={`bg-surface rounded-xl border shadow-card p-6 ${isWeakest ? 'border-amber-300' : 'border-surface-border'}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-[15px] font-semibold text-ink-950">{d.label}</p>
          {isWeakest && (
            <span className="inline-block text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md mt-1">
              Holding you back most
            </span>
          )}
        </div>
        <span className="text-[26px] font-bold leading-none tabular-nums" style={{ color }}>{d.score}</span>
      </div>

      <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden mb-4">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${d.score}%` }}
          transition={{ duration: 0.7, delay: 0.1 + index * 0.05 }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>

      {/* THE POINT OF THIS PAGE. The score names its own causes, from data
          that already existed on three other screens and was never joined. */}
      {d.causeCount === 0 ? (
        <p className="text-[13px] text-ink-500 leading-relaxed">
          Nothing specific is attached to this one. It scored on what your venture says about itself rather than on anything outstanding.
        </p>
      ) : (
        <div className="space-y-2 mb-4">
          <p className="text-[11px] font-semibold tracking-wide uppercase text-ink-300">Why</p>

          {d.causes.gaps.slice(0, 3).map((g) => (
            <p key={g.id} className="text-[13px] text-ink-700 flex gap-2 leading-relaxed">
              <Users size={13} className="text-ink-300 shrink-0 mt-0.5" />
              Nobody covers <span className="font-medium text-ink-900">{g.role}</span>
              {g.priority_level === 'CRITICAL' && <span className="text-signal-critical">· critical</span>}
            </p>
          ))}
          {d.causes.gaps.length > 3 && (
            <p className="text-[12.5px] text-ink-500 pl-[21px]">and {d.causes.gaps.length - 3} more open {d.causes.gaps.length - 3 === 1 ? 'role' : 'roles'}</p>
          )}

          {d.causes.risks.slice(0, 3).map((r) => {
            const sev = SEVERITY[r.severity] || SEVERITY.MEDIUM;
            return (
              <p key={r.id} className="text-[13px] text-ink-700 flex gap-2 leading-relaxed">
                <AlertTriangle size={13} className="shrink-0 mt-0.5" style={{ color: sev.fg }} />
                {r.title}
              </p>
            );
          })}

          {d.causes.milestone && (
            <p className="text-[13px] text-ink-700 flex gap-2 leading-relaxed">
              <Flag size={13} className="text-ink-300 shrink-0 mt-0.5" />
              Next up: <span className="font-medium text-ink-900">{d.causes.milestone.title}</span>
            </p>
          )}
        </div>
      )}

      <Link
        to={d.fixPath}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-violet-700 hover:text-violet-600 transition-colors"
      >
        {d.fixLabel} <ArrowUpRight size={13} />
      </Link>
    </motion.div>
  );
}

export default function Progress() {
  const { activeStartup, loading: startupLoading } = useActiveStartup();
  const [loading, setLoading] = useState(true);
  const [p, setP] = useState(null);

  useEffect(() => {
    async function load() {
      if (startupLoading) return;
      if (!activeStartup) { setLoading(false); return; }
      const { ok, data } = await getProgress(activeStartup.id);
      if (ok && data.success) setP(data.progress);
      setLoading(false);
    }
    load();
  }, [activeStartup?.id, startupLoading]);

  if (loading) {
    return (
      <Shell title="Progress">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" />
        </div>
      </Shell>
    );
  }

  if (!p) {
    return (
      <Shell title="Progress">
        <div className="bg-surface rounded-xl border border-surface-border shadow-card py-16 text-center">
          <p className="text-[15px] text-ink-700 mb-1">No venture yet.</p>
          <p className="text-[13px] text-ink-500">Describe your idea and this will show you where it stands.</p>
        </div>
      </Shell>
    );
  }

  const chart = p.history.map((h) => ({
    score: h.score,
    date: new Date(h.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
  }));

  return (
    <Shell title={p.name} subtitle="Where this venture stands, and what is holding it there">
      <div className="mb-7">
        <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-violet-600 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
          {p.score === null ? 'Never assessed' : p.visibleToInvestors ? 'At the level investors look for' : 'Below what investors typically look for'}
        </p>
        <h1 className="font-editorial italic text-[32px] text-trust-fg leading-tight max-w-3xl">
          {p.score === null
            ? 'Nobody has assessed this venture yet.'
            : p.visibleToInvestors
              ? 'Investors can find you.'
              : `You are ${p.pointsFromVisibility} point${p.pointsFromVisibility === 1 ? '' : 's'} from investors finding you.`}
        </h1>
        <p className="text-[15px] text-ink-700 mt-3 max-w-2xl leading-relaxed">
          {p.score === null
            ? 'Run an assessment from Readiness and this page will show you exactly what is holding the number down.'
            : p.weakest
              ? `${p.weakest.label} is the weakest at ${p.weakest.score}%${p.weakest.causeCount > 0 ? `, and ${p.weakest.causeCount} specific ${p.weakest.causeCount === 1 ? 'thing is' : 'things are'} causing it.` : '.'}`
              : 'Every part of the assessment is holding up.'}
        </p>
      </div>

      {p.score !== null && (
        <>
          {/* THE NUMBER AND ITS HISTORY, together. These were on two separate
              screens, so the score had no context and the line had no
              explanation. */}
          <div className="relative overflow-hidden rounded-xl bg-ink-950 p-8 mb-6">
            <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle at 15% 20%, #7C5CFC 0%, transparent 55%), radial-gradient(circle at 85% 80%, #1F5D52 0%, transparent 55%)' }} />
            <div className="relative grid grid-cols-5 gap-8 items-center">
              <div className="col-span-2">
                <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-mint-500 mb-2">Where you stand</p>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="font-display text-[64px] font-bold text-white leading-none tabular-nums">{p.score}</span>
                  <span className="text-[17px] text-white/50">/ 100</span>
                </div>
                {p.delta !== null && p.delta !== 0 && (
                  <p className="flex items-center gap-1.5 text-[14px] text-white/70">
                    {p.delta > 0 ? <TrendingUp size={15} className="text-mint-500" /> : <TrendingDown size={15} className="text-signal-critical" />}
                    {p.delta > 0 ? `Up ${p.delta}` : `Down ${Math.abs(p.delta)}`} since you started at {p.startedAt}
                  </p>
                )}
                <Link to="/app/investability" className="inline-flex items-center gap-1.5 text-[13px] text-white/60 hover:text-white transition-colors mt-4">
                  <Eye size={14} /> See what an investor sees
                </Link>
              </div>

              <div className="col-span-3">
                {chart.length < 2 ? (
                  <p className="text-[13px] text-white/40 text-center py-8">
                    One assessment so far. A second gives you a direction.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={150}>
                    <AreaChart data={chart} margin={{ top: 8, right: 4, left: -28, bottom: 0 }}>
                      <defs>
                        <linearGradient id="progressFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#7C5CFC" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#7C5CFC" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }} />
                      <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }} />
                      <Tooltip
                        contentStyle={{ borderRadius: 10, border: 'none', fontSize: 13, backgroundColor: '#1a1825', color: '#fff' }}
                        formatter={(v) => [`${v}`, 'Readiness']}
                      />
                      <ReferenceLine y={p.investorBar} stroke="#3FB081" strokeDasharray="4 4" />
                      <Area type="monotone" dataKey="score" stroke="#7C5CFC" strokeWidth={2.5} fill="url(#progressFill)" dot={{ fill: '#7C5CFC', r: 3 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-baseline justify-between mb-3">
              <div>
                <h2 className="text-[15px] font-semibold text-ink-900">What makes up that number</h2>
                <p className="text-[13px] text-ink-500 mt-0.5">Weakest first, each one naming what is actually causing it.</p>
              </div>
              <Link to="/app/readiness" className="text-[13px] text-ink-500 hover:text-violet-600 transition-colors">Re-assess</Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {p.dimensions.map((d, i) => (
                <DimensionCard key={d.key} d={d} isWeakest={i === 0} index={i} />
              ))}
            </div>
          </div>
        </>
      )}

      {p.criticalIssues.length > 0 && (
        <div>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-[15px] font-semibold text-ink-900">What an investor would ask about first</h2>
            <Link to="/app/risk" className="text-[13px] text-ink-500 hover:text-violet-600 transition-colors">All risks</Link>
          </div>
          <div className="bg-surface rounded-xl border border-surface-border shadow-card divide-y divide-surface-border">
            {p.criticalIssues.map((issue) => (
              <div key={issue} className="flex items-start gap-3 p-5">
                <AlertTriangle size={15} className="text-signal-critical shrink-0 mt-0.5" />
                <p className="text-[14px] text-ink-700 leading-relaxed">{issue}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <VentureAssistant startupId={activeStartup?.id} startupName={p.name} />
    </Shell>
  );
}
