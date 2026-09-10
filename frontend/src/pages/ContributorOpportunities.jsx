import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { MessageSquare, Check, AlertTriangle, Scale, ArrowUpRight } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import { getMyRecommendationsAsContributor, startConversation } from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';

/**
 * Ventures that need what you do.
 *
 * A venture with several open roles you partially fit used to render as
 * several separate rows with the same name, reading as spam. Grouping fixed
 * that, but the card was still a name, a percentage and a paragraph.
 *
 * Someone reading this is deciding where to spend years. So the reason comes
 * first, the caution is shown as plainly as the pitch, and the role you fit
 * best is named rather than left implicit.
 */

function groupByStartup(recs) {
  const groups = new Map();
  for (const r of recs) {
    if (!groups.has(r.startup_id)) {
      groups.set(r.startup_id, {
        startup_id: r.startup_id,
        startup_name: r.startup_name,
        domain: r.domain,
        stage: r.stage,
        founder_id: r.founder_id,
        roles: [],
      });
    }
    groups.get(r.startup_id).roles.push(r);
  }
  return [...groups.values()]
    .map((g) => ({ ...g, roles: g.roles.sort((a, b) => parseFloat(b.score) - parseFloat(a.score)) }))
    .sort((a, b) => parseFloat(b.roles[0].score) - parseFloat(a.roles[0].score));
}

function fitTone(score) {
  if (score >= 0.7) return { fg: '#1F5D52', bg: '#EAF7F0', label: 'Strong fit' };
  if (score >= 0.45) return { fg: '#6845F0', bg: '#F1EEFE', label: 'Real fit' };
  return { fg: '#6E7079', bg: '#F4F4F7', label: 'Worth a look' };
}

function VentureCard({ g, onMessage, index }) {
  const top = g.roles[0];
  const score = parseFloat(top.score) || 0;
  const pct = Math.round(score * 100);
  const tone = fitTone(score);
  const strengths = top.explanation?.strengths || [];
  const limitations = top.explanation?.limitations || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.3), ease: [0.16, 1, 0.3, 1] }}
      className="bg-surface rounded-xl border border-surface-border shadow-card p-6 hover:shadow-elevated transition-shadow duration-200"
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0">
          <Link
            to={`/app/startups/${g.startup_id}`}
            className="text-[17px] font-semibold text-ink-950 hover:text-violet-700 transition-colors"
          >
            {g.startup_name}
          </Link>
          <p className="text-[12.5px] text-ink-500 mt-0.5 truncate">
            {(g.domain || []).slice(0, 3).join(' · ')}{g.stage ? ` · ${g.stage}` : ''}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <span className="text-[26px] font-bold leading-none tabular-nums" style={{ color: tone.fg }}>{pct}</span>
          <span className="text-[13px] font-medium ml-0.5" style={{ color: tone.fg }}>%</span>
          <p className="text-[11px] font-medium mt-1 px-2 py-0.5 rounded-md inline-block" style={{ backgroundColor: tone.bg, color: tone.fg }}>
            {tone.label}
          </p>
        </div>
      </div>

      {/* Name the role. 'A venture wants you' is useless without knowing for
          what, and it was only implied by the score before. */}
      <p className="text-[13.5px] font-medium text-ink-900 mb-3">
        Wants a {top.gap_role}
        {g.roles.length > 1 && <span className="text-ink-500 font-normal"> · and {g.roles.length - 1} other role{g.roles.length > 2 ? 's' : ''} you fit</span>}
      </p>

      {top.causal_narrative ? (
        <p className="text-[14px] text-ink-700 leading-relaxed mb-4">{top.causal_narrative}</p>
      ) : (
        <div className="space-y-1.5 mb-4">
          {strengths.map((s) => (
            <p key={s} className="text-[13.5px] text-ink-700 flex gap-2 leading-relaxed">
              <Check size={14} className="text-mint-500 shrink-0 mt-0.5" />{s}
            </p>
          ))}
        </div>
      )}

      {limitations.length > 0 && (
        <div className="space-y-1.5 mb-4">
          {limitations.slice(0, 2).map((l) => (
            <p key={l} className="text-[13.5px] text-ink-500 flex gap-2 leading-relaxed">
              <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />{l}
            </p>
          ))}
        </div>
      )}

      {g.roles.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {g.roles.slice(1).map((r) => (
            <span key={r.id} className="text-[11px] px-2 py-1 rounded-md bg-surface-muted text-ink-700">
              {r.gap_role} · {Math.round(parseFloat(r.score) * 100)}%
            </span>
          ))}
        </div>
      )}

      <div className="pt-4 border-t border-surface-border flex items-center justify-between gap-3">
        <Link
          to={`/app/startups/${g.startup_id}`}
          className="flex items-center gap-1 text-[13px] font-medium text-ink-500 hover:text-violet-700 transition-colors"
        >
          See the venture <ArrowUpRight size={13} />
        </Link>
        <button
          onClick={() => onMessage(top)}
          className="flex items-center gap-1.5 text-[13px] font-medium bg-ink-900 hover:bg-ink-700 text-white px-4 py-2 rounded-full transition-colors"
        >
          <MessageSquare size={13} /> Message the founder
        </button>
      </div>
    </motion.div>
  );
}

