import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Send, X, AlertTriangle } from 'lucide-react';
import { askAboutVenture } from '../services/startups.js';

/**
 * Ask about your own venture.
 *
 * Deliberately NOT a general chatbot. It answers only from this venture's
 * real data: the actual readiness score, the actual open roles, the actual
 * risks. Anyone can get generic startup advice elsewhere, and offering it here
 * would dilute the one thing this product has, which is numbers that are
 * genuinely computed rather than asserted.
 *
 * When the AI is unavailable the server returns the real figures instead of
 * failing, and this renders them. Proven with a simulated total outage rather
 * than assumed: a founder still learns they are 1 point from investor
 * visibility even when no model is reachable.
 */

const SUGGESTIONS = [
  'How close am I to investors seeing me?',
  'What is holding my readiness back?',
  'Which role should I fill first, and why?',
];

function DegradedFacts({ facts, note }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
      <div className="flex items-start gap-2.5 mb-3">
        <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
        <p className="text-[13.5px] text-amber-800 leading-relaxed">{note}</p>
      </div>
      <div className="space-y-1.5 pl-[26px]">
        {facts.score !== null && (
          <p className="text-[13.5px] text-amber-800">
            Readiness {facts.score}
            {facts.visibleToInvestors ? ' — investors can see you.' : ` — ${facts.pointsFromVisibility} from investor visibility.`}
          </p>
        )}
        {facts.openRoles?.length > 0 && (
          <p className="text-[13.5px] text-amber-800">Open roles: {facts.openRoles.join(', ')}.</p>
        )}
        {facts.criticalRisks?.length > 0 && (
          <p className="text-[13.5px] text-amber-800">Critical risks: {facts.criticalRisks.join(', ')}.</p>
        )}
        {facts.nextMilestone && <p className="text-[13.5px] text-amber-800">Next milestone: {facts.nextMilestone}.</p>}
      </div>
    </div>
  );
}

export default function VentureAssistant({ startupId, startupName }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [thread, setThread] = useState([]);
  const [asking, setAsking] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [thread, asking]);

  async function ask(q) {
    const text = (q ?? question).trim();
    if (!text || asking || !startupId) return;
    setQuestion('');
    setThread((t) => [...t, { role: 'you', text }]);
    setAsking(true);

    const { ok, data } = await askAboutVenture(startupId, text);
    setAsking(false);

    if (!ok || !data?.success) {
      setThread((t) => [...t, {
        role: 'assistant',
        error: data?.error === 'NOT_AUTHORIZED'
          ? 'This is not your venture.'
          : 'Could not answer that right now. Nothing was lost, try again.',
      }]);
      return;
    }
    setThread((t) => [...t, { role: 'assistant', text: data.answer, degraded: data.degraded, facts: data.facts, note: data.note }]);
  }

  if (!startupId) return null;

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-ink-950 hover:bg-ink-900 text-white pl-4 pr-5 py-3 rounded-full shadow-elevated transition-colors"
        >
          <Sparkles size={15} className="text-mint-500" />
          <span className="text-[13.5px] font-medium">Ask about {startupName || 'your venture'}</span>
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-6 right-6 z-40 w-[420px] max-h-[70vh] bg-surface rounded-2xl border border-surface-border shadow-elevated flex flex-col overflow-hidden"
          >
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-surface-border">
              <div className="min-w-0">
                <p className="text-[14.5px] font-semibold text-ink-950 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-violet-600" /> Ask about {startupName || 'your venture'}
                </p>
                <p className="text-[12px] text-ink-500 mt-0.5">Answers only from your real data. Not general advice.</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-ink-300 hover:text-ink-900 transition-colors shrink-0">
                <X size={17} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-[200px]">
              {thread.length === 0 && (
                <div>
                  <p className="text-[13px] text-ink-500 mb-3 leading-relaxed">
                    It can see your readiness, your open roles, your risks and your milestones. It cannot see anything else, and will say so.
                  </p>
                  <div className="space-y-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => ask(s)}
                        className="w-full text-left text-[13px] text-ink-700 bg-surface-muted hover:bg-surface-border px-3.5 py-2.5 rounded-lg transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {thread.map((m, i) => (
                <div key={i}>
                  {m.role === 'you' ? (
                    <div className="flex justify-end">
                      <p className="max-w-[85%] bg-violet-600 text-white text-[13.5px] leading-relaxed px-3.5 py-2.5 rounded-2xl rounded-br-md">{m.text}</p>
                    </div>
                  ) : m.error ? (
                    <p className="text-[13.5px] text-signal-critical leading-relaxed">{m.error}</p>
                  ) : m.degraded ? (
                    <DegradedFacts facts={m.facts} note={m.note} />
                  ) : (
                    <p className="text-[13.5px] text-ink-900 leading-relaxed whitespace-pre-wrap">{m.text}</p>
                  )}
                </div>
              ))}

              {asking && (
                <div className="flex items-center gap-2 text-[13px] text-ink-500">
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" />
                  Reading your venture…
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-surface-border p-3 flex gap-2">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && ask()}
                placeholder="Ask something about this venture…"
                className="flex-1 px-3.5 py-2.5 rounded-full border border-surface-border bg-surface-muted text-[13.5px] text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-violet-500 focus:bg-surface transition-colors"
              />
              <button
                onClick={() => ask()}
                disabled={asking || !question.trim()}
                className="bg-violet-600 hover:bg-violet-700 text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors disabled:opacity-40 shrink-0"
              >
                <Send size={15} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
