import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Check, Flag, RotateCcw } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import MetricTile, { TILE_PALETTE } from '../components/charts/MetricTile.jsx';
import { getMilestones, generateMilestones, updateMilestone } from '../services/startups.js';
import { useActiveStartup } from '../context/ActiveStartupContext.jsx';
import { useToast } from '../components/Toast.jsx';

/**
 * What to do next.
 *
 * This was a flat list of numbered rows inside one box. Every milestone
 * looked the same, so the thing a founder should be doing right now sat
 * level with something four steps away. It also gave no sense of progress,
 * which is the entire reason to keep a list like this.
 *
 * The next unfinished step now leads, the rest form a real sequence behind
 * it, and completed work is separated out so the list shortens visibly as
 * you go.
 */

export default function Milestones() {
  const { activeStartup, loading: startupLoading } = useActiveStartup();
  const showToast = useToast();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [startup, setStartup] = useState(null);
  const [milestones, setMilestones] = useState([]);

  async function loadMilestones(startupId) {
    const { ok, data } = await getMilestones(startupId);
    if (ok && data.success) setMilestones(data.milestones);
  }

  useEffect(() => {
    async function load() {
      if (startupLoading) return;
      if (activeStartup) {
        setStartup(activeStartup);
        await loadMilestones(activeStartup.id);
      }
      setLoading(false);
    }
    load();
  }, [activeStartup?.id, startupLoading]);

  async function handleGenerate() {
    if (!startup) { showToast('No venture yet. Describe your idea first.', 'error'); return; }
    setGenerating(true);
    const { ok, data } = await generateMilestones(startup.id);
    setGenerating(false);
    if (!ok || !data.success) { showToast(data.detail || data.error || 'Could not work out the steps.', 'error'); return; }
    await loadMilestones(startup.id);
    showToast('Here is what to do next.');
  }

  async function toggleStatus(m) {
    const next = m.status === 'COMPLETED' ? 'ACCEPTED' : 'COMPLETED';
    const { ok, data } = await updateMilestone(m.id, { status: next });
    if (ok && data.success) {
      setMilestones(milestones.map((x) => (x.id === m.id ? data.milestone : x)));
      if (next === 'COMPLETED') showToast('Done. That moves your readiness.');
    } else showToast('Could not update that.', 'error');
  }

  if (loading) {
    return (
      <Shell title="What to do next">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" />
        </div>
      </Shell>
    );
  }

  const ordered = [...milestones].sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0));
  const done = ordered.filter((m) => m.status === 'COMPLETED');
  const todo = ordered.filter((m) => m.status !== 'COMPLETED');
  const next = todo[0] || null;
  const upcoming = todo.slice(1);
  const pct = ordered.length > 0 ? Math.round((done.length / ordered.length) * 100) : 0;

  return (
    <Shell title={startup?.name || 'What to do next'} subtitle="The sequence that moves this forward">
      <div className="mb-7 flex items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-violet-600 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
            {ordered.length === 0 ? 'Nothing planned yet' : todo.length === 0 ? 'All done' : `${done.length} of ${ordered.length} done`}
          </p>
          <h1 className="font-editorial italic text-[32px] text-trust-fg leading-tight max-w-3xl">
            {next ? next.title : ordered.length === 0 ? 'Nobody has mapped out the steps yet.' : 'Everything on the list is done.'}
          </h1>
          <p className="text-[15px] text-ink-700 mt-3 max-w-2xl leading-relaxed">
            {ordered.length === 0
              ? 'CapForge reads your venture and works out the order things need to happen in, so you are not guessing what comes first.'
              : todo.length === 0
                ? 'Generate the next set when you are ready for what comes after this.'
                : 'Each one you finish moves your readiness, which is what investors see.'}
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating || !startup}
          className="shrink-0 flex items-center gap-2 text-[13px] font-medium bg-ink-900 hover:bg-ink-700 text-white px-4 py-2.5 rounded-full transition-colors disabled:opacity-50"
        >
          <Sparkles size={14} className={generating ? 'animate-pulse' : ''} />
          {generating ? 'Working it out…' : ordered.length === 0 ? 'Work out my steps' : 'Regenerate'}
        </button>
      </div>

      {ordered.length === 0 ? (
        <div className="bg-surface rounded-xl border border-surface-border shadow-card py-16 text-center">
          <Flag size={22} className="text-ink-300 mx-auto mb-3" />
          <p className="text-[15px] text-ink-700 mb-1">No steps mapped out yet.</p>
          <p className="text-[13px] text-ink-500 mb-6 max-w-sm mx-auto">
            Based on what your venture is and where it has got to, CapForge will work out the order things should happen in.
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-2 text-[13px] font-medium bg-ink-900 hover:bg-ink-700 text-white px-5 py-2.5 rounded-full transition-colors disabled:opacity-50"
          >
            <Sparkles size={14} /> {generating ? 'Working it out…' : 'Work out my steps'}
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-8">
            <MetricTile
              label="Done" value={done.length} unit={`/ ${ordered.length}`}
              icon={Check} {...TILE_PALETTE.blue}
              progress={pct}
              caption={`${pct}% of the way through`}
            />
            <MetricTile
              label="Still to do" value={todo.length}
              icon={Flag} {...TILE_PALETTE.peach}
              caption={todo.length === 0 ? 'Nothing outstanding' : 'In order'}
            />
            <MetricTile
              label="Up next" value={next ? `#${next.sequence_order}` : '—'}
              icon={Sparkles} {...TILE_PALETTE.lavender}
              caption={next ? next.title : 'Nothing queued'}
            />
          </div>

          {next && (
            <div className="mb-8">
              <h2 className="text-[15px] font-semibold text-ink-900 mb-3">Do this next</h2>
              <div className="relative overflow-hidden rounded-xl bg-ink-950 p-7">
                <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle at 15% 20%, #7C5CFC 0%, transparent 55%), radial-gradient(circle at 85% 80%, #1F5D52 0%, transparent 55%)' }} />
                <div className="relative flex items-start justify-between gap-8">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium tracking-[0.12em] uppercase text-mint-500 mb-2">
                      Step {next.sequence_order}{next.source === 'AI' ? '' : ' · yours'}
                    </p>
                    <p className="font-display text-[24px] font-semibold text-white leading-snug mb-2">{next.title}</p>
                    {next.description && <p className="text-[14px] text-white/60 leading-relaxed max-w-xl">{next.description}</p>}
                  </div>
                  <button
                    onClick={() => toggleStatus(next)}
                    className="shrink-0 flex items-center gap-2 bg-white hover:bg-white/90 text-ink-950 px-5 py-2.5 rounded-full text-[14px] font-medium transition-colors"
                  >
                    <Check size={15} /> Done
                  </button>
                </div>
              </div>
            </div>
          )}

          {upcoming.length > 0 && (
            <div className="mb-8">
              <h2 className="text-[15px] font-semibold text-ink-900 mb-3">After that</h2>
              <div className="space-y-3">
                {upcoming.map((m, i) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.25) }}
                    className="flex items-start gap-4 bg-surface rounded-xl border border-surface-border shadow-card p-5"
                  >
                    <div className="w-7 h-7 rounded-full bg-surface-muted text-ink-500 text-[12.5px] font-semibold flex items-center justify-center shrink-0">
                      {m.sequence_order}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14.5px] font-medium text-ink-950">{m.title}</p>
                      {m.description && <p className="text-[13px] text-ink-700 mt-1 leading-relaxed">{m.description}</p>}
                    </div>
                    <button
                      onClick={() => toggleStatus(m)}
                      className="shrink-0 text-[12.5px] font-medium text-ink-500 hover:text-violet-700 border border-surface-border px-3.5 py-1.5 rounded-full transition-colors"
                    >
                      Done
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {done.length > 0 && (
            <div>
              <h2 className="text-[15px] font-semibold text-ink-900 mb-3">Behind you</h2>
              <div className="space-y-2.5">
                {done.map((m) => (
                  <div key={m.id} className="flex items-center gap-4 bg-surface rounded-xl border border-surface-border shadow-card px-5 py-3.5">
                    <div className="w-7 h-7 rounded-full bg-mint-50 text-mint-500 flex items-center justify-center shrink-0">
                      <Check size={14} />
                    </div>
                    <p className="text-[14px] text-ink-500 flex-1 min-w-0 truncate">{m.title}</p>
                    <button
                      onClick={() => toggleStatus(m)}
                      className="shrink-0 flex items-center gap-1.5 text-[12.5px] text-ink-300 hover:text-ink-700 transition-colors"
                    >
                      <RotateCcw size={12} /> Reopen
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Shell>
  );
}
