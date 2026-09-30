import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Eye, ArrowRight } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import Trajectory from '../components/Trajectory.jsx';
import { getProgress } from '../services/startups.js';
import { useActiveStartup } from '../context/ActiveStartupContext.jsx';

/**
 * A PROPOSAL, not a replacement. Same page, same data, same components,
 * different visual language, so the two can be compared side by side rather
 * than described.
 *
 * THE ARGUMENT. This product's character is already in its writing. It says
 * "no open role fits you", "we cannot measure product-market fit", "this is
 * our judgement, not data". Nothing else in this space tells people
 * uncomfortable things. But it looks like every other B2B dashboard: violet
 * on cold white, every element in a soft-shadowed card, every heading the
 * same size, so nothing on any page is louder than anything else.
 *
 * So the look should match the voice: a serious instrument that tells you the
 * truth, closer to a well-set report than to a SaaS product.
 *
 * FOUR CHANGES, each doing real work:
 *
 *   Warm paper instead of cold white. Off-white reads as considered; pure
 *   white with a blue-grey shadow reads as a template.
 *
 *   One accent instead of eight. The old palette carries violet, trust
 *   purple, blue, amber, rose, mint, forest and four signal colours, so
 *   colour means nothing. Here green means good, and the only other colours
 *   are warning and stop.
 *
 *   Hairline borders instead of shadows. Shadow everywhere flattens
 *   hierarchy, because if every card floats then none does.
 *
 *   Real size contrast. The score is enormous and set in the serif; labels
 *   are small and quiet. A page should have a loudest thing on it.
 */

const label = 'text-[10.5px] font-semibold tracking-[0.16em] uppercase text-graphite-400';

export default function ProgressProposal() {
  const { activeStartup, loading: startupLoading } = useActiveStartup();
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!activeStartup) { setLoading(false); return; }
      const { ok, data } = await getProgress(activeStartup.id);
      if (ok && data.success) setP(data.progress);
      setLoading(false);
    }
    if (!startupLoading) load();
  }, [activeStartup, startupLoading]);

  if (loading || startupLoading) {
    return (
      <Shell persona="FOUNDER" title="Progress">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-paper-line border-t-deep animate-spin" />
        </div>
      </Shell>
    );
  }

  if (!p) {
    return (
      <Shell persona="FOUNDER" title="Progress">
        <div className="bg-paper-raised rounded-lg border border-paper-line py-16 text-center">
          <p className="text-[15px] text-graphite-600">Nothing to show yet.</p>
        </div>
      </Shell>
    );
  }

  const chart = (p.history || []).map((h) => ({
    date: new Date(h.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    score: Math.round(parseFloat(h.score)),
  }));

  return (
    <Shell persona="FOUNDER" title="Progress" subtitle={activeStartup?.name}>
      {/* The page is set on paper, not on a grey canvas holding white cards. */}
      <div className="-mx-8 -mt-6 px-8 pt-8 pb-10 bg-paper min-h-screen">

        {/* ONE LOUD THING. The score is the page, at a size the old layout
            never allowed, set in the serif so it reads as a considered
            figure rather than a metric tile. */}
        <div className="grid grid-cols-12 gap-10 items-end pb-9 mb-9 border-b border-paper-edge">
          <div className="col-span-5">
            <p className={label}>Readiness</p>
            <div className="flex items-baseline gap-3 mt-2">
              <span className="font-editorial text-[92px] leading-[0.85] text-graphite-950 tabular-nums">
                {p.score}
              </span>
              <span className="text-[15px] text-graphite-400 pb-2">of 100</span>
            </div>

            {p.delta !== null && p.delta !== 0 && (
              <p className="flex items-center gap-2 text-[14px] text-graphite-600 mt-4">
                {p.delta > 0
                  ? <TrendingUp size={15} className="text-deep" />
                  : <TrendingDown size={15} className="text-flag-stop" />}
                {p.delta > 0 ? `Up ${p.delta}` : `Down ${Math.abs(p.delta)}`} since {p.startedAt}
              </p>
            )}

            <Link
              to="/app/investability"
              className="inline-flex items-center gap-1.5 text-[13.5px] text-deep hover:text-deep-deep transition-colors mt-5 border-b border-deep-line pb-0.5"
            >
              <Eye size={14} /> See what an investor sees
            </Link>
          </div>

          <div className="col-span-7">
            {chart.length < 2 ? (
              <p className="text-[13px] text-graphite-400 py-10">
                One assessment so far. A second gives you a direction.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={168}>
                <AreaChart data={chart} margin={{ top: 10, right: 4, left: -26, bottom: 0 }}>
                  <defs>
                    <linearGradient id="proposalFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1F5D52" stopOpacity={0.16} />
                      <stop offset="100%" stopColor="#1F5D52" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8B8779' }} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8B8779' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 6, border: '1px solid #E5E1D8', fontSize: 13, backgroundColor: '#FFFFFF', color: '#14130F', boxShadow: 'none' }}
                    formatter={(v) => [`${v}`, 'Readiness']}
                  />
                  <ReferenceLine y={p.investorBar} stroke="#D6D1C4" strokeDasharray="3 3" />
                  <Area type="monotone" dataKey="score" stroke="#1F5D52" strokeWidth={2} fill="url(#proposalFill)" dot={{ fill: '#1F5D52', r: 2.5 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="mb-9">
          <Trajectory startupId={activeStartup?.id} compact />
        </div>

        {/* DIMENSIONS AS A LEDGER, not four floating tiles. Ruled rows read as
            a document somebody stands behind. */}
        <div className="mb-3 flex items-baseline justify-between">
          <div>
            <h2 className="font-editorial text-[22px] text-graphite-950">What makes up that number</h2>
            <p className="text-[13.5px] text-graphite-600 mt-1">Weakest first, each naming what is causing it.</p>
          </div>
          <Link to="/app/readiness" className="text-[13px] text-graphite-400 hover:text-deep transition-colors">Re-assess</Link>
        </div>

        <div className="bg-paper-raised rounded-lg border border-paper-line overflow-hidden">
          {(p.dimensions || []).map((d, i) => (
            <motion.div
              key={d.key}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.2) }}
              className={`px-7 py-6 ${i > 0 ? 'border-t border-paper-line' : ''}`}
            >
              <div className="flex items-baseline justify-between gap-6 mb-3">
                <p className="text-[15px] font-medium text-graphite-950">{d.label}</p>
                <span className="font-editorial text-[26px] text-graphite-950 tabular-nums leading-none">
                  {d.score}<span className="text-[14px] text-graphite-400">%</span>
                </span>
              </div>

              {/* A ruled bar, not a rounded pill. */}
              <div className="h-[3px] bg-paper-sunk mb-3">
                <div
                  className="h-full transition-all duration-500"
                  style={{ width: `${d.score}%`, backgroundColor: d.score < 40 ? '#B0453A' : d.score < 70 ? '#B4762A' : '#1F5D52' }}
                />
              </div>

              {d.cause && <p className="text-[13.5px] text-graphite-600 leading-relaxed">{d.cause}</p>}

              {d.fixPath && (
                <Link to={d.fixPath} className="inline-flex items-center gap-1.5 text-[13px] text-deep hover:text-deep-deep transition-colors mt-2.5">
                  {d.fixLabel || 'Work on this'} <ArrowRight size={13} />
                </Link>
              )}
            </motion.div>
          ))}
        </div>

        <p className="text-[12.5px] text-graphite-400 mt-8 max-w-2xl leading-relaxed">
          This is a proposal for how the product could look. Same page, same data,
          same components. Compare it against Grow → Progress.
        </p>
      </div>
    </Shell>
  );
}
