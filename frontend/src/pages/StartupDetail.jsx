import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { MessageSquare, Presentation, Users, Target, AlertTriangle, Check } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import { useMyPersona } from '../hooks/useMyPersona.js';
import { getStartup, getVentureSummary, startConversation, getMyProfile } from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';

/**
 * A venture, as an outsider sees it.
 *
 * This was two boxes: problem and solution on the left, the shared summary
 * card on the right. The founder's own words about WHY they are building it
 * were tucked into a tinted box above the problem statement, which is
 * backwards. For a contributor deciding whether to give this years, the
 * conviction is the thing that matters and the structured fields are
 * supporting evidence.
 */

const INVESTOR_BAR = 35;

const SEVERITY = {
  CRITICAL: { fg: '#E15C4D', bg: '#FDEEF0' },
  HIGH: { fg: '#F0A84E', bg: '#FEF3E8' },
  MEDIUM: { fg: '#C5A93A', bg: '#FFF9E8' },
  LOW: { fg: '#3FB081', bg: '#EAF7F0' },
};

export default function StartupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();
  const { persona, displayName } = useMyPersona();
  const [loading, setLoading] = useState(true);
  const [startup, setStartup] = useState(null);
  const [summary, setSummary] = useState(null);
  const [myUserId, setMyUserId] = useState(null);

  useEffect(() => {
    async function load() {
      const [startupRes, summaryRes] = await Promise.all([getStartup(id), getVentureSummary(id)]);
      if (startupRes.ok && startupRes.data.success) setStartup(startupRes.data.startup);
      if (summaryRes.ok && summaryRes.data.success) setSummary(summaryRes.data.summary);
      setLoading(false);
    }
    load();
  }, [id]);

  useEffect(() => {
    if (startup) {
      getMyProfile().then(({ ok, data }) => { if (ok && data.success) setMyUserId(data.profile.user_id); });
    }
  }, [startup]);

  async function handleMessage() {
    const { ok, data } = await startConversation(startup.founder_id, { startupId: startup.id });
    if (ok && data.success) navigate(`/app/inbox/${data.conversation.id}`);
    else showToast(data.error || 'Could not start a conversation.', 'error');
  }

  if (loading) {
    return (
      <Shell persona={persona} displayName={displayName} title="Venture">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" />
        </div>
      </Shell>
    );
  }

  if (!startup) {
    return (
      <Shell persona={persona} displayName={displayName} title="Venture">
        <div className="bg-surface rounded-xl border border-surface-border shadow-card py-16 text-center">
          <p className="text-[15px] text-ink-700 mb-1">This venture is not visible to you.</p>
          <p className="text-[13px] text-ink-500">It may be private, or it may no longer exist.</p>
        </div>
      </Shell>
    );
  }

  const isOwn = myUserId && startup.founder_id === myUserId;
  const score = summary?.readiness ? Math.round(parseFloat(summary.readiness.overall_score)) : null;
  const coverage = summary?.team_coverage || { roles_filled: 0, roles_open: 0 };
  const totalRoles = (coverage.roles_filled || 0) + (coverage.roles_open || 0);
  const coveragePct = totalRoles > 0 ? Math.round((coverage.roles_filled / totalRoles) * 100) : 0;
  const risks = summary?.top_risks || [];

  return (
    <Shell persona={persona} displayName={displayName} title={startup.name} subtitle={(startup.domain || []).join(' · ')}>
      {/* THE FOUNDER'S CONVICTION, FIRST.
          For someone deciding whether to give this years of their life, why
          the founder is building it matters more than the structured fields.
          It was in a tinted box under the problem statement. */}
      <div className="relative overflow-hidden rounded-xl bg-ink-950 p-8 mb-8">
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle at 15% 20%, #7C5CFC 0%, transparent 55%), radial-gradient(circle at 85% 80%, #1F5D52 0%, transparent 55%)' }} />
        <div className="relative">
          <div className="flex items-start justify-between gap-8 mb-5">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-mint-500 mb-2">
                {(startup.domain || []).slice(0, 3).join(' · ') || 'Venture'}{startup.stage ? ` · ${startup.stage}` : ''}
              </p>
              <h1 className="font-display text-[34px] font-semibold text-white leading-tight">{startup.name}</h1>
            </div>

            <div className="shrink-0 flex items-center gap-3">
              {isOwn ? (
                <Link
                  to={`/app/pitch/${startup.id}`}
                  className="flex items-center gap-2 bg-white hover:bg-white/90 text-ink-950 px-5 py-2.5 rounded-full text-[14px] font-medium transition-colors"
                >
                  <Presentation size={15} /> Preview your pitch
                </Link>
              ) : myUserId ? (
                <button
                  onClick={handleMessage}
                  className="flex items-center gap-2 bg-white hover:bg-white/90 text-ink-950 px-5 py-2.5 rounded-full text-[14px] font-medium transition-colors"
                >
                  <MessageSquare size={15} /> Message the founder
                </button>
              ) : null}
            </div>
          </div>

          {startup.founder_vision && (
            <p className="font-display text-[19px] font-normal italic text-white/85 leading-relaxed max-w-2xl">
              “{startup.founder_vision}”
            </p>
          )}

          {score !== null && (
            <div className="flex items-center gap-6 mt-7 pt-5 border-t border-white/10">
              <div>
                <p className="text-[20px] font-semibold text-white tabular-nums leading-none">{score}</p>
                <p className="text-[11px] text-white/50 mt-1">readiness</p>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div>
                <p className="text-[20px] font-semibold text-white tabular-nums leading-none">
                  {coverage.roles_filled}<span className="text-[14px] text-white/40">/{totalRoles}</span>
                </p>
                <p className="text-[11px] text-white/50 mt-1">roles filled</p>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div>
                <p className="text-[20px] font-semibold text-white tabular-nums leading-none">{coverage.roles_open}</p>
                <p className="text-[11px] text-white/50 mt-1">still hiring</p>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div className="flex items-center gap-2">
                {score >= INVESTOR_BAR
                  ? <><Check size={14} className="text-mint-500" /><span className="text-[12.5px] text-white/70">Visible to investors</span></>
                  : <span className="text-[12.5px] text-white/50">{INVESTOR_BAR - score} from investor visibility</span>}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-3 space-y-4">
          {startup.problem && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
              className="bg-surface rounded-xl border border-surface-border shadow-card p-7"
            >
              <p className="text-[11px] font-semibold tracking-wide uppercase text-ink-300 mb-2.5">The problem</p>
              <p className="text-[16px] text-ink-900 leading-relaxed">{startup.problem}</p>
            </motion.div>
          )}

          {startup.solution && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.06 }}
              className="bg-surface rounded-xl border border-surface-border shadow-card p-7"
            >
              <p className="text-[11px] font-semibold tracking-wide uppercase text-ink-300 mb-2.5">What they are building</p>
              <p className="text-[16px] text-ink-900 leading-relaxed">{startup.solution}</p>
            </motion.div>
          )}

          {(startup.target_users || []).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.12 }}
              className="bg-surface rounded-xl border border-surface-border shadow-card p-7"
            >
              <p className="text-[11px] font-semibold tracking-wide uppercase text-ink-300 mb-3">Who it is for</p>
              <div className="flex flex-wrap gap-2">
                {(startup.target_users || []).map((u) => (
                  <span key={u} className="text-[13px] px-3 py-1.5 rounded-lg bg-surface-muted text-ink-700">{u}</span>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        <div className="col-span-2 space-y-4">
          {totalRoles > 0 && (
            <div className="bg-surface rounded-xl border border-surface-border shadow-card p-6">
              <div className="flex items-center gap-2 mb-3">
                <Users size={15} className="text-violet-600" />
                <p className="text-[14px] font-semibold text-ink-950">Team</p>
              </div>
              <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden mb-2.5">
                <motion.div
                  initial={{ width: 0 }} animate={{ width: `${coveragePct}%` }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full rounded-full bg-violet-500"
                />
              </div>
              <p className="text-[13px] text-ink-700">
                {coverage.roles_open === 0
                  ? 'Every role they need is covered.'
                  : `${coverage.roles_open} role${coverage.roles_open === 1 ? '' : 's'} still open. ${isOwn ? '' : 'One of them might be yours.'}`}
              </p>
              {!isOwn && coverage.roles_open > 0 && persona === 'CONTRIBUTOR' && (
                <Link to="/app/contributor/opportunities" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-violet-700 hover:text-violet-600 transition-colors mt-3">
                  <Target size={13} /> See if you fit
                </Link>
              )}
            </div>
          )}

          {risks.length > 0 && (
            <div className="bg-surface rounded-xl border border-surface-border shadow-card p-6">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={15} className="text-amber-500" />
                <p className="text-[14px] font-semibold text-ink-950">Worth knowing</p>
              </div>
              <div className="space-y-3">
                {risks.slice(0, 3).map((r, i) => {
                  const sev = SEVERITY[r.severity] || SEVERITY.MEDIUM;
                  return (
                    <div key={r.id || i}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: sev.fg }} />
                        <p className="text-[13.5px] font-medium text-ink-900">{r.title || r.category}</p>
                      </div>
                      <p className="text-[12.5px] text-ink-500 leading-relaxed pl-3.5">{r.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
