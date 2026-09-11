import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronUp, ArrowUpRight, AlertTriangle, Check } from 'lucide-react';
import { createStartup, confirmStartup } from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';

/**
 * Where a venture comes into existence.
 *
 * The input form was fine. The REVEAL was not. After the AI read the idea,
 * the result landed in a grey card headed "CapForge Understanding" with
 * three labelled paragraphs, which is a form response, not a moment. It is
 * the first time a founder sees their own idea reflected back structured,
 * and it should feel like something happened.
 *
 * It now arrives as a real moment, and it names the thing that actually
 * follows: these are the roles you will need, and this is how many of them
 * nobody covers yet.
 */

const PROCESSING = [
  'Reading what you wrote',
  'Working out what this actually is',
  'Finding the roles it will need',
  'Putting your venture together',
];
const FUNDING_STAGES = ['Bootstrapped', 'Pre-seed', 'Seed', 'Series A+'];

const FIELD = 'w-full px-4 py-3 rounded-lg border border-surface-border bg-surface-muted text-[15px] text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-violet-500 focus:bg-surface transition-colors';

export default function Onboarding() {
  const navigate = useNavigate();
  const showToast = useToast();
  const [phase, setPhase] = useState('input');
  const [processingStep, setProcessingStep] = useState(0);
  const [showMore, setShowMore] = useState(false);
  const [error, setError] = useState(null);
  const [startup, setStartup] = useState(null);
  const [confirming, setConfirming] = useState(false);

  const [name, setName] = useState('');
  const [rawIdea, setRawIdea] = useState('');
  const [founderVision, setFounderVision] = useState('');
  const [currentTeamSize, setCurrentTeamSize] = useState('');
  const [fundingRaised, setFundingRaised] = useState('');
  const [fundingStage, setFundingStage] = useState('');
  const [targetTimeline, setTargetTimeline] = useState('');
  const [equityOfferedRange, setEquityOfferedRange] = useState('');
  const [founderPriorExperience, setFounderPriorExperience] = useState('');
  const [dpiitRecognized, setDpiitRecognized] = useState(false);
  const [cityTier, setCityTier] = useState('');

  async function handleAnalyze() {
    if (!name.trim() || rawIdea.trim().length < 10) {
      setError('Give it a name, and say a bit more about the idea.');
      return;
    }
    setError(null);
    setPhase('processing');
    setProcessingStep(0);
    const stepTimer = setInterval(() => setProcessingStep((s) => Math.min(s + 1, PROCESSING.length - 1)), 1600);

    const { ok, data } = await createStartup({
      name, rawIdea, founderVision: founderVision || undefined,
      currentTeamSize: currentTeamSize ? parseInt(currentTeamSize) : undefined,
      fundingRaised: fundingRaised ? parseFloat(fundingRaised) : undefined,
      fundingStage: fundingStage || undefined,
      targetTimeline: targetTimeline || undefined,
      equityOfferedRange: equityOfferedRange || undefined,
      founderPriorExperience: founderPriorExperience || undefined,
      dpiitRecognized,
      cityTier: cityTier || undefined,
    });
    clearInterval(stepTimer);

    if (!ok || !data.success) {
      setPhase('error');
      const msg = data.detail || data.error || 'Could not finish reading your idea. Nothing is lost, try again.';
      setError(msg);
      showToast(msg, 'error');
      return;
    }
    setStartup(data.startup);
    setPhase('review');
  }

  async function handleConfirm() {
    setConfirming(true);
    const { ok, data } = await confirmStartup(startup.id, {});
    setConfirming(false);
    if (ok && data.success) { showToast('Your venture exists. Here is what it needs.'); navigate('/app'); }
    else showToast(data.detail || data.error || 'Could not confirm. Try again.', 'error');
  }

  const roles = startup?.role_requirements || [];

  return (
    <div className="min-h-screen bg-canvas px-6 py-12">
      <div className="w-full max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {(phase === 'input' || phase === 'error') && (
            <motion.div key="input" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
              <div className="relative overflow-hidden rounded-xl bg-ink-950 p-8 mb-6">
                <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle at 15% 25%, #7C5CFC 0%, transparent 55%), radial-gradient(circle at 85% 75%, #1F5D52 0%, transparent 55%)' }} />
                <div className="relative">
                  <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-mint-500 mb-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-mint-500" />Your venture starts here
                  </p>
                  <h1 className="font-display text-[28px] font-semibold text-white leading-tight mb-3">
                    Describe it the way you would to a friend.
                  </h1>
                  <p className="text-[15px] text-white/70 leading-relaxed max-w-lg">
                    No pitch, no jargon. CapForge reads what you write, works out what this actually is, and tells you which roles it will need before you have to guess.
                  </p>
                </div>
              </div>

              <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
                <div className="mb-5">
                  <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">What is it called?</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Working name is fine" className={FIELD} />
                </div>

                <div className="mb-5">
                  <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">What are you building, and why?</label>
                  <textarea value={rawIdea} onChange={(e) => setRawIdea(e.target.value)} rows={6} placeholder="I want to build…" className={`${FIELD} resize-none leading-relaxed`} />
                </div>

                <div>
                  <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">Why this matters to you</label>
                  <p className="text-[12.5px] text-ink-500 mb-2">
                    Not the pitch. The reason you cannot let it go. This is what a co-founder reads to decide whether they are in, and it is weighed when matching them.
                  </p>
                  <textarea value={founderVision} onChange={(e) => setFounderVision(e.target.value)} rows={4} placeholder="I keep thinking about…" className={`${FIELD} resize-none leading-relaxed`} />
                </div>

                <button onClick={() => setShowMore(!showMore)} className="flex items-center gap-1.5 text-[13px] text-violet-700 font-medium mt-5 hover:text-violet-600 transition-colors">
                  {showMore ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {showMore ? 'Hide the rest' : 'Add where you are up to (optional)'}
                </button>

                {showMore && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-5 space-y-4 pt-5 border-t border-surface-border overflow-hidden">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">People on it now</label>
                        <input type="number" min="1" value={currentTeamSize} onChange={(e) => setCurrentTeamSize(e.target.value)} placeholder="1" className={FIELD} />
                      </div>
                      <div>
                        <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">Funding so far</label>
                        <select value={fundingStage} onChange={(e) => setFundingStage(e.target.value)} className={FIELD}>
                          <option value="">Not raised anything</option>
                          {FUNDING_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">Amount raised (USD)</label>
                        <input type="number" min="0" value={fundingRaised} onChange={(e) => setFundingRaised(e.target.value)} placeholder="0" className={FIELD} />
                      </div>
                      <div>
                        <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">What you are aiming for</label>
                        <input value={targetTimeline} onChange={(e) => setTargetTimeline(e.target.value)} placeholder="MVP in 4 months" className={FIELD} />
                      </div>
                    </div>
                    <div>
                      <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">Equity you would offer a co-founder</label>
                      <input value={equityOfferedRange} onChange={(e) => setEquityOfferedRange(e.target.value)} placeholder="5-10% for a technical co-founder" className={FIELD} />
                    </div>
                    <div>
                      <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">What you bring to this</label>
                      <textarea value={founderPriorExperience} onChange={(e) => setFounderPriorExperience(e.target.value)} rows={2} placeholder="Five years in fintech product, ran a company before…" className={`${FIELD} resize-none`} />
                    </div>
                    <div className="grid grid-cols-2 gap-4 items-end">
                      <div>
                        <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">City tier (India)</label>
                        <select value={cityTier} onChange={(e) => setCityTier(e.target.value)} className={FIELD}>
                          <option value="">Not specified</option>
                          <option value="Tier I">Tier I</option>
                          <option value="Tier II">Tier II</option>
                          <option value="Tier III">Tier III</option>
                        </select>
                      </div>
                      <label className="flex items-center gap-2.5 text-[13.5px] text-ink-700 pb-3 cursor-pointer">
                        <input type="checkbox" checked={dpiitRecognized} onChange={(e) => setDpiitRecognized(e.target.checked)} className="rounded border-surface-border" />
                        DPIIT recognised
                      </label>
                    </div>
                  </motion.div>
                )}

                {error && (
                  <div className="bg-rose-50 border border-rose-200 rounded-lg px-4 py-3 mt-5 flex items-start gap-2.5">
                    <AlertTriangle size={15} className="text-rose-500 shrink-0 mt-0.5" />
                    <p className="text-[13px] text-rose-600">{error}</p>
                  </div>
                )}

                <button
                  onClick={handleAnalyze}
                  className="w-full mt-6 flex items-center justify-center gap-2 bg-ink-900 hover:bg-ink-700 text-white py-3 rounded-full text-[15px] font-medium transition-colors"
                >
                  Read my idea <ArrowUpRight size={15} />
                </button>
              </div>
            </motion.div>
          )}

          {phase === 'processing' && (
            <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <div className="relative overflow-hidden rounded-xl bg-ink-950 p-12">
                <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle at 15% 25%, #7C5CFC 0%, transparent 55%), radial-gradient(circle at 85% 75%, #1F5D52 0%, transparent 55%)' }} />
                <div className="relative flex flex-col items-center text-center">
                  <div className="w-9 h-9 rounded-full border-2 border-white/15 border-t-mint-500 animate-spin mb-6" />
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={processingStep}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.3 }}
                      className="font-display text-[20px] font-medium text-white"
                    >
                      {PROCESSING[processingStep]}
                    </motion.p>
                  </AnimatePresence>
                  <p className="text-[13px] text-white/40 mt-3">This takes a few seconds.</p>
                </div>
              </div>
            </motion.div>
          )}

          {phase === 'review' && startup && (
            <motion.div key="review" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
              {/* THE REVEAL. This was a grey card headed 'CapForge
                  Understanding' with three labelled paragraphs. It is the
                  first time a founder sees their own idea structured, and it
                  should land as something happening. */}
              <div className="relative overflow-hidden rounded-xl bg-ink-950 p-8 mb-5">
                <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle at 15% 25%, #7C5CFC 0%, transparent 55%), radial-gradient(circle at 85% 75%, #1F5D52 0%, transparent 55%)' }} />
                <div className="relative">
                  <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-mint-500 mb-3">
                    <Check size={13} /> Here is what we understood
                  </p>
                  <h1 className="font-display text-[30px] font-semibold text-white leading-tight mb-4">{startup.name}</h1>
                  <div className="flex flex-wrap gap-1.5">
                    {(startup.domain || []).map((d) => (
                      <span key={d} className="text-[12px] px-2.5 py-1 rounded-md bg-white/10 text-white/75 border border-white/10">{d}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7 mb-4">
                <p className="text-[11px] font-semibold tracking-wide uppercase text-ink-300 mb-2">The problem you are solving</p>
                <p className="text-[15.5px] text-ink-900 leading-relaxed mb-6">{startup.problem}</p>
                <p className="text-[11px] font-semibold tracking-wide uppercase text-ink-300 mb-2">What you are building</p>
                <p className="text-[15.5px] text-ink-900 leading-relaxed">{startup.solution}</p>
              </div>

              {roles.length > 0 && (
                <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7 mb-5">
                  <p className="text-[16px] font-semibold text-ink-950 mb-1">
                    {roles.length} role{roles.length === 1 ? '' : 's'} this will need
                  </p>
                  <p className="text-[13.5px] text-ink-500 mb-5">
                    Real people get ranked against each of these, with the reason they fit. You do not have to work out who to look for.
                  </p>
                  <div className="space-y-3">
                    {roles.map((r, i) => (
                      <motion.div
                        key={r.role}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 + i * 0.06 }}
                        className="border border-surface-border rounded-lg p-4"
                      >
                        <p className="text-[14.5px] font-semibold text-ink-950 mb-2">{r.role}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(r.skills || []).map((s) => (
                            <span key={s} className="text-[11.5px] px-2 py-1 rounded-md bg-surface-muted text-ink-700">{s}</span>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4">
                <button
                  onClick={handleConfirm}
                  disabled={confirming}
                  className="flex items-center gap-2 bg-ink-900 hover:bg-ink-700 text-white px-6 py-3 rounded-full text-[15px] font-medium transition-colors disabled:opacity-50"
                >
                  {confirming ? 'Creating…' : 'That is right, create it'}
                  {!confirming && <ArrowUpRight size={15} />}
                </button>
                <button onClick={() => setPhase('input')} className="text-[13.5px] text-ink-500 hover:text-ink-900 transition-colors">
                  Not quite, let me rewrite it
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
