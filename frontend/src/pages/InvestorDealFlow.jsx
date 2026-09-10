import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { RefreshCw, Check, AlertTriangle, ArrowUpRight, Bookmark } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import { getInvestorRecommendations, refreshInvestorRecommendations } from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';

/**
 * Ventures worth your attention.
 *
 * This was a stack of wide rows: name, domains, a percentage, a few ticks.
 * An investor scanning deal flow is doing one thing, deciding what deserves
 * a conversation, and nothing on the page helped with that. Every venture
 * looked identical in weight and the reasons were the same size as
 * everything else.
 *
 * The distinction that matters here is not the score, it is whether the
 * evidence is strong enough to spend time on. So the strongest are separated
 * out, and the reasons to be careful sit at the same weight as the reasons
 * to look.
 */

function fitTone(score) {
  if (score >= 0.7) return { fg: '#1F5D52', bg: '#EAF7F0', label: 'Strong thesis fit' };
  if (score >= 0.5) return { fg: '#6845F0', bg: '#F1EEFE', label: 'Real fit' };
  return { fg: '#6E7079', bg: '#F4F4F7', label: 'Adjacent' };
}

function DealCard({ d, index }) {
  const score = parseFloat(d.score) || 0;
  const pct = Math.round(score * 100);
  const tone = fitTone(score);
  const strengths = d.explanation?.strengths || [];
  const watch = d.explanation?.watch || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.3), ease: [0.16, 1, 0.3, 1] }}
      className="bg-surface rounded-xl border border-surface-border shadow-card p-6 hover:shadow-elevated transition-shadow duration-200"
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <Link to={`/app/startups/${d.startup_id}`} className="text-[17px] font-semibold text-ink-950 hover:text-violet-700 transition-colors">
            {d.startup_name}
          </Link>
          <p className="text-[12.5px] text-ink-500 mt-0.5 truncate">
            {(d.domain || []).slice(0, 3).join(' · ')}{d.stage ? ` · ${d.stage}` : ''}
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

      {strengths.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {strengths.map((s) => (
            <p key={s} className="text-[13.5px] text-ink-700 flex gap-2 leading-relaxed">
              <Check size={14} className="text-mint-500 shrink-0 mt-0.5" />{s}
            </p>
          ))}
        </div>
      )}

      {/* Reasons to be careful, at the same weight as reasons to look. An
          investor is being asked to spend time, and a page that only ever
          argues for something is not deal flow, it is marketing. */}
      {watch.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {watch.map((s) => (
            <p key={s} className="text-[13.5px] text-ink-500 flex gap-2 leading-relaxed">
              <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />{s}
            </p>
          ))}
        </div>
      )}

      <div className="pt-4 border-t border-surface-border">
        <Link
          to={`/app/startups/${d.startup_id}`}
          className="flex items-center gap-1.5 text-[13px] font-medium text-violet-700 hover:text-violet-600 transition-colors"
        >
          Look properly <ArrowUpRight size={13} />
        </Link>
      </div>
    </motion.div>
  );
}

export default function InvestorDealFlow() {
  const showToast = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deals, setDeals] = useState([]);
  const [note, setNote] = useState(null);

  async function load() {
    const { ok, data } = await getInvestorRecommendations();
    if (ok && data.success) setDeals(data.recommendations);
  }

  useEffect(() => { load().then(() => setLoading(false)); }, []);

  async function handleRefresh() {
    setRefreshing(true);
    const { ok, data } = await refreshInvestorRecommendations();
    setRefreshing(false);
    if (!ok || !data.success) { showToast('Could not refresh right now.', 'error'); return; }
    setNote(data.note || null);
    await load();
    showToast('Deal flow is up to date.');
  }

  if (loading) {
    return (
      <Shell persona="INVESTOR" title="Deal flow">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" />
        </div>
      </Shell>
    );
  }

  const strong = deals.filter((d) => (parseFloat(d.score) || 0) >= 0.5);
  const rest = deals.filter((d) => (parseFloat(d.score) || 0) < 0.5);
  const top = deals[0] || null;

  return (
    <Shell persona="INVESTOR" title="Deal flow" subtitle="Matched against your thesis, not everything on the platform">
      <div className="mb-7 flex items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-violet-600 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
            {deals.length === 0 ? 'Nothing matching yet' : `${deals.length} past the readiness bar`}
          </p>
          <h1 className="font-editorial italic text-[32px] text-trust-fg leading-tight max-w-3xl">
            {top
              ? `${top.startup_name} is the closest to what you back.`
              : 'Nothing matches your thesis yet.'}
          </h1>
          <p className="text-[15px] text-ink-700 mt-3 max-w-2xl leading-relaxed">
            Ventures only appear here once they have crossed a real readiness bar, and they are ranked against the thesis you wrote. This is a filtered view, not a directory.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="shrink-0 flex items-center gap-2 text-[13px] font-medium bg-ink-900 hover:bg-ink-700 text-white px-4 py-2.5 rounded-full transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Checking…' : 'Check for new'}
        </button>
      </div>

      {deals.length === 0 ? (
        <div className="bg-surface rounded-xl border border-surface-border shadow-card py-16 text-center">
          <p className="text-[15px] text-ink-700 mb-1">{note || 'Nothing matches your thesis yet.'}</p>
          <p className="text-[13px] text-ink-500 mb-6 max-w-md mx-auto">
            Ventures appear as they cross the readiness bar. If this stays empty, your thesis domains may be narrower than what is currently being built.
          </p>
          <Link
            to="/app/my-profile"
            className="inline-flex items-center gap-2 text-[13px] font-medium bg-ink-900 hover:bg-ink-700 text-white px-5 py-2.5 rounded-full transition-colors"
          >
            Review your thesis <ArrowUpRight size={14} />
          </Link>
        </div>
      ) : (
        <>
          {strong.length > 0 && (
            <div className="mb-8">
              <div className="flex items-baseline justify-between mb-3">
                <div>
                  <h2 className="text-[15px] font-semibold text-ink-900">Worth a conversation</h2>
                  <p className="text-[13px] text-ink-500 mt-0.5">Real overlap with what you said you back.</p>
                </div>
                <Link to="/app/investor/saved-searches" className="flex items-center gap-1.5 text-[13px] text-ink-500 hover:text-violet-600 transition-colors">
                  <Bookmark size={13} /> Saved searches
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {strong.map((d, i) => <DealCard key={d.id} d={d} index={i} />)}
              </div>
            </div>
          )}

          {rest.length > 0 && (
            <div>
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-[15px] font-semibold text-ink-900">{strong.length > 0 ? 'Adjacent to your thesis' : 'Ranked by fit'}</h2>
                <span className="text-[13px] text-ink-500">Outside your stated focus, but close</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {rest.map((d, i) => <DealCard key={d.id} d={d} index={i} />)}
              </div>
            </div>
          )}
        </>
      )}
    </Shell>
  );
}
