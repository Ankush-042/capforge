import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, Minus, UserPlus, Rocket, Check } from 'lucide-react';
import { getTrajectory } from '../services/startups.js';

/**
 * The movement, and what caused it.
 *
 * A single number tells an investor almost nothing. 48 reached last week and
 * 48 unchanged since June are completely different propositions.
 *
 * DRAWN, NOT CHARTED. A readiness history has three or four points, and a
 * chart library rendering four points produces something that looks like data
 * and reads like decoration. A plain line with the events marked on it says
 * more and is honest about how little data there is.
 *
 * Every event is a real row. Where a change has no event in its window it is
 * shown without a cause rather than given one.
 */

const EVENT_ICON = {
  JOINED: { Icon: UserPlus, color: '#7C5CFC' },
  LAUNCHED: { Icon: Rocket, color: '#1677E8' },
  ROLE_FILLED: { Icon: Check, color: '#3FB081' },
};

function when(iso) {
  const d = Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 30) return `${d} days ago`;
  const m = Math.round(d / 30);
  return m === 1 ? 'a month ago' : `${m} months ago`;
}

export default function Trajectory({ startupId, compact }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!startupId) return;
    getTrajectory(startupId).then(({ ok, data: d }) => {
      if (ok && d.success) setData(d);
      setLoading(false);
    });
  }, [startupId]);

  if (loading || !data) return null;

  const { points, changes, summary, staleDays, events } = data;
  const climb = points.length > 1 ? points[points.length - 1].score - points[0].score : 0;
  const Icon = climb > 0 ? TrendingUp : climb < 0 ? TrendingDown : Minus;
  const tone = climb > 0 ? '#3FB081' : climb < 0 ? '#E15C4D' : '#8A8A99';

  // A simple polyline. Four points do not need a charting library, and one
  // would make three measurements look like a dataset.
  const W = 520, H = 90, PAD = 6;
  const max = Math.max(60, ...points.map((p) => p.score));
  const coords = points.map((p, i) => {
    const x = points.length === 1 ? W / 2 : PAD + (i * (W - PAD * 2)) / (points.length - 1);
    const y = H - PAD - (p.score / max) * (H - PAD * 2);
    return { x, y, ...p };
  });

  return (
    <div className="bg-surface rounded-xl border border-surface-border shadow-card p-6">
      <div className="flex items-start justify-between gap-4 mb-1">
        <p className="text-[15px] font-semibold text-ink-950">How this venture has moved</p>
        <span className="flex items-center gap-1.5 text-[13px] font-medium shrink-0" style={{ color: tone }}>
          <Icon size={14} />
          {climb > 0 ? `+${climb}` : climb < 0 ? climb : 'flat'}
        </span>
      </div>
      <p className="text-[13px] text-ink-600 leading-relaxed">{summary}</p>

      {points.length > 1 && (
        <div className="mt-5">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 90 }}>
            <polyline
              points={coords.map((c) => `${c.x},${c.y}`).join(' ')}
              fill="none" stroke={tone} strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
            />
            {coords.map((c, i) => (
              <g key={i}>
                <circle cx={c.x} cy={c.y} r="3.5" fill="#FFFFFF" stroke={tone} strokeWidth="2" />
                <text x={c.x} y={c.y - 10} textAnchor="middle" className="fill-ink-700" style={{ fontSize: 11, fontWeight: 600 }}>
                  {c.score}
                </text>
              </g>
            ))}
          </svg>
          <div className="flex items-center justify-between text-[11.5px] text-ink-300 -mt-1">
            <span>{when(points[0].at)}</span>
            <span>{when(points[points.length - 1].at)}</span>
          </div>
        </div>
      )}

      {/* The part that matters: what actually caused each move. */}
      {changes.length > 0 && (
        <div className="mt-5 pt-5 border-t border-surface-border space-y-3.5">
          {changes.slice(-3).reverse().map((c, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: i * 0.05 }}
            >
              <p className="text-[13.5px] font-medium text-ink-900">
                {c.from} to {c.to}
                <span className="ml-1.5 font-normal" style={{ color: c.delta > 0 ? '#1F5D52' : '#E15C4D' }}>
                  {c.delta > 0 ? `+${c.delta}` : c.delta}
                </span>
                <span className="ml-2 text-[12px] font-normal text-ink-300">{when(c.at)}</span>
              </p>
              {c.because.length > 0 ? (
                <div className="mt-1 space-y-1">
                  {c.because.map((b, j) => {
                    const e = EVENT_ICON[b.kind] || EVENT_ICON.JOINED;
                    return (
                      <p key={j} className="flex items-start gap-2 text-[13px] text-ink-700 leading-snug">
                        <e.Icon size={12.5} style={{ color: e.color }} className="shrink-0 mt-0.5" />
                        {b.text}
                      </p>
                    );
                  })}
                </div>
              ) : (
                // Said plainly. Inventing a cause here would be the easiest
                // and worst thing this component could do.
                <p className="text-[12.5px] text-ink-300 mt-0.5">Nothing recorded here explains this change.</p>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {!compact && events.length > 0 && changes.length === 0 && (
        <div className="mt-5 pt-5 border-t border-surface-border space-y-2">
          <p className="text-[12px] text-ink-500 mb-1">What has happened</p>
          {events.slice(-4).reverse().map((e, i) => {
            const ic = EVENT_ICON[e.kind] || EVENT_ICON.JOINED;
            return (
              <p key={i} className="flex items-start gap-2 text-[13px] text-ink-700 leading-snug">
                <ic.Icon size={12.5} style={{ color: ic.color }} className="shrink-0 mt-0.5" />
                {e.text}
                <span className="text-[12px] text-ink-300 shrink-0">{when(e.at)}</span>
              </p>
            );
          })}
        </div>
      )}

      {staleDays !== null && staleDays > 21 && (
        <p className="text-[12.5px] text-ink-500 mt-4 pt-4 border-t border-surface-border leading-relaxed">
          Last measured {staleDays} days ago. A venture can look static simply because nobody has
          reassessed it.
        </p>
      )}
    </div>
  );
}
