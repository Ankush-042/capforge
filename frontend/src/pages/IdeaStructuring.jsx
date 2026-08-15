import React, { useState } from 'react';
import { apiFetch } from '../services/api.js';

/**
 * The AI Idea-Structuring screen — per UI/UX spec §31, deliberately built
 * as one of the strongest, most trust-establishing screens in the product.
 * Two states: raw input, then "CapForge Understanding" (the structured
 * result, editable, never presented as immutable fact — §71 AI Editability).
 */

const PROCESSING_MESSAGES = [
  'Understanding your venture',
  'Identifying required capabilities',
  'Preparing your venture profile'
];

function Chip({ children }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm bg-accent-100 text-accent-600 mr-2 mb-2">
      {children}
    </span>
  );
}

function ConfidenceBadge({ level }) {
  const styles = {
    high: 'bg-accent-100 text-accent-600',
    medium: 'bg-surface-200 text-ink-700',
    low: 'bg-surface-100 text-ink-500'
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${styles[level] || styles.medium}`}>
      {level || 'medium'} confidence
    </span>
  );
}

export default function IdeaStructuring() {
  const [rawIdea, setRawIdea] = useState('');
  const [name, setName] = useState('');
  const [phase, setPhase] = useState('input'); // input | processing | review | error
  const [processingStep, setProcessingStep] = useState(0);
  const [startup, setStartup] = useState(null);
  const [error, setError] = useState(null);

  async function handleAnalyze() {
    if (!name.trim() || rawIdea.trim().length < 10) {
      setError('Give it a name, and describe the idea in a bit more detail.');
      return;
    }
    setError(null);
    setPhase('processing');

    const stepTimer = setInterval(() => {
      setProcessingStep((s) => (s + 1) % PROCESSING_MESSAGES.length);
    }, 1400);

    const { ok, data } = await apiFetch('/startups', {
      method: 'POST',
      body: JSON.stringify({ name, rawIdea })
    });

    clearInterval(stepTimer);

    if (!ok || !data.success) {
      setPhase('error');
      setError(data.errors?.join(' ') || data.detail || 'We couldn\'t complete the venture analysis. Your idea is safe — try again.');
      return;
    }
    setStartup(data.startup);
    setPhase('review');
  }

  async function handleConfirm() {
    const { ok, data } = await apiFetch(`/startups/${startup.id}/confirm`, {
      method: 'PATCH',
      body: JSON.stringify({})
    });
    if (ok && data.success) setStartup(data.startup);
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-16">
      <div className="w-full max-w-2xl">
        <header className="mb-10">
          <p className="text-sm text-ink-500 mb-1">CapForge</p>
          <h1 className="text-2xl font-semibold text-ink-950">Tell CapForge about your startup</h1>
        </header>

        {phase === 'input' || phase === 'error' ? (
          <div className="bg-surface-0 rounded-lg shadow-subtle border border-surface-200 p-6">
            <label className="block text-sm font-medium text-ink-700 mb-2">Startup name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. FoodSense"
              className="w-full mb-5 px-4 py-2.5 rounded-md border border-surface-200 bg-surface-50 text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500"
            />
            <label className="block text-sm font-medium text-ink-700 mb-2">Describe your idea, in your own words</label>
            <textarea
              value={rawIdea}
              onChange={(e) => setRawIdea(e.target.value)}
              rows={6}
              placeholder="I want to build..."
              className="w-full px-4 py-3 rounded-md border border-surface-200 bg-surface-50 text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500 resize-none"
            />
            {error && <p className="text-sm text-signal-critical mt-3">{error}</p>}
            <div className="flex justify-end mt-6">
              <button
                onClick={handleAnalyze}
                className="px-5 py-2.5 rounded-md bg-ink-950 text-white text-sm font-medium hover:bg-ink-900 transition-colors"
              >
                Analyze idea
              </button>
            </div>
          </div>
        ) : null}

        {phase === 'processing' ? (
          <div className="bg-surface-0 rounded-lg shadow-subtle border border-surface-200 p-10 flex flex-col items-center">
            <div className="w-8 h-8 rounded-full border-2 border-surface-200 border-t-accent-500 animate-spin mb-5" />
            <p className="text-ink-700 text-sm">{PROCESSING_MESSAGES[processingStep]}…</p>
          </div>
        ) : null}

        {phase === 'review' && startup ? (
          <div className="bg-surface-0 rounded-lg shadow-subtle border border-surface-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-semibold tracking-wide text-ink-500 uppercase">CapForge Understanding</h2>
              {startup.founder_confirmed && (
                <span className="text-xs px-2 py-1 rounded-full bg-accent-100 text-accent-600">Confirmed</span>
              )}
            </div>

            <Section label="Problem" confidence={startup.confidence?.problem}>{startup.problem}</Section>
            <Section label="Solution" confidence={startup.confidence?.solution}>{startup.solution}</Section>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-sm font-medium text-ink-700 mb-2">Domain</p>
                {(startup.domain || []).map((d) => <Chip key={d}>{d}</Chip>)}
              </div>
              <div>
                <p className="text-sm font-medium text-ink-700 mb-2">Stage</p>
                <Chip>{startup.stage}</Chip>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm font-medium text-ink-700 mb-3">Required roles</p>
              <div className="space-y-2">
                {(startup.role_requirements || []).map((r) => (
                  <div key={r.role} className="bg-surface-50 border border-surface-200 rounded-md p-3">
                    <p className="text-sm font-medium text-ink-900 mb-1">{r.role}</p>
                    <div className="flex flex-wrap">{(r.skills || []).map((s) => <Chip key={s}>{s}</Chip>)}</div>
                  </div>
                ))}
              </div>
            </div>

            {(startup.clarification_needed || []).length > 0 && (
              <div className="mb-6 bg-surface-100 rounded-md p-4">
                <p className="text-sm font-medium text-ink-700 mb-2">Worth clarifying</p>
                <ul className="text-sm text-ink-700 space-y-1 list-disc list-inside">
                  {startup.clarification_needed.map((q) => <li key={q}>{q}</li>)}
                </ul>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t border-surface-200 mt-2">
              <button
                onClick={() => setPhase('input')}
                className="px-4 py-2 rounded-md text-sm font-medium text-ink-700 hover:bg-surface-100 transition-colors"
              >
                Edit
              </button>
              {!startup.founder_confirmed && (
                <button
                  onClick={handleConfirm}
                  className="px-5 py-2.5 rounded-md bg-accent-600 text-white text-sm font-medium hover:bg-accent-500 transition-colors"
                >
                  Confirm & continue
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Section({ label, confidence, children }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-1.5">
        <p className="text-sm font-medium text-ink-700">{label}</p>
        <ConfidenceBadge level={confidence} />
      </div>
      <p className="text-ink-900 text-[15px] leading-relaxed">{children || '—'}</p>
    </div>
  );
}
