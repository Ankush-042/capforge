import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Calculator, Info } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import { calculateEquity } from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';

/**
 * What to ask for.
 *
 * This was a form beside an empty box that said "Fill in inputs and
 * calculate". The hard part of an equity conversation is not the
 * arithmetic, it is not knowing whether your number is reasonable and
 * having no way to defend it.
 *
 * So the range is stated as a sentence you could actually say out loud, the
 * assumptions behind it are all shown rather than just the first one, and
 * the page is honest that this is a starting point for a negotiation and not
 * a market rate.
 */

const FIELD = 'w-full px-3.5 py-2.5 rounded-lg border border-surface-border bg-surface-muted text-[14.5px] text-ink-900 focus:outline-none focus:border-violet-500 focus:bg-surface transition-colors';

export default function ContributorEquityAsk() {
  const showToast = useToast();
  const [role, setRole] = useState('Data Scientist');
  const [stage, setStage] = useState('Idea');
  const [commitment, setCommitment] = useState('part-time');
  const [experienceYears, setExperienceYears] = useState('4');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleCalculate() {
    setLoading(true);
    const { ok, data } = await calculateEquity({
      calculationType: 'CONTRIBUTOR_ASK',
      inputs: { role, stage, commitment, priorityLevel: 'CRITICAL', experienceYears: parseInt(experienceYears) || 0 },
    });
    setLoading(false);
    if (ok && data.success) setResult(data.calculation.result);
    else showToast(data.detail || data.error || 'Could not work that out. Try again.', 'error');
  }

  return (
    <Shell persona="CONTRIBUTOR" title="What to ask for" subtitle="A starting point, not a market rate">
      <div className="mb-7">
        <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-violet-600 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
          Before the conversation
        </p>
        <h1 className="font-editorial italic text-[32px] text-trust-fg leading-tight max-w-3xl">
          Know your number before someone else picks it for you.
        </h1>
        <p className="text-[15px] text-ink-700 mt-3 max-w-2xl leading-relaxed">
          Most people join something early with no idea what is reasonable to ask, and find out afterwards. This will not tell you what you are worth, but it will tell you what is defensible and why.
        </p>
      </div>

      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-3 bg-surface rounded-xl border border-surface-border shadow-card p-7">
          <p className="text-[15px] font-semibold text-ink-900 mb-1">Your situation</p>
          <p className="text-[13px] text-ink-500 mb-5">Every one of these genuinely changes the answer.</p>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">The role you would take</label>
              <input value={role} onChange={(e) => setRole(e.target.value)} className={FIELD} />
            </div>
            <div>
              <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">How far along they are</label>
              <select value={stage} onChange={(e) => setStage(e.target.value)} className={FIELD}>
                {['Idea', 'Prototype', 'MVP', 'Early Traction'].map((s) => <option key={s}>{s}</option>)}
              </select>
              <p className="text-[12px] text-ink-500 mt-1.5">Earlier means more risk, and more equity.</p>
            </div>
            <div>
              <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">How much you would give it</label>
              <select value={commitment} onChange={(e) => setCommitment(e.target.value)} className={FIELD}>
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="advisor">Advising</option>
              </select>
            </div>
            <div>
              <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">Years doing this work</label>
              <input type="number" min="0" value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)} className={FIELD} />
            </div>
          </div>

          <button
            onClick={handleCalculate}
            disabled={loading}
            className="mt-6 flex items-center gap-2 bg-ink-900 hover:bg-ink-700 text-white px-5 py-2.5 rounded-full text-[14px] font-medium transition-colors disabled:opacity-50"
          >
            <Calculator size={15} />
            {loading ? 'Working it out…' : result ? 'Work it out again' : 'Work out my range'}
          </button>
        </div>

        <div className="col-span-2">
          {result ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="relative overflow-hidden rounded-xl bg-ink-950 p-7"
            >
              <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle at 20% 25%, #7C5CFC 0%, transparent 55%), radial-gradient(circle at 80% 75%, #1F5D52 0%, transparent 55%)' }} />
              <div className="relative">
                <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-mint-500 mb-3">Defensible to ask for</p>
                <p className="font-display text-[44px] font-bold text-white leading-none tabular-nums mb-1">
                  {result.range.low}–{result.range.high}<span className="text-[26px]">%</span>
                </p>
                <p className="text-[14px] text-white/70 leading-relaxed mt-4">
                  For a {commitment === 'advisor' ? 'advising' : commitment} {role} joining at {stage.toLowerCase()} stage.
                </p>

                {(result.assumptions || []).length > 0 && (
                  <div className="mt-6 pt-5 border-t border-white/10">
                    <p className="text-[11px] font-medium tracking-wide uppercase text-white/40 mb-2.5">Why this range</p>
                    <div className="space-y-2">
                      {(result.assumptions || []).map((a) => (
                        <p key={a} className="text-[13px] text-white/65 leading-relaxed flex gap-2">
                          <span className="text-mint-500 shrink-0">·</span>{a}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7 h-full flex flex-col justify-center text-center">
              <Calculator size={22} className="text-ink-300 mx-auto mb-3" />
              <p className="text-[14.5px] text-ink-700 mb-1">Your range will appear here.</p>
              <p className="text-[13px] text-ink-500">With the reasoning behind it, so you can defend the number rather than just say it.</p>
            </div>
          )}

          <div className="flex items-start gap-2.5 mt-4 px-1">
            <Info size={13} className="text-ink-300 shrink-0 mt-0.5" />
            <p className="text-[12.5px] text-ink-500 leading-relaxed">
              This is a starting point for a conversation, not a market rate. Vesting, cliffs and what the founder can actually afford all move the real number.
            </p>
          </div>
        </div>
      </div>
    </Shell>
  );
}
