import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Check, HelpCircle, Crosshair, Info, Globe, ExternalLink } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import { getCompetitorAnalysis, runCompetitorAnalysis, getCompetitorResearch, runCompetitorResearch } from '../services/startups.js';
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
  const [research, setResearch] = useState(null);
  const [researching, setResearching] = useState(false);

  useEffect(() => {
    async function load() {
      if (startupLoading) return;
      if (activeStartup) {
        setStartup(activeStartup);
        const [res, resr] = await Promise.all([
          getCompetitorAnalysis(activeStartup.id),
          getCompetitorResearch(activeStartup.id),
        ]);
        if (res.ok && res.data.success && res.data.analyses.length > 0) setAnalysis(res.data.analyses[0]);
        if (resr.ok && resr.data.success && resr.data.research) setResearch(resr.data.research);
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

  async function handleResearch() {
    if (!startup) { showToast('No venture yet. Describe your idea first.', 'error'); return; }
    setResearching(true);
    const { ok, data } = await runCompetitorResearch(startup.id);
    setResearching(false);
    if (!ok || !data.success) {
      showToast(
        data?.error === 'NO_RESULTS' ? 'Nothing came back from the web for this venture yet.'
        : data?.error === 'NOTHING_TO_RESEARCH' ? 'Add a problem and solution first so there is something to search on.'
        : data?.detail || 'Could not research right now. Try again.',
        'error'
      );
      return;
    }
    setResearch(data.research);
    const found = (data.research.researched_competitors || []).length;
    showToast(found > 0 ? `Found ${found} real ${found === 1 ? 'company' : 'companies'} doing something similar.` : 'Nothing genuinely comparable came back. That is worth knowing too.');
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

  const realCount = (research?.researched_competitors || []).length;
  const opportunities = analysis?.differentiation_opportunities || [];
  const questions = analysis?.positioning_questions || [];

  return (
    <Shell title={startup?.name || 'Who else is doing this'} subtitle="Where you sit in the market">
      <div className="mb-7 flex items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-violet-600 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
            {realCount > 0 ? 'From the live web' : analysis ? analysis.comparable_category : 'Not looked at yet'}
          </p>
          {/* Leads with what is REAL. The inference used to be the whole page,
              so the headline described it. Now that actual named companies sit
              above it, the headline should describe those instead. */}
          <h1 className="font-editorial italic text-[32px] text-trust-fg leading-tight max-w-3xl">
            {realCount > 0
              ? `${realCount} ${realCount === 1 ? 'company is' : 'companies are'} already working on this.`
              : research
                ? 'Nobody comparable came back from the web.'
                : analysis
                  ? `${questions.length} thing${questions.length === 1 ? '' : 's'} to go and find out.`
                  : 'Nobody has looked at where you sit yet.'}
          </h1>
          <p className="text-[15px] text-ink-700 mt-3 max-w-2xl leading-relaxed">
            {realCount > 0
              ? 'Found on the live web, not recalled from memory. Every one links to where it was found, so you can check it yourself.'
              : research
                ? 'That can mean the space is genuinely open, or that the problem is described in words the web does not use.'
                : 'CapForge searches the live web for who is already solving this, then works out where the gap actually is.'}
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

      {/* REAL COMPANIES, above the inference. Named, linked, and every one
          verified against the search results that actually came back. */}
      <div className="mb-6">
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <h2 className="text-[15px] font-semibold text-ink-900">Who is actually doing this</h2>
            <p className="text-[13px] text-ink-500 mt-0.5">Real companies, found on the live web. Every one links to where it was found.</p>
          </div>
          <button
            onClick={handleResearch}
            disabled={researching || !startup}
            className="shrink-0 flex items-center gap-2 text-[13px] font-medium text-violet-700 hover:text-violet-600 transition-colors disabled:opacity-50"
          >
            <Globe size={14} className={researching ? 'animate-pulse' : ''} />
            {researching ? 'Searching the web…' : research ? 'Search again' : 'Find real competitors'}
          </button>
        </div>

        {!research ? (
          <div className="bg-surface rounded-xl border border-surface-border shadow-card py-12 text-center">
            <Globe size={20} className="text-ink-300 mx-auto mb-3" />
            <p className="text-[14.5px] text-ink-700 mb-1">Nobody has looked yet.</p>
            <p className="text-[13px] text-ink-500 max-w-md mx-auto">
              This searches the live web for companies solving the same problem, then names them. Nothing is recalled from memory: if a company is not in the results, it does not appear.
            </p>
          </div>
        ) : (research.researched_competitors || []).length === 0 ? (
          <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
            <p className="text-[14.5px] font-semibold text-ink-950 mb-1.5">Nothing genuinely comparable came back.</p>
            <p className="text-[13.5px] text-ink-700 leading-relaxed">
              {research.market_gap || 'The search did not surface companies doing this. That can mean the space is genuinely open, or that the problem is described in language the web does not use. Both are worth knowing.'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 mb-4">
              {(research.researched_competitors || []).map((c, i) => (
                <motion.div
                  key={c.url || c.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.25) }}
                  className="bg-surface rounded-xl border border-surface-border shadow-card p-6"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="text-[16px] font-semibold text-ink-950">{c.name}</p>
                    {c.url && (
                      <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-ink-300 hover:text-violet-600 transition-colors shrink-0" title="Where this was found">
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                  {c.what_they_do && <p className="text-[13.5px] text-ink-700 leading-relaxed mb-3">{c.what_they_do}</p>}
                  {c.how_they_differ && (
                    <div className="pt-3 border-t border-surface-border">
                      <p className="text-[11px] font-semibold tracking-wide uppercase text-ink-300 mb-1">Against you</p>
                      <p className="text-[13px] text-ink-700 leading-relaxed">{c.how_they_differ}</p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            {research.market_gap && (
              <div className="relative overflow-hidden rounded-xl bg-ink-950 p-7">
                <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle at 15% 20%, #7C5CFC 0%, transparent 55%), radial-gradient(circle at 85% 80%, #1F5D52 0%, transparent 55%)' }} />
                <div className="relative">
                  <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-mint-500 mb-3">What none of them are doing</p>
                  <p className="text-[15.5px] text-white/85 leading-relaxed max-w-2xl">{research.market_gap}</p>
                </div>
              </div>
            )}
          </>
        )}
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
                  <h2 className="text-[15px] font-semibold text-ink-900">Questions worth answering yourself</h2>
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
