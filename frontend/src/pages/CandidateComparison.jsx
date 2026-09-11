import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, MessageSquare, Check, Minus } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import { rankCandidates, startConversation } from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';

/**
 * Two or three people, side by side.
 *
 * This was a six-column table of percentages. Reading it meant comparing
 * numbers in your head across rows, and the column that mattered most,
 * whether this person actually wants what you are building, was not there at
 * all even though the engine computes it.
 *
 * Each candidate is now a column and each criterion a row, with the leader
 * on every row marked, so the comparison is done for you rather than
 * presented as homework.
 */

const CRITERIA = [
  { key: 'skillFit', label: 'Has the skills' },
  { key: 'roleFit', label: 'Holds this role' },
  { key: 'alignmentFit', label: 'Wants this' },
  { key: 'experienceFit', label: 'Experience' },
  { key: 'domainFit', label: 'Knows the field' },
  { key: 'stageFit', label: 'Wants this stage' },
];

const pctOf = (c, key) => {
  const v = c.score_breakdown?.[key];
  return typeof v === 'number' ? Math.round(v * 100) : null;
};

export default function CandidateComparison() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const gapId = searchParams.get('gap');
  const startupId = searchParams.get('startup');
  const showToast = useToast();
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState([]);

  useEffect(() => {
    async function load() {
      if (!gapId) { setLoading(false); return; }
      const { ok, data } = await rankCandidates(gapId);
      if (ok && data.success) setCandidates(data.recommendations);
      setLoading(false);
    }
    load();
  }, [gapId]);

  async function handleConnect(c) {
    const { ok, data } = await startConversation(c.target_user_id, { startupId, gapId });
    if (ok && data.success) navigate(`/app/inbox/${data.conversation.id}`);
    else showToast(data.error || 'Could not start a conversation.', 'error');
  }

  if (loading) {
    return (
      <Shell title="Side by side">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" />
        </div>
      </Shell>
    );
  }

  const shown = candidates.slice(0, 4);
  const best = shown[0] || null;

  const leaders = {};
  for (const c of CRITERIA) {
    let bestVal = -1, bestId = null;
    for (const cand of shown) {
      const v = pctOf(cand, c.key);
      if (v !== null && v > bestVal) { bestVal = v; bestId = cand.id; }
    }
    if (bestVal > 0) leaders[c.key] = bestId;
  }

  const backTo = gapId && startupId ? `/app/gaps/${gapId}?startup=${startupId}` : '/app/gaps';

  return (
    <Shell title="Side by side" subtitle="The same questions asked of each person">
      <Link to={backTo} className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition-colors mb-6">
        <ArrowLeft size={15} /> Back to the role
      </Link>

      <div className="mb-7">
        <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-violet-600 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
          {shown.length === 0 ? 'Nobody to compare' : `${shown.length} side by side`}
        </p>
        <h1 className="font-editorial italic text-[32px] text-trust-fg leading-tight max-w-3xl">
          {best ? `${best.candidate_headline} leads, but not on everything.` : 'Nobody has been ranked for this role yet.'}
        </h1>
        <p className="text-[15px] text-ink-700 mt-3 max-w-2xl leading-relaxed">
          {shown.length === 0
            ? 'Search for people on the role page first and they will appear here to compare.'
            : 'A single percentage is a poor way to choose who to build with. These are the parts that number is made of.'}
        </p>
      </div>

      {shown.length === 0 ? (
        <div className="bg-surface rounded-xl border border-surface-border shadow-card py-16 text-center">
          <p className="text-[15px] text-ink-700 mb-1">Nobody ranked for this role yet.</p>
          <p className="text-[13px] text-ink-500 mb-6">Go back and search, then come here to weigh them up.</p>
          <Link to={backTo} className="inline-flex items-center gap-2 text-[13px] font-medium bg-ink-900 hover:bg-ink-700 text-white px-5 py-2.5 rounded-full transition-colors">
            Back to the role
          </Link>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-surface-border shadow-card overflow-hidden">
          <div className="grid border-b border-surface-border" style={{ gridTemplateColumns: `180px repeat(${shown.length}, 1fr)` }}>
            <div className="p-5" />
            {shown.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.06 }}
                className={`p-5 border-l border-surface-border ${i === 0 ? 'bg-violet-50/40' : ''}`}
              >
                <Link
                  to={`/app/profile/${c.target_user_id}?startupId=${startupId}&gapId=${gapId}`}
                  className="text-[14.5px] font-semibold text-ink-950 hover:text-violet-700 transition-colors leading-snug block"
                >
                  {c.candidate_headline}
                </Link>
                <div className="flex items-baseline gap-1 mt-2.5">
                  <span className="text-[24px] font-bold text-violet-700 leading-none tabular-nums">
                    {Math.round(parseFloat(c.score) * 100)}
                  </span>
                  <span className="text-[12px] text-ink-500">% overall</span>
                </div>
              </motion.div>
            ))}
          </div>

          {CRITERIA.map((crit, ri) => {
            if (!shown.some((c) => pctOf(c, crit.key) !== null)) return null;
            return (
              <div key={crit.key} className="grid border-b border-surface-border" style={{ gridTemplateColumns: `180px repeat(${shown.length}, 1fr)` }}>
                <div className="p-5 flex items-center">
                  <span className="text-[13px] font-medium text-ink-700">{crit.label}</span>
                </div>
                {shown.map((c, i) => {
                  const v = pctOf(c, crit.key);
                  const isLeader = leaders[crit.key] === c.id && v !== null && v > 0;
                  return (
                    <div key={c.id} className={`p-5 border-l border-surface-border ${i === 0 ? 'bg-violet-50/40' : ''}`}>
                      {v === null ? (
                        <span className="flex items-center gap-1.5 text-[13px] text-ink-300"><Minus size={13} /> not measured</span>
                      ) : (
                        <>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="text-[14px] font-semibold tabular-nums" style={{ color: isLeader ? '#1F5D52' : '#3E4047' }}>{v}%</span>
                            {isLeader && (
                              <span className="flex items-center gap-1 text-[10.5px] font-semibold text-mint-500"><Check size={11} /> best</span>
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

          <div className="grid" style={{ gridTemplateColumns: `180px repeat(${shown.length}, 1fr)` }}>
            <div className="p-5" />
            {shown.map((c, i) => (
              <div key={c.id} className={`p-5 border-l border-surface-border ${i === 0 ? 'bg-violet-50/40' : ''}`}>
                <button
                  onClick={() => handleConnect(c)}
                  className="w-full flex items-center justify-center gap-1.5 bg-ink-900 hover:bg-ink-700 text-white px-4 py-2 rounded-full text-[13px] font-medium transition-colors"
                >
                  <MessageSquare size={13} /> Message
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </Shell>
  );
}
