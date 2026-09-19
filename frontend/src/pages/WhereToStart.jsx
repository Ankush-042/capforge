import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { MessageSquare, ArrowUpRight, Check, AlertTriangle, Users } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import VentureAssistant from '../components/VentureAssistant.jsx';
import { getWhereToStart, startConversation } from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';

/**
 * Which conversation to start first.
 *
 * The founder side got this for roles. A contributor with five interested
 * ventures had Compare, which weighs them on criteria, but nothing that says
 * start here and why.
 *
 * THE INSIGHT IS DIFFERENT FROM THE FOUNDER'S. For a founder the question is
 * what can I move. For a contributor it is where do I matter most, which is
 * not the same as where do I fit best.
 *
 * The piece they genuinely cannot see anywhere else: how many other people fit
 * the same role. Being one of eight candidates is a completely different
 * position from being the only one, and it changes both the odds of a reply
 * and the leverage in whatever conversation follows.
 */

function Option({ o, onMessage, isTop, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.25) }}
      className={`relative overflow-hidden bg-surface rounded-xl border shadow-card p-6 pl-7 ${
        isTop ? 'border-violet-500/50' : 'border-surface-border'
      }`}
    >
      <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: isTop ? '#7C5CFC' : '#E4E3EC' }} />

      <div className="flex items-start justify-between gap-6 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 mb-1">
            <Link to={`/app/startups/${o.startupId}`} className="text-[16px] font-semibold text-ink-950 hover:text-violet-700 transition-colors">
              {o.startupName}
            </Link>
            {o.onlyFit && (
              <span className="text-[11px] font-semibold text-mint-500 bg-mint-50 px-2 py-0.5 rounded-md">
                You are the only fit
              </span>
            )}
            {o.alreadyTalking && (
              <span className="text-[11px] font-medium text-ink-500 bg-surface-muted px-2 py-0.5 rounded-md">
                Already talking
              </span>
            )}
          </div>
          <p className="text-[13.5px] text-ink-700">
            Wants a <span className="font-medium text-ink-950">{o.role}</span>
            {o.seekingType === 'CO_FOUNDER' && <span className="text-violet-700"> · co-founder</span>}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <span className="text-[24px] font-bold leading-none tabular-nums" style={{ color: isTop ? '#6845F0' : '#3E4047' }}>
            {o.leverage}
          </span>
          <p className="text-[11px] text-ink-300 mt-0.5">where you matter</p>
        </div>
      </div>

      {/* All three inputs, separately. A ranking that hides what it is made of
          is asking to be trusted rather than checked. */}
      <div className="flex items-center gap-6 py-3 border-y border-surface-border mb-3">
        <div>
          <p className="text-[13px] font-semibold text-ink-900 tabular-nums">{o.fit}%</p>
          <p className="text-[11px] text-ink-300">your fit</p>
        </div>
        <div>
          <p className="text-[13px] font-semibold text-ink-900">{o.priority === 'CRITICAL' ? 'Critical' : o.priority === 'HIGH' ? 'High' : 'Lower'}</p>
          <p className="text-[11px] text-ink-300">how badly they need it</p>
        </div>
        <div>
          <p className="text-[13px] font-semibold text-ink-900 tabular-nums">
            {o.rivals === 0 ? 'Nobody' : o.rivals}
          </p>
          <p className="text-[11px] text-ink-300">{o.rivals === 0 ? 'else fits' : o.rivals === 1 ? 'other fits it' : 'others fit it'}</p>
        </div>
        {o.readiness !== null && (
          <div className="ml-auto text-right">
            <p className="text-[13px] font-semibold text-ink-900 tabular-nums">{o.readiness}</p>
            <p className="text-[11px] text-ink-300">venture readiness</p>
          </div>
        )}
      </div>

      {o.limitations.length > 0 && (
        <p className="text-[13px] text-ink-500 flex gap-2 leading-relaxed mb-3">
          <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
          {o.limitations[0]}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <Link to={`/app/startups/${o.startupId}`} className="flex items-center gap-1 text-[13px] font-medium text-ink-500 hover:text-violet-700 transition-colors">
          See the venture <ArrowUpRight size={13} />
        </Link>
        {!o.alreadyTalking && (
          <button
            onClick={() => onMessage(o)}
            className="flex items-center gap-1.5 text-[13px] font-medium bg-ink-900 hover:bg-ink-700 text-white px-4 py-2 rounded-full transition-colors"
          >
            <MessageSquare size={13} /> Start the conversation
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default function WhereToStart() {
  const navigate = useNavigate();
  const showToast = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    getWhereToStart().then(({ ok, data: d }) => {
      if (ok && d.success) setData(d);
      setLoading(false);
    });
  }, []);

  async function handleMessage(o) {
    const { ok, data: res } = await startConversation(o.founderId, { startupId: o.startupId, gapId: o.gapId });
    if (ok && res.success) navigate(`/app/inbox/${res.conversation.id}`);
    else showToast(res?.error || 'Could not start a conversation.', 'error');
  }

  if (loading) {
    return (
      <Shell persona="CONTRIBUTOR" title="Where to start">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" />
        </div>
      </Shell>
    );
  }

  const options = data?.options || [];
  const startHere = data?.startHere || null;
  const onlyFitFor = data?.onlyFitFor || [];

  return (
    <Shell persona="CONTRIBUTOR" title="Where to start" subtitle="Which conversation is worth having first">
      <div className="mb-7">
        <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-violet-600 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
          {options.length === 0 ? 'Nothing yet' : `${options.length} on the table`}
        </p>
        <h1 className="font-editorial italic text-[32px] text-trust-fg leading-tight max-w-3xl">
          {startHere ? `Start with ${startHere.startupName}.` : options.length === 0 ? 'Nothing is matching you yet.' : 'You are already talking to all of them.'}
        </h1>
        <p className="text-[15px] text-ink-700 mt-3 max-w-2xl leading-relaxed">
          {options.length === 0
            ? 'Once ventures start matching you, this is where you decide which conversation is worth having first.'
            : 'Where you fit best is not the same as where you matter most. This weighs how well you fit against how badly they need it and how few other people can do it.'}
        </p>
      </div>

      {options.length === 0 ? (
        <div className="bg-surface rounded-xl border border-surface-border shadow-card py-16 text-center">
          <p className="text-[15px] text-ink-700 mb-1">Nothing matching you yet.</p>
          <Link to="/app/contributor/standing" className="text-[13px] text-violet-700 hover:text-violet-600 transition-colors">
            See why
          </Link>
        </div>
      ) : (
        <>
          {/* The rarest and most valuable position a contributor can be in,
              and one they have no other way to discover. */}
          {onlyFitFor.length > 0 && (
            <div className="flex items-start gap-3 bg-mint-50 border border-mint-500/30 rounded-xl p-5 mb-6">
              <Users size={16} className="text-mint-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[14px] font-semibold text-forest-600">
                  {onlyFitFor.length === 1
                    ? 'You are the only person who fits one of these'
                    : `You are the only person who fits ${onlyFitFor.length} of these`}
                </p>
                <p className="text-[13px] text-forest-600/80 mt-0.5 leading-relaxed">
                  {onlyFitFor.map((o) => o.startupName).join(', ')}. Nobody else on the platform matches that role, which is the strongest position you can be in when you reach out.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-baseline justify-between mb-3">
            <div>
              <h2 className="text-[15px] font-semibold text-ink-900">Ranked by where you matter most</h2>
              <p className="text-[13px] text-ink-500 mt-0.5">Every part shown, so you can disagree with the order.</p>
            </div>
            <Link to="/app/contributor/offers" className="text-[13px] text-ink-500 hover:text-violet-600 transition-colors">Compare side by side</Link>
          </div>

          <div className="space-y-3">
            {options.map((o, i) => (
              <Option key={o.recommendationId} o={o} onMessage={handleMessage} isTop={i === 0 && !o.alreadyTalking} index={i} />
            ))}
          </div>
        </>
      )}

      <VentureAssistant mode="contributor" />
    </Shell>
  );
}
