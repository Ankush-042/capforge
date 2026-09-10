import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowUpRight, Check, Minus } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import { apiFetch } from '../services/api.js';

/**
 * Weighing them up.
 *
 * This was a table: startup, role, type, stage, match. Five columns of text
 * that let you READ five options but not COMPARE them. Nothing showed which
 * was strongest on what, so the only usable column was the percentage, and
 * a single number is exactly what a decision like this should not come down
 * to.
 *
 * A comparison is only useful when the same criteria are visible across
 * every option at once, and when the best on each criterion is obvious. So
 * each venture is a column, each criterion a row, and the leader on every
 * row is marked.
 */

const CRITERIA = [
  { key: 'skillFit', label: 'Your skills fit' },
  { key: 'roleFit', label: 'The role fits you' },
  { key: 'alignmentFit', label: 'You want this' },
  { key: 'domainFit', label: 'Your field' },
  { key: 'stageFit', label: 'Your stage' },
];

function pctOf(offer, key) {
  const v = offer.score_breakdown?.[key];
  return typeof v === 'number' ? Math.round(v * 100) : null;
}

function groupByStartup(offers) {
  const groups = new Map();
  for (const o of offers) {
    if (!groups.has(o.startup_id)) {
      groups.set(o.startup_id, {
        startup_id: o.startup_id,
        startup_name: o.startup_name,
        stage: o.stage,
        domain: o.domain,
        roles: [],
      });
    }
    groups.get(o.startup_id).roles.push(o);
  }
  return [...groups.values()]
    .map((g) => ({ ...g, roles: g.roles.sort((a, b) => parseFloat(b.score) - parseFloat(a.score)) }))
    .sort((a, b) => parseFloat(b.roles[0].score) - parseFloat(a.roles[0].score));
}

