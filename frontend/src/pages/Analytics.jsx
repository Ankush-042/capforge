import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts';
import { TrendingUp, TrendingDown, ShieldCheck, ArrowUpRight, Activity } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import MetricTile, { TILE_PALETTE } from '../components/charts/MetricTile.jsx';
import { getReadinessHistory } from '../services/startups.js';
import { useActiveStartup } from '../context/ActiveStartupContext.jsx';

/**
 * How it is going.
 *
 * One chart in a box headed 'Analytics'. The data was real and the page did
 * nothing with it. A line going from 31 to 43 is a story, and the page
 * rendered it as a shape.
 *
 * The investor threshold is now drawn on the chart itself, so the trajectory
 * reads as a distance to something rather than an abstract climb, and the
 * consistency signal is framed as what it is: evidence the diagnosis is not
 * noise, which is the reason to trust anything else in this product.
 */

const INVESTOR_BAR = 35;

export default function Analytics() {
  const { activeStartup, loading: startupLoading } = useActiveStartup();
  const [loading, setLoading] = useState(true);
  const [startup, setStartup] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    async function load() {
      if (startupLoading) return;
      if (activeStartup) {
        setStartup(activeStartup);
        const res = await getReadinessHistory(activeStartup.id);
        if (res.ok && res.data.success) {
          setHistory(res.data.history.map((h, i) => ({
            point: `#${i + 1}`,
            score: Math.round(parseFloat(h.overall_score)),
            date: new Date(h.generated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
          })));
        }
      }
      setLoading(false);
    }
    load();
  }, [activeStartup?.id, startupLoading]);

  if (loading) {
    return (
      <Shell title="How it is going">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" />
        </div>
      </Shell>
    );
  }

  const scores = history.map((h) => h.score);
  const first = scores[0] ?? null;
  const latest = scores[scores.length - 1] ?? null;
  const delta = first !== null && latest !== null ? latest - first : null;
  const lastDelta = scores.length >= 2 ? latest - scores[scores.length - 2] : null;
  const best = scores.length > 0 ? Math.max(...scores) : null;
  const spread = scores.length >= 2 ? Math.max(...scores) - Math.min(...scores) : 0;
  const stable = spread <= 10;
  const visible = latest !== null && latest >= INVESTOR_BAR;

  return (
    <Shell title={startup?.name || 'How it is going'} subtitle="Every assessment, over time">
      <div className="mb-7">
        <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-violet-600 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
          {history.length === 0 ? 'Nothing recorded yet' : `${history.length} assessment${history.length === 1 ? '' : 's'}`}
        </p>
        <h1 className="font-editorial italic text-[32px] text-trust-fg leading-tight max-w-3xl">
          {history.length < 2
            ? 'Not enough history to see a trend yet.'
            : delta > 0
              ? `You started at ${first}. You are at ${latest}.`
              : delta < 0
                ? `You have come down from ${first} to ${latest}.`
                : `You have held at ${latest} since the start.`}
        </h1>
        <p className="text-[15px] text-ink-700 mt-3 max-w-2xl leading-relaxed">
          {history.length < 2
            ? 'Re-assess your venture from Readiness a few times and a real trend line builds here. Nothing on this page is projected or estimated.'
            : delta > 0
              ? 'Every point came from something real: people joining, roles filled, risks closed. Nothing here moves on its own.'
              : 'The number tracks what is actually true about the venture, which means it can go down as well as up.'}
        </p>
      </div>

      {history.length === 0 ? (
        <div className="bg-surface rounded-xl border border-surface-border shadow-card py-16 text-center">
          <Activity size={22} className="text-ink-300 mx-auto mb-3" />
          <p className="text-[15px] text-ink-700 mb-1">No assessments yet.</p>
          <p className="text-[13px] text-ink-500 mb-6 max-w-sm mx-auto">
            Each time your venture is assessed, a point lands here. Two or more and you can see the direction.
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
          <div className="grid grid-cols-4 gap-4 mb-8">
            <MetricTile
              label="Now" value={latest} unit={`/ ${INVESTOR_BAR}+`}
              icon={Activity} to="/app/readiness" {...TILE_PALETTE.lavender}
              progress={Math.min(100, (latest / INVESTOR_BAR) * 100)}
              caption={visible ? 'Visible to investors' : `${INVESTOR_BAR - latest} from visibility`}
            />
            <MetricTile
              label="Since you started"
              value={delta === null ? '—' : delta >= 0 ? `+${delta}` : delta}
              icon={delta !== null && delta < 0 ? TrendingDown : TrendingUp}
              {...TILE_PALETTE.blue}
              caption={first !== null ? `Started at ${first}` : 'Not enough history'}
            />
            <MetricTile
              label="Last move"
              value={lastDelta === null ? '—' : lastDelta >= 0 ? `+${lastDelta}` : lastDelta}
              icon={lastDelta !== null && lastDelta < 0 ? TrendingDown : TrendingUp}
              {...TILE_PALETTE.peach}
              caption={lastDelta === null ? 'Needs two assessments' : lastDelta === 0 ? 'No change' : 'Since the one before'}
            />
            <MetricTile
              label="Best" value={best}
              icon={TrendingUp} {...TILE_PALETTE.cream}
              caption={best === latest ? 'You are at your highest' : `Currently ${best - latest} below it`}
            />
          </div>

          <div className="mb-5">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-[15px] font-semibold text-ink-900">Readiness over time</h2>
              <span className="text-[13px] text-ink-500">Real assessments only</span>
            </div>
            <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
              {history.length < 2 ? (
                <div className="py-12 text-center">
                  <p className="text-[14px] text-ink-700 mb-1">One assessment so far.</p>
                  <p className="text-[13px] text-ink-500">A second one gives you a direction.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={history} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="readinessFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7C5CFC" stopOpacity={0.22} />
                        <stop offset="100%" stopColor="#7C5CFC" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6E7079' }} />
                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6E7079' }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 10, border: '1px solid #E4E3EC', fontSize: 13, boxShadow: '0 2px 8px rgba(24,22,40,0.08)' }}
                      formatter={(v) => [`${v}`, 'Readiness']}
                    />
                    {/* The threshold on the chart itself. Without it the line
                        is an abstract climb rather than a distance to the
                        thing the founder actually wants. */}
                    <ReferenceLine
                      y={INVESTOR_BAR}
                      stroke="#3FB081"
                      strokeDasharray="4 4"
                      label={{ value: 'investors look here', position: 'insideTopRight', fill: '#1F5D52', fontSize: 11 }}
                    />
                    <Area type="monotone" dataKey="score" stroke="#7C5CFC" strokeWidth={2.5} fill="url(#readinessFill)" dot={{ fill: '#7C5CFC', r: 3 }} activeDot={{ r: 5 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {history.length >= 2 && (
            <div>
              <h2 className="text-[15px] font-semibold text-ink-900 mb-3">Can you trust this number?</h2>
              <div
                className="rounded-xl border shadow-card p-6 flex items-start gap-3.5"
                style={{
                  backgroundColor: stable ? '#EAF7F0' : '#FEF3E8',
                  borderColor: stable ? '#BFE5D3' : '#F6D9B4',
                }}
              >
                <ShieldCheck size={17} className="shrink-0 mt-0.5" style={{ color: stable ? '#1F5D52' : '#B87A2A' }} />
                <div>
                  <p className="text-[14.5px] font-semibold mb-1" style={{ color: stable ? '#1F5D52' : '#8A5A1E' }}>
                    {stable ? 'This has held steady' : 'This has moved meaningfully'}
                  </p>
                  <p className="text-[13.5px] leading-relaxed" style={{ color: stable ? '#2C6B5E' : '#8A5A1E' }}>
                    Across {history.length} assessments the score has varied by {spread} point{spread === 1 ? '' : 's'}.
                    {stable
                      ? ' That consistency is the evidence that this is a real reading of your venture rather than a number that changes every time you press the button.'
                      : ' Gap diagnosis is deterministic on the same underlying data, so a shift this size reflects the venture genuinely changing, not the measurement being unreliable.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </Shell>
  );
}