export default function ContributorOpportunities() {
  const navigate = useNavigate();
  const showToast = useToast();
  const [loading, setLoading] = useState(true);
  const [recs, setRecs] = useState([]);

  useEffect(() => {
    getMyRecommendationsAsContributor().then(({ ok, data }) => {
      if (ok && data.success) setRecs(data.recommendations);
      setLoading(false);
    });
  }, []);

  async function handleMessage(r) {
    const { ok, data } = await startConversation(r.founder_id, { startupId: r.startup_id, gapId: r.source_gap_id });
    if (ok && data.success) navigate(`/app/inbox/${data.conversation.id}`);
    else showToast(data.error || 'Could not start a conversation.', 'error');
  }

  if (loading) {
    return (
      <Shell persona="CONTRIBUTOR" title="Opportunities">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" />
        </div>
      </Shell>
    );
  }

  const grouped = groupByStartup(recs);
  const best = grouped[0] || null;
  const strong = grouped.filter((g) => parseFloat(g.roles[0].score) >= 0.45);

  return (
    <Shell persona="CONTRIBUTOR" title="Opportunities" subtitle="Ventures that need what you do">
      <div className="mb-7">
        <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-violet-600 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
          {grouped.length === 0 ? 'Nothing yet' : `${grouped.length} venture${grouped.length === 1 ? '' : 's'} need you`}
        </p>
        <h1 className="font-editorial italic text-[32px] text-trust-fg leading-tight max-w-3xl">
          {best
            ? `${best.startup_name} needs a ${best.roles[0].gap_role}, and you fit.`
            : 'Nothing matches you yet.'}
        </h1>
        <p className="text-[15px] text-ink-700 mt-3 max-w-2xl leading-relaxed">
          {grouped.length === 0
            ? 'Founders are matched to you on your skills, the fields you care about, and what you said you are looking for. Fill those in and ventures will start appearing here.'
            : 'Every one of these tells you why it fits, and where it does not. Nothing is ranked by who paid or who posted most recently.'}
        </p>
      </div>

      {grouped.length === 0 ? (
        <div className="bg-surface rounded-xl border border-surface-border shadow-card py-16 text-center">
          <p className="text-[15px] text-ink-700 mb-1">No ventures need you yet.</p>
          <p className="text-[13px] text-ink-500 mb-6 max-w-sm mx-auto">
            The more honest your profile is about what you want, the better this gets.
          </p>
          <Link
            to="/app/my-profile"
            className="inline-flex items-center gap-2 text-[13px] font-medium bg-ink-900 hover:bg-ink-700 text-white px-5 py-2.5 rounded-full transition-colors"
          >
            Complete your profile <ArrowUpRight size={14} />
          </Link>
        </div>
      ) : (
        <>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-[15px] font-semibold text-ink-900">
              {strong.length > 0 ? `${strong.length} worth a real look` : 'Ranked by fit'}
            </h2>
            {grouped.length > 1 && (
              <Link
                to="/app/contributor/offers"
                className="flex items-center gap-1.5 text-[13px] font-medium text-ink-500 hover:text-violet-700 transition-colors"
              >
                <Scale size={13} /> Weigh them up side by side
              </Link>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {grouped.map((g, i) => <VentureCard key={g.startup_id} g={g} onMessage={handleMessage} index={i} />)}
          </div>
        </>
      )}
    </Shell>
  );
}