export default function MultiOfferComparison() {
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState([]);

  useEffect(() => {
    apiFetch('/offers/compare').then(({ ok, data }) => {
      if (ok && data.success) setOffers(data.offers);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <Shell persona="CONTRIBUTOR" title="Weighing them up">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" />
        </div>
      </Shell>
    );
  }

  const grouped = groupByStartup(offers);
  const shown = grouped.slice(0, 4);
  const best = shown[0] || null;

  // The leader on each criterion, so a column can be marked rather than
  // leaving someone to eyeball five numbers per row.
  const leaders = {};
  for (const c of CRITERIA) {
    let bestVal = -1;
    let bestId = null;
    for (const g of shown) {
      const v = pctOf(g.roles[0], c.key);
      if (v !== null && v > bestVal) { bestVal = v; bestId = g.startup_id; }
    }
    if (bestVal > 0) leaders[c.key] = bestId;
  }

  return (
    <Shell persona="CONTRIBUTOR" title="Weighing them up" subtitle="The same questions asked of every option">
      <div className="mb-7">
        <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-violet-600 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
          {grouped.length === 0 ? 'Nothing to compare' : `${grouped.length} on the table`}
        </p>
        <h1 className="font-editorial italic text-[32px] text-trust-fg leading-tight max-w-3xl">
          {best ? `${best.startup_name} leads, but not on everything.` : 'Nothing to weigh up yet.'}
        </h1>
        <p className="text-[15px] text-ink-700 mt-3 max-w-2xl leading-relaxed">
          {grouped.length === 0
            ? 'Once ventures start matching you, this is where you decide between them.'
            : 'A single percentage is a poor way to choose where to spend years. These are the parts that number is made of, asked of every option.'}
        </p>
      </div>

      {grouped.length === 0 ? (
        <div className="bg-surface rounded-xl border border-surface-border shadow-card py-16 text-center">
          <p className="text-[15px] text-ink-700 mb-1">Nothing to compare yet.</p>
          <p className="text-[13px] text-ink-500 mb-6 max-w-sm mx-auto">
            Ventures appear here as they start matching you.
          </p>
          <Link
            to="/app/contributor/opportunities"
            className="inline-flex items-center gap-2 text-[13px] font-medium bg-ink-900 hover:bg-ink-700 text-white px-5 py-2.5 rounded-full transition-colors"
          >
            See opportunities <ArrowUpRight size={14} />
          </Link>
        </div>
      ) : (
        <>
          <div className="bg-surface rounded-xl border border-surface-border shadow-card overflow-hidden">
            {/* HEADERS — each venture is a column */}
            <div className="grid border-b border-surface-border" style={{ gridTemplateColumns: `180px repeat(${shown.length}, 1fr)` }}>
              <div className="p-5" />
              {shown.map((g, i) => (
                <motion.div
                  key={g.startup_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.06 }}
                  className={`p-5 border-l border-surface-border ${i === 0 ? 'bg-violet-50/40' : ''}`}
                >
                  <Link to={`/app/startups/${g.startup_id}`} className="text-[15px] font-semibold text-ink-950 hover:text-violet-700 transition-colors leading-snug block">
                    {g.startup_name}
                  </Link>
                  <p className="text-[12px] text-ink-500 mt-1 truncate">{g.roles[0].gap_role}</p>
                  <div className="flex items-baseline gap-1 mt-2.5">
                    <span className="text-[24px] font-bold text-violet-700 leading-none tabular-nums">
                      {Math.round(parseFloat(g.roles[0].score) * 100)}
                    </span>
                    <span className="text-[12px] text-ink-500">% overall</span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* CRITERIA ROWS */}
            {CRITERIA.map((c, ri) => {
              const anyValue = shown.some((g) => pctOf(g.roles[0], c.key) !== null);
              if (!anyValue) return null;
              return (
                <div
                  key={c.key}
                  className="grid border-b border-surface-border last:border-0"
                  style={{ gridTemplateColumns: `180px repeat(${shown.length}, 1fr)` }}
                >
                  <div className="p-5 flex items-center">
                    <span className="text-[13px] font-medium text-ink-700">{c.label}</span>
                  </div>
                  {shown.map((g, i) => {
                    const v = pctOf(g.roles[0], c.key);
                    const isLeader = leaders[c.key] === g.startup_id && v !== null && v > 0;
                    return (
                      <div key={g.startup_id} className={`p-5 border-l border-surface-border ${i === 0 ? 'bg-violet-50/40' : ''}`}>
                        {v === null ? (
                          <span className="flex items-center gap-1.5 text-[13px] text-ink-300"><Minus size={13} /> not measured</span>
                        ) : (
                          <>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="text-[14px] font-semibold tabular-nums" style={{ color: isLeader ? '#1F5D52' : '#3E4047' }}>
                                {v}%
                              </span>
                              {isLeader && (
                                <span className="flex items-center gap-1 text-[10.5px] font-semibold text-mint-500">
                                  <Check size={11} /> best
                                </span>
                              )}
                            </div>
                            <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${v}%` }}
                                transition={{ duration: 0.6, delay: 0.1 + ri * 0.05 }}
                                className="h-full rounded-full"
                                style={{ backgroundColor: isLeader ? '#3FB081' : '#A7A9B1' }}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* WHAT EACH IS ACTUALLY OFFERING */}
            <div className="grid border-t border-surface-border" style={{ gridTemplateColumns: `180px repeat(${shown.length}, 1fr)` }}>
              <div className="p-5 flex items-start">
                <span className="text-[13px] font-medium text-ink-700">Roles open to you</span>
              </div>
              {shown.map((g, i) => (
                <div key={g.startup_id} className={`p-5 border-l border-surface-border ${i === 0 ? 'bg-violet-50/40' : ''}`}>
                  <div className="flex flex-wrap gap-1.5">
                    {g.roles.slice(0, 3).map((r) => (
                      <span key={r.id} className="text-[11px] px-2 py-1 rounded-md bg-surface-muted text-ink-700">
                        {r.gap_role}
                      </span>
                    ))}
                  </div>
                  {g.stage && <p className="text-[12px] text-ink-500 mt-2.5">{g.stage} stage</p>}
                </div>
              ))}
            </div>
          </div>

          {grouped.length > shown.length && (
            <p className="text-[13px] text-ink-500 mt-4">
              Showing your top {shown.length}. {grouped.length - shown.length} more in{' '}
              <Link to="/app/contributor/opportunities" className="text-violet-700 hover:text-violet-600 transition-colors">Opportunities</Link>.
            </p>
          )}
        </>
      )}
    </Shell>
  );
}
