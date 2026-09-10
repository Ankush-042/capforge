import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, RefreshCw, MessageSquare, Scale, Check, AlertTriangle } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import { getGaps, rankCandidates, startConversation } from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';

/**
 * One role, and the real people who could fill it.
 *
 * This was "Gap detail": a narrow card of requirements beside a list of
 * candidates as flat rows. The score sat as a bare percentage in the corner
 * and the reason someone fits was buried under an avatar in small grey text,
 * which is backwards. The reason IS the product. The number is shorthand.
 *
 * Now the role states its case at the top, and each candidate is a real card
 * where the explanation is the body, not a footnote.
 */

const PRIORITY_ACCENT = {
  CRITICAL: '#E15C4D',
  HIGH: '#F0A84E',
  MEDIUM: '#C5A93A',
  LOW: '#3FB081',
};

function scoreTone(score) {
  if (score >= 0.7) return { fg: '#1F5D52', bg: '#EAF7F0', label: 'Strong fit' };
  if (score >= 0.45) return { fg: '#6845F0', bg: '#F1EEFE', label: 'Real fit' };
  return { fg: '#6E7079', bg: '#F4F4F7', label: 'Worth a look' };
}

function CandidateCard({ candidate, gap, startupId, gapId, onConnect, index }) {
  const score = parseFloat(candidate.score) || 0;
  const pct = Math.round(score * 100);
  const tone = scoreTone(score);
  const strengths = candidate.explanation?.strengths || [];
  const limitations = candidate.explanation?.limitations || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.3), ease: [0.16, 1, 0.3, 1] }}
      className="bg-surface rounded-xl border border-surface-border shadow-card p-6 hover:shadow-elevated transition-shadow duration-200"
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <Link
          to={`/app/profile/${candidate.target_user_id}?startupId=${startupId}&gapId=${gapId}`}
          className="flex items-center gap-3 min-w-0 group"
        >
          <div className="w-11 h-11 rounded-full bg-violet-100 flex items-center justify-center text-[15px] font-semibold text-violet-700 shrink-0">
            {(candidate.candidate_headline || '?').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-ink-950 truncate group-hover:text-violet-700 transition-colors">
              {candidate.candidate_headline || 'Candidate'}
            </p>
            <p className="text-[12px] text-ink-500">Ranked #{candidate.rank} · See their full profile</p>
          </div>
        </Link>

        <div className="shrink-0 text-right">
          <span className="text-[26px] font-bold leading-none tabular-nums" style={{ color: tone.fg }}>{pct}</span>
          <span className="text-[13px] font-medium ml-0.5" style={{ color: tone.fg }}>%</span>
          <p className="text-[11px] font-medium mt-1 px-2 py-0.5 rounded-md inline-block" style={{ backgroundColor: tone.bg, color: tone.fg }}>
            {tone.label}
          </p>
        </div>
      </div>

      {/* The reason is the body of the card, not a footnote under an avatar.
          A founder decides from this, not from the number. */}
      {candidate.causal_narrative ? (
        <p className="text-[14px] text-ink-700 leading-relaxed mb-4">{candidate.causal_narrative}</p>
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

      <div className="pt-4 border-t border-surface-border flex items-center justify-between gap-3">
        <Link
          to={`/app/profile/${candidate.target_user_id}?startupId=${startupId}&gapId=${gapId}`}
          className="text-[13px] font-medium text-ink-500 hover:text-violet-700 transition-colors"
        >
          Full profile
        </Link>
        <button
          onClick={() => onConnect(candidate)}
          className="flex items-center gap-1.5 text-[13px] font-medium bg-ink-900 hover:bg-ink-700 text-white px-4 py-2 rounded-full transition-colors"
        >
          <MessageSquare size={13} />
          {gap.seeking_type === 'CO_FOUNDER' ? 'Start the conversation' : 'Message them'}
        </button>
      </div>
    </motion.div>
  );
}

export default function GapDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const startupId = searchParams.get('startup');
  const showToast = useToast();

  const [loading, setLoading] = useState(true);
  const [ranking, setRanking] = useState(false);
  const [ranked, setRanked] = useState(false);
  const [gap, setGap] = useState(null);
  const [candidates, setCandidates] = useState([]);

  useEffect(() => {
    async function load() {
      if (!startupId) { setLoading(false); return; }
      const { ok, data } = await getGaps(startupId);
      if (ok && data.success) setGap(data.gaps.find((g) => g.id === id));
      setLoading(false);
    }
    load();
  }, [id, startupId]);

  async function handleRank() {
    setRanking(true);
    const { ok, data } = await rankCandidates(id);
    setRanking(false);
    setRanked(true);
    if (!ok || !data.success) {
      showToast(data.detail || data.error || data.note || 'Could not rank anyone for this role yet.', 'error');
      setCandidates([]);
      return;
    }
    setCandidates(data.recommendations);
    if (data.recommendations.length === 0) {
      showToast(data.note || 'Nobody in the pool fits this role yet.', 'error');
    }
  }

  async function handleConnect(candidate) {
    const { ok, data } = await startConversation(candidate.target_user_id, { startupId, gapId: id });
    if (ok && data.success) navigate(`/app/inbox/${data.conversation.id}`);
    else showToast(data.error || 'Could not start a conversation.', 'error');
  }

  if (loading) {
    return (
      <Shell title="Role">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" />
        </div>
      </Shell>
    );
  }

  if (!gap) {
    return (
      <Shell title="Role">
        <Link to="/app/gaps" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition-colors mb-6">
          <ArrowLeft size={15} /> Back to roles
        </Link>
        <div className="bg-surface rounded-xl border border-surface-border shadow-card py-16 text-center">
          <p className="text-[15px] text-ink-700 mb-1">This role no longer exists.</p>
          <p className="text-[13px] text-ink-500">It may have been filled, or removed when the venture was re-analysed.</p>
        </div>
      </Shell>
    );
  }

  const coverage = Math.round((parseFloat(gap.coverage) || 0) * 100);
  const covered = coverage > 0;
  const accent = covered ? '#3FB081' : (PRIORITY_ACCENT[gap.priority_level] || PRIORITY_ACCENT.LOW);
  const isCoFounder = gap.seeking_type === 'CO_FOUNDER';

  return (
    <Shell title={gap.role} subtitle={covered ? 'Covered by the team' : 'Nobody covers this yet'}>
      <Link to="/app/gaps" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition-colors mb-6">
        <ArrowLeft size={15} /> Back to roles
      </Link>

      {/* THE ROLE MAKES ITS CASE. Dark, full width, the way the founder home
          treats the critical hire, so opening a role feels like arriving
          somewhere rather than loading a form. */}
      <div className="relative overflow-hidden rounded-xl bg-ink-950 p-8 mb-8">
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle at 15% 20%, #7C5CFC 0%, transparent 55%), radial-gradient(circle at 85% 80%, #1F5D52 0%, transparent 55%)' }} />
        <div className="relative">
          <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase mb-3" style={{ color: covered ? '#3FB081' : '#3FB081' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accent }} />
            {isCoFounder ? 'Co-founder search' : covered ? 'Covered' : `${(gap.priority_level || 'LOW').charAt(0)}${(gap.priority_level || 'LOW').slice(1).toLowerCase()} priority`}
          </p>
          <h1 className="font-display text-[34px] font-semibold text-white leading-tight mb-4">{gap.role}</h1>
          <p className="text-[15px] text-white/70 leading-relaxed max-w-2xl mb-6">{gap.reason}</p>

          {(gap.required_skills || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {(gap.required_skills || []).map((s) => (
                <span key={s} className="text-[12px] px-2.5 py-1 rounded-md bg-white/10 text-white/75 border border-white/10">{s}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* THE PEOPLE */}
      <div>
        <div className="flex items-baseline justify-between mb-3 gap-4">
          <div>
            <h2 className="text-[15px] font-semibold text-ink-900">
              {candidates.length > 0 ? `${candidates.length} ${candidates.length === 1 ? 'person' : 'people'} who could do this` : 'Who could do this'}
            </h2>
            {candidates.length > 0 && (
              <p className="text-[13px] text-ink-500 mt-0.5">Ranked on real evidence, with the reason for each.</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {candidates.length > 1 && (
              <Link
                to={`/app/gaps/${id}/compare?gap=${id}&startup=${startupId}`}
                className="flex items-center gap-1.5 text-[13px] font-medium text-ink-500 hover:text-violet-700 border border-surface-border px-3.5 py-2 rounded-full transition-colors"
              >
                <Scale size={13} /> Side by side
              </Link>
            )}
            <button
              onClick={handleRank}
              disabled={ranking}
              className="flex items-center gap-1.5 text-[13px] font-medium bg-ink-900 hover:bg-ink-700 text-white px-4 py-2 rounded-full transition-colors disabled:opacity-50"
            >
              <RefreshCw size={13} className={ranking ? 'animate-spin' : ''} />
              {ranking ? 'Searching…' : candidates.length > 0 ? 'Search again' : 'Find people'}
            </button>
          </div>
        </div>

        {candidates.length === 0 ? (
          <div className="bg-surface rounded-xl border border-surface-border shadow-card py-16 text-center">
            <p className="text-[15px] text-ink-700 mb-1">
              {ranked ? 'Nobody in the pool fits this role yet.' : 'Nobody has been searched for yet.'}
            </p>
            <p className="text-[13px] text-ink-500 max-w-md mx-auto">
              {ranked
                ? 'As more people join and complete their profiles, this will fill in. Re-run any time.'
                : 'CapForge will score every real contributor against this role and tell you why each one fits.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {candidates.map((c, i) => (
              <CandidateCard
                key={c.id}
                candidate={c}
                gap={gap}
                startupId={startupId}
                gapId={id}
                onConnect={handleConnect}
                index={i}
              />
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
