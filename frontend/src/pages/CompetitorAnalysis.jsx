import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Check, HelpCircle, Crosshair, Info } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import { getCompetitorAnalysis, runCompetitorAnalysis } from '../services/startups.js';
import { useActiveStartup } from '../context/ActiveStartupContext.jsx';
import { useToast } from '../components/Toast.jsx';

/**
 * Who else is doing this.
 *
 * The content was right and the framing was wrong. 'AI-interpreted, validate
 * before acting on it' sat as a subtitle where nobody reads it, and the two
 * most useful sections, where you could differentiate and what you should go
 * and check, were rendered as two equal boxes of bullet points.
 *
 * The questions are the more valuable half. A list of differentiation
 * opportunities is a guess until someone has actually asked a customer, and
 * the page should say so rather than presenting both as equally settled.
 */

export default function CompetitorAnalysis() {
  const { activeStartup, loading: startupLoading } = useActiveStartup();
  const showToast = useToast();
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [startup, setStartup] = useState(null);
  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    async function load() {
      if (startupLoading) return;
      if (activeStartup) {
        setStartup(activeStartup);
        const res = await getCompetitorAnalysis(activeStartup.id);
        if (res.ok && res.data.success && res.data.analyses.length > 0) setAnalysis(res.data.analyses[0]);
      }
      setLoading(false);
    }
    load();
  }, [activeStartup?.id, startupLoading]);

  async function handleRun() {
    if (!startup) { showToast('No venture yet. Describe your idea first.', 'error'); return; }
    setRunning(true);
    const { ok, data } = await runCompetitorAnalysis(startup.id);
    setRunning(false);
    if (!ok || !data.success) { showToast(data.detail || data.error || 'Could not work that out right now.', 'error'); return; }
    setAnalysis(data.competitorAnalysis);
    showToast('Done. Worth checking these against reality.');
  }

  if (loading) {
    return (
      <Shell title="Who else is doing this">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" />
        </div>
      </Shell>
    );
  }

  const opportunities = analysis?.differentiation_opportunities || [];
  const questions = analysis?.positioning_questions || [];

  return (
    <Shell title={startup?.name || 'Who else is doing this'} subtitle="Where you sit in the market">
      <div className="mb-7 flex items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-violet-600 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
            {analysis ? analysis.comparable_category : 'Not looked at yet'}
          </p>
          <h1 className="font-editorial italic text-[32px] text-trust-fg leading-tight max-w-3xl">
            {analysis
              ? `${questions.length} thing${questions.length === 1 ? '' : 's'} to go and find out.`
              : 'Nobody has looked at where you sit yet.'}
          </h1>
          <p className="text-[15px] text-ink-700 mt-3 max-w-2xl leading-relaxed">
            {analysis
              ? 'This is reasoning from what your venture says it does. It is a starting point for research, not research.'
              : 'CapForge reads your problem and solution and works out which category you land in, where you could differentiate, and what you should go and verify.'}
          </p>
        </div>
        <button
          onClick={handleRun}
          disabled={running || !startup}
          className="shrink-0 flex items-center gap-2 text-[13px] font-medium bg-ink-900 hover:bg-ink-700 text-white px-4 py-2.5 rounded-full transition-colors disabled:opacity-50"
        >
          <Sparkles size={14} className={running ? 'animate-pulse' : ''} />
          {running ? 'Working it out…' : analysis ? 'Run it again' : 'Work out my position'}
        </button>
      </div>

      {!analysis ? (
        <div className="bg-surface rounded-xl border border-surface-border shadow-card py-16 text-center">
          <Crosshair size={22} className="text-ink-300 mx-auto mb-3" />
          <p className="text-[15px] text-ink-700 mb-1">Nothing worked out yet.</p>
          <p className="text-[13px] text-ink-500 mb-6 max-w-sm mx-auto">
            Positioning is one of the four things your readiness score is built from, so this is not just background reading.
          </p>
          <button
            onClick={handleRun}
            disabled={running}
            className="inline-flex items-center gap-2 text-[13px] font-medium bg-ink-900 hover:bg-ink-700 text-white px-5 py-2.5 rounded-full transition-colors disabled:opacity-50"
          >
            <Sparkles size={14} /> {running ? 'Working it out…' : 'Work out my position'}
          </button>
        </div>
      ) : (
        <>
          <div className="relative overflow-hidden rounded-xl bg-ink-950 p-8 mb-5">
            <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle at 15% 20%, #7C5CFC 0%, transparent 55%), radial-gradient(circle at 85% 80%, #1F5D52 0%, transparent 55%)' }} />
            <div className="relative">
              <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-mint-500 mb-3">You land in</p>
              <p className="font-display text-[28px] font-semibold text-white leading-tight mb-4">{analysis.comparable_category}</p>
              {analysis.potential_overlap && (
                <p className="text-[15px] text-white/70 leading-relaxed max-w-2xl">{analysis.potential_overlap}</p>
              )}
            </div>
          </div>

          {/* The questions come first. Differentiation opportunities are a
              guess until somebody has asked a customer, and presenting both
              as equally settled is how a founder ends up confidently wrong. */}
          {questions.length > 0 && (
            <div className="mb-5">
              <div className="flex items-baseline justify-between mb-3">
                <div>
                  <h2 className="text-[15px] font-semibold text-ink-900">Go and find this out</h2>
                  <p className="text-[13px] text-ink-500 mt-0.5">Answering these is worth more than anything on this page.</p>
                </div>
              </div>
              <div className="space-y-3">
                {questions.map((q, i) => (
                  <motion.div
                    key={q}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.25) }}
                    className="flex items-start gap-3.5 bg-surface rounded-xl border border-surface-border shadow-card p-5"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                      <HelpCircle size={15} />
                    </div>
                    <p className="text-[14.5px] text-ink-900 leading-relaxed pt-1">{q}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {opportunities.length > 0 && (
            <div>
              <div className="flex items-baseline justify-between mb-3">
                <div>
                  <h2 className="text-[15px] font-semibold text-ink-900">Where you could be different</h2>
                  <p className="text-[13px] text-ink-500 mt-0.5">Reasoned from what you wrote, not from talking to anyone.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {opportunities.map((d, i) => (
                  <motion.div
                    key={d}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.25) }}
                    className="flex items-start gap-3.5 bg-surface rounded-xl border border-surface-border shadow-card p-5"
                  >
                    <div className="w-8 h-8 rounded-lg bg-mint-50 text-mint-500 flex items-center justify-center shrink-0">
                      <Check size={15} />
                    </div>
                    <p className="text-[14.5px] text-ink-900 leading-relaxed pt-1">{d}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-start gap-2.5 mt-6 px-1">
            <Info size={13} className="text-ink-300 shrink-0 mt-0.5" />
            <p className="text-[12.5px] text-ink-500 leading-relaxed max-w-2xl">
              None of this involved looking anyone up. It is reasoning from your own description, which makes it a good place to start research and a bad place to end it.
            </p>
          </div>
        </>
      )}
    </Shell>
  );
}
