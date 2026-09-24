import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, ExternalLink, Check, X, Sparkles, Megaphone } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import { useMyIdentity } from '../context/MyIdentityContext.jsx';
import Avatar from '../components/Avatar.jsx';
import {
  getLaunch, giveLaunchFeedback, markFeedbackHelpful,
  postLaunchUpdate, closeLaunch, getLaunchReading,
} from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';

/**
 * One launch: try it, then say what happened.
 *
 * THE FEEDBACK IS THREE FIXED QUESTIONS, not a comment box. An open box
 * produces "cool idea, congrats", which is pleasant and useless. Did you
 * actually open it, would you come back, and what broke are answerable,
 * honest, and they aggregate into a number that means something.
 *
 * THE FOUNDER'S READING IS LOADED SEPARATELY AND LAST. Every response renders
 * without it, so a rate limit or an outage costs a summary, never the page.
 */

const STATE_LABEL = {
  CONCEPT: 'Nothing to click yet, this is the idea written down',
  INTERFACE: 'Clickable screens, nothing behind them yet',
  PROTOTYPE: 'Partly working, expect rough edges',
  LIVE: 'Live and usable',
};

export default function LaunchDetail() {
  const { persona } = useMyIdentity();
  const { id } = useParams();
  const showToast = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  // Feedback form
  const [tried, setTried] = useState(null);
  const [wouldUse, setWouldUse] = useState(null);
  const [what, setWhat] = useState('');
  const [answers, setAnswers] = useState([]);
  const [saving, setSaving] = useState(false);

  // Founder-only
  const [reading, setReading] = useState(null);
  const [readingLoading, setReadingLoading] = useState(false);
  const [updateText, setUpdateText] = useState('');

  async function load() {
    const { ok, data: d } = await getLaunch(id);
    if (ok && d.success) {
      setData(d);
      if (d.yourFeedback) {
        setTried(d.yourFeedback.tried);
        setWouldUse(d.yourFeedback.would_use_again);
        setWhat(d.yourFeedback.what_happened);
        setAnswers(d.yourFeedback.answers || []);
      }
    }
  }
  useEffect(() => { load().then(() => setLoading(false)); }, [id]);

  // Only after the page exists. The reading is an addition, never a dependency.
  useEffect(() => {
    if (!data?.isFounder || data.feedback.length === 0) return;
    setReadingLoading(true);
    getLaunchReading(id).then(({ ok, data: r }) => {
      if (ok && r.success) setReading(r);
      setReadingLoading(false);
    });
  }, [data?.isFounder, data?.feedback?.length, id]);

  async function submit() {
    if (tried === null) { showToast('Say whether you actually opened it.', 'error'); return; }
    if (what.trim().length < 10) { showToast('Say a bit more about what happened.', 'error'); return; }
    setSaving(true);
    const { ok, data: r } = await giveLaunchFeedback(id, {
      tried, wouldUseAgain: wouldUse, whatHappened: what, answers,
    });
    setSaving(false);
    if (!ok || !r?.success) { showToast('Could not save that.', 'error'); return; }
    showToast('Sent. The founder will see it.');
    await load();
  }

  async function handleHelpful(f) {
    const { ok } = await markFeedbackHelpful(f.id);
    if (!ok) { showToast('Could not save that.', 'error'); return; }
    await load();
  }

  async function handleUpdate() {
    if (updateText.trim().length < 10) { showToast('Say what changed.', 'error'); return; }
    const { ok } = await postLaunchUpdate(id, updateText);
    if (!ok) { showToast('Could not post that.', 'error'); return; }
    setUpdateText('');
    showToast('Posted. Everyone who responded has been told.');
    await load();
  }

  async function handleClose() {
    const { ok } = await closeLaunch(id);
    if (!ok) { showToast('Could not do that.', 'error'); return; }
    await load();
  }

  if (loading) {
    return (
      <Shell persona={persona} title="Launch">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" />
        </div>
      </Shell>
    );
  }

  if (!data) {
    return (
      <Shell persona={persona} title="Launch">
        <div className="bg-surface rounded-xl border border-surface-border shadow-card py-16 text-center">
          <p className="text-[15px] text-ink-700">This launch does not exist.</p>
          <Link to="/app/launches" className="text-[13px] text-violet-700 hover:text-violet-600 transition-colors">Back to everything else</Link>
        </div>
      </Shell>
    );
  }

  const { launch, feedback, updates, isFounder, yourFeedback, summary } = data;
  const questions = launch.questions || [];

  return (
    <Shell persona={persona} title={launch.title} subtitle={launch.startup_name}>
      <Link to="/app/launches" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition-colors mb-5">
        <ArrowLeft size={15} /> All launches
      </Link>

      <div className="grid grid-cols-[1fr_360px] gap-7 items-start">
        <div>
          {/* The thing itself. */}
          <div className="bg-surface rounded-xl border border-surface-border shadow-card overflow-hidden mb-6">
            {launch.images?.length > 0 && (
              <div className={`grid gap-1 ${launch.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {launch.images.map((src, i) => (
                  <img key={i} src={src} alt="" className="w-full object-cover" style={{ maxHeight: launch.images.length === 1 ? 380 : 220 }} />
                ))}
              </div>
            )}

            <div className="p-7">
              <div className="flex items-center gap-2.5 mb-4">
                <Avatar name={launch.founder_name} src={launch.founder_avatar} size={30} />
                <div>
                  <p className="text-[13.5px] font-medium text-ink-950">{launch.founder_name}</p>
                  <p className="text-[12px] text-ink-500">{launch.startup_name}</p>
                </div>
              </div>

              <p className="text-[15.5px] text-ink-800 leading-relaxed whitespace-pre-wrap">{launch.summary}</p>

              {/* Said plainly, so people give useful feedback instead of
                  reporting that the buttons do not save. */}
              <p className="text-[13px] text-ink-500 mt-4 pt-4 border-t border-surface-border">
                {STATE_LABEL[launch.state]}
              </p>

              {launch.link && (
                <a
                  href={launch.link} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-5 bg-ink-900 hover:bg-ink-700 text-white px-5 py-3 rounded-full text-[14.5px] font-medium transition-colors"
                >
                  Open it and have a look <ExternalLink size={15} />
                </a>
              )}
            </div>
          </div>

          {/* What the founder changed. */}
          {updates.length > 0 && (
            <div className="bg-surface rounded-xl border border-surface-border shadow-card p-6 mb-6">
              <p className="flex items-center gap-2 text-[13px] font-semibold text-ink-900 mb-3">
                <Megaphone size={14} className="text-violet-600" /> What has changed since
              </p>
              <div className="space-y-3">
                {updates.map((u) => (
                  <p key={u.id} className="text-[13.5px] text-ink-700 leading-relaxed pl-3 border-l-2 border-violet-500/30">
                    {u.body}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Everything people said. Renders with or without the summary. */}
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-[15px] font-semibold text-ink-900">
              {feedback.length === 0 ? 'Nobody has responded yet' : `${feedback.length} ${feedback.length === 1 ? 'response' : 'responses'}`}
            </h2>
            {summary.tried > 0 && (
              <span className="text-[13px] text-ink-500">
                {summary.wouldUseAgain} of {summary.wouldUseAgainOf} who tried it would use it again
              </span>
            )}
          </div>

          <div className="space-y-3">
            {feedback.map((f, i) => (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.2) }}
                className="relative overflow-hidden bg-surface rounded-xl border border-surface-border shadow-card p-6 pl-7"
              >
                <span className="absolute left-0 top-0 bottom-0 w-[3px]"
                      style={{ backgroundColor: !f.tried ? '#E4E3EC' : f.would_use_again ? '#3FB081' : '#E15C4D' }} />

                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar name={f.display_name} src={f.profile_image} size={26} />
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-medium text-ink-950 truncate">{f.display_name}</p>
                      <p className="text-[11.5px] text-ink-500 truncate">{f.headline}</p>
                    </div>
                  </div>
                  <span className="text-[11.5px] font-medium shrink-0"
                        style={{ color: !f.tried ? '#8A8A99' : f.would_use_again ? '#1F5D52' : '#E15C4D' }}>
                    {!f.tried ? 'Did not try it' : f.would_use_again ? 'Would use again' : 'Would not use again'}
                  </span>
                </div>

                <p className="text-[14px] text-ink-800 leading-relaxed whitespace-pre-wrap">{f.what_happened}</p>

                {(f.answers || []).length > 0 && (
                  <div className="mt-3.5 pt-3.5 border-t border-surface-border space-y-2">
                    {(f.answers || []).map((a, qi) => a ? (
                      <div key={qi}>
                        <p className="text-[12px] text-ink-500">{questions[qi]}</p>
                        <p className="text-[13.5px] text-ink-800">{a}</p>
                      </div>
                    ) : null)}
                  </div>
                )}

                {isFounder && (
                  <button
                    onClick={() => handleHelpful(f)}
                    className={`flex items-center gap-1.5 text-[12.5px] mt-3 transition-colors ${
                      f.marked_helpful ? 'text-mint-500' : 'text-ink-300 hover:text-ink-700'
                    }`}
                  >
                    <Sparkles size={12.5} /> {f.marked_helpful ? 'You found this useful' : 'Mark as useful'}
                  </button>
                )}
                {!isFounder && f.marked_helpful && (
                  <p className="flex items-center gap-1.5 text-[12px] text-mint-500 mt-3">
                    <Sparkles size={12} /> The founder found this useful
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right column: respond, or read it as the founder. */}
        <div className="sticky top-6 space-y-5">
          {!isFounder && !launch.closed_at && (
            <div className="bg-surface rounded-xl border border-surface-border shadow-card p-6">
              <p className="text-[15px] font-semibold text-ink-950 mb-1">
                {yourFeedback ? 'Change what you said' : 'Say what happened'}
              </p>
              <p className="text-[12.5px] text-ink-500 mb-5">
                Open it first. Honest beats kind here.
              </p>

              <p className="text-[13px] font-medium text-ink-700 mb-2">Did you actually open it?</p>
              <div className="flex gap-2 mb-5">
                {[[true, 'Yes, I tried it'], [false, 'No, not yet']].map(([v, label]) => (
                  <button key={String(v)} onClick={() => setTried(v)}
                    className={`flex-1 text-[13px] px-3 py-2.5 rounded-lg border transition-colors ${
                      tried === v ? 'bg-ink-900 text-white border-ink-900' : 'border-surface-border text-ink-700 hover:border-ink-300'
                    }`}>{label}</button>
                ))}
              </div>

              {tried && (
                <>
                  <p className="text-[13px] font-medium text-ink-700 mb-2">Would you use it again?</p>
                  <div className="flex gap-2 mb-5">
                    {[[true, 'Yes'], [false, 'No']].map(([v, label]) => (
                      <button key={String(v)} onClick={() => setWouldUse(v)}
                        className={`flex-1 flex items-center justify-center gap-1.5 text-[13px] px-3 py-2.5 rounded-lg border transition-colors ${
                          wouldUse === v ? 'bg-ink-900 text-white border-ink-900' : 'border-surface-border text-ink-700 hover:border-ink-300'
                        }`}>
                        {v ? <Check size={13} /> : <X size={13} />} {label}
                      </button>
                    ))}
                  </div>
                </>
              )}

              <p className="text-[13px] font-medium text-ink-700 mb-2">What broke or confused you?</p>
              <textarea
                value={what} onChange={(e) => setWhat(e.target.value)} rows={4}
                placeholder="I got as far as… then…"
                className="w-full px-3.5 py-3 rounded-lg border border-surface-border bg-surface-muted text-[13.5px] text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-violet-500 focus:bg-surface transition-colors resize-none leading-relaxed mb-5"
              />

              {questions.map((q, qi) => (
                <div key={qi} className="mb-4">
                  <p className="text-[13px] font-medium text-ink-700 mb-2">{q}</p>
                  <input
                    value={answers[qi] || ''}
                    onChange={(e) => { const a = [...answers]; a[qi] = e.target.value; setAnswers(a); }}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-surface-border bg-surface-muted text-[13.5px] text-ink-900 focus:outline-none focus:border-violet-500 focus:bg-surface transition-colors"
                  />
                </div>
              ))}

              <button
                onClick={submit} disabled={saving}
                className="w-full bg-ink-900 hover:bg-ink-700 text-white py-3 rounded-full text-[14px] font-medium transition-colors disabled:opacity-50"
              >
                {saving ? 'Sending…' : yourFeedback ? 'Update what you said' : 'Send it'}
              </button>
            </div>
          )}

          {isFounder && (
            <>
              {/* The reading. Appears when it appears; the page never waited. */}
              <div className="bg-surface rounded-xl border border-surface-border shadow-card p-6">
                <p className="text-[15px] font-semibold text-ink-950 mb-1">What this is telling you</p>
                <p className="text-[12.5px] text-ink-500 mb-4">Only you see this.</p>

                {feedback.length === 0 ? (
                  <p className="text-[13.5px] text-ink-500 leading-relaxed">Nothing to read yet.</p>
                ) : readingLoading ? (
                  <div className="flex items-center gap-2 text-[13px] text-ink-500">
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" />
                    Reading what people said…
                  </div>
                ) : reading?.tooEarly ? (
                  <p className="text-[13.5px] text-ink-700 leading-relaxed">{reading.note}</p>
                ) : reading?.degraded ? (
                  <div>
                    <p className="text-[13px] text-amber-700 leading-relaxed mb-3">{reading.note}</p>
                    <p className="text-[13.5px] text-ink-800">
                      {reading.facts.tried} of {reading.facts.responded} tried it.
                      {' '}{reading.facts.wouldUseAgain} would use it again, {reading.facts.wouldNot} would not.
                    </p>
                  </div>
                ) : reading?.reading ? (
                  <p className="text-[13.5px] text-ink-800 leading-relaxed whitespace-pre-wrap">{reading.reading}</p>
                ) : null}
              </div>

              <div className="bg-surface rounded-xl border border-surface-border shadow-card p-6">
                <p className="text-[15px] font-semibold text-ink-950 mb-1">Tell them what changed</p>
                <p className="text-[12.5px] text-ink-500 mb-4">
                  Everyone who responded gets told. Somebody who reported a problem hears that you fixed it.
                </p>
                <textarea
                  value={updateText} onChange={(e) => setUpdateText(e.target.value)} rows={3}
                  placeholder="Fixed the signup step three of you got stuck on."
                  className="w-full px-3.5 py-3 rounded-lg border border-surface-border bg-surface-muted text-[13.5px] text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-violet-500 focus:bg-surface transition-colors resize-none mb-3"
                />
                <button onClick={handleUpdate} className="w-full bg-ink-900 hover:bg-ink-700 text-white py-2.5 rounded-full text-[13.5px] font-medium transition-colors">
                  Post the update
                </button>
              </div>

              <button onClick={handleClose} className="w-full text-[13px] text-ink-500 hover:text-ink-900 transition-colors">
                {launch.closed_at ? 'Start collecting feedback again' : 'Stop collecting feedback'}
              </button>
            </>
          )}

          {launch.closed_at && !isFounder && (
            <div className="bg-surface rounded-xl border border-surface-border shadow-card p-6">
              <p className="text-[13.5px] text-ink-700">This founder has stopped collecting feedback.</p>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
