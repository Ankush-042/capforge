import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Calculator, Info, ArrowUpRight } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import { calculateEquity, getGaps } from '../services/startups.js';
import { useActiveStartup } from '../context/ActiveStartupContext.jsx';
import { useToast } from '../components/Toast.jsx';

/**
 * What to offer.
 *
 * Same shape as the contributor's equity page: a form beside a box that
 * said 'Fill in the inputs and calculate', and when it did calculate it
 * showed the range plus exactly ONE of the assumptions behind it.
 *
 * A founder offering equity is making an irreversible decision, usually for
 * the first time, usually with no reference point. The number without the
 * reasoning is worse than useless: it is a figure they will repeat in a
 * conversation and be unable to defend.
 *
 * Also: the role is now chosen from the venture's REAL open roles where they
 * exist, rather than typed. A founder should not be guessing at a job title
 * the platform already knows.
 */

const FIELD = 'w-full px-3.5 py-2.5 rounded-lg border border-surface-border bg-surface-muted text-[14.5px] text-ink-900 focus:outline-none focus:border-violet-500 focus:bg-surface transition-colors';

export default function EquityCalculator() {
  const { activeStartup, loading: startupLoading } = useActiveStartup();
  const showToast = useToast();
  const [startup, setStartup] = useState(null);
  const [openRoles, setOpenRoles] = useState([]);
  const [role, setRole] = useState('');
  const [stage, setStage] = useState('Idea');
  const [commitment, setCommitment] = useState('full-time');
  const [priorityLevel, setPriorityLevel] = useState('CRITICAL');
  const [cashComp, setCashComp] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      if (startupLoading || !activeStartup) return;
      setStartup(activeStartup);
      if (activeStartup.stage) setStage(activeStartup.stage);
      const { ok, data } = await getGaps(activeStartup.id);
      if (ok && data.success) {
        const open = data.gaps.filter((g) => g.status !== 'FILLED' && g.status !== 'DISMISSED');
        setOpenRoles(open);
        if (open.length > 0) {
          setRole(open[0].role);
          setPriorityLevel(open[0].priority_level || 'CRITICAL');
        }
      }
    }
    load();
  }, [activeStartup?.id, startupLoading]);

  async function handleCalculate() {
    if (!role.trim()) { showToast('Pick or name the role first.', 'error'); return; }
    setLoading(true);
    const { ok, data } = await calculateEquity({
      calculationType: 'FOUNDER_SPLIT',
      startupId: startup?.id,
      inputs: { role, stage, commitment, priorityLevel, cashCompensation: cashComp },
    });
    setLoading(false);
    if (ok && data.success) setResult(data.calculation.result);
    else showToast(data.detail || data.error || 'Could not work that out. Try again.', 'error');
  }

  function pickRole(r) {
    setRole(r.role);
    setPriorityLevel(r.priority_level || 'CRITICAL');
    setResult(null);
  }

  return (
    <Shell title={startup?.name || 'What to offer'} subtitle="Before the conversation, not during it">
      <div className="mb-7">
        <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-violet-600 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
          Guidance, not a rule
        </p>
        <h1 className="font-editorial italic text-[32px] text-trust-fg leading-tight max-w-3xl">
          Decide the number before someone asks you for one.
        </h1>
        <p className="text-[15px] text-ink-700 mt-3 max-w-2xl leading-relaxed">
          Equity given away does not come back. Most founders make this call for the first time in the middle of a conversation, with no reference point and someone waiting for an answer.
        </p>
      </div>

      {openRoles.length > 0 && (
        <div className="mb-5">
          <p className="text-[13.5px] font-medium text-ink-700 mb-2.5">Which role are you thinking about?</p>
          <div className="flex flex-wrap gap-2">
            {openRoles.map((r) => (
              <button
                key={r.id}
                onClick={() => pickRole(r)}
                className={`text-[13px] px-3.5 py-2 rounded-full font-medium transition-colors ${
                  role === r.role ? 'bg-violet-600 text-white' : 'bg-surface-muted text-ink-700 hover:bg-surface-border'
                }`}
              >
                {r.role}
                {r.seeking_type === 'CO_FOUNDER' && <span className="opacity-70"> · co-founder</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-3 bg-surface rounded-xl border border-surface-border shadow-card p-7">
          <p className="text-[15px] font-semibold text-ink-950 mb-1">The situation</p>
          <p className="text-[13px] text-ink-500 mb-5">Every one of these genuinely changes the answer.</p>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">The role</label>
              <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Technical co-founder" className={FIELD} />
            </div>
            <div>
              <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">Where the venture is</label>
              <select value={stage} onChange={(e) => setStage(e.target.value)} className={FIELD}>
                {['Idea', 'Prototype', 'MVP', 'Early Traction'].map((s) => <option key={s}>{s}</option>)}
              </select>
              <p className="text-[12px] text-ink-500 mt-1.5">Earlier means more risk for them, and more equity.</p>
            </div>
            <div>
              <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">How much they would give it</label>
              <select value={commitment} onChange={(e) => setCommitment(e.target.value)} className={FIELD}>
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="advisor">Advising</option>
              </select>
            </div>
            <div>
              <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">How badly you need it filled</label>
              <select value={priorityLevel} onChange={(e) => setPriorityLevel(e.target.value)} className={FIELD}>
                <option value="CRITICAL">Critical, blocking everything</option>
                <option value="HIGH">Important</option>
                <option value="MEDIUM">Useful</option>
                <option value="LOW">Nice to have</option>
              </select>
            </div>
          </div>

          <label className="flex items-start gap-2.5 mt-5 text-[13.5px] text-ink-700 cursor-pointer">
            <input type="checkbox" checked={cashComp} onChange={(e) => setCashComp(e.target.checked)} className="rounded border-surface-border mt-0.5" />
            <span>
              They would also take a salary
              <span className="block text-[12.5px] text-ink-500 mt-0.5">Cash reduces the equity that is reasonable to give.</span>
            </span>
          </label>

          <button
            onClick={handleCalculate}
            disabled={loading}
            className="mt-6 flex items-center gap-2 bg-ink-900 hover:bg-ink-700 text-white px-5 py-2.5 rounded-full text-[14px] font-medium transition-colors disabled:opacity-50"
          >
            <Calculator size={15} />
            {loading ? 'Working it out…' : result ? 'Work it out again' : 'Work out the range'}
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
                <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-mint-500 mb-3">Reasonable to offer</p>
                <p className="font-display text-[44px] font-bold text-white leading-none tabular-nums mb-1">
                  {result.range.low}–{result.range.high}<span className="text-[26px]">%</span>
                </p>
                <p className="text-[14px] text-white/70 leading-relaxed mt-4">
                  For a {commitment === 'advisor' ? 'advising' : commitment} {role} joining at {String(stage).toLowerCase()} stage{cashComp ? ', with a salary' : ''}.
                </p>

                {/* ALL the assumptions, not the first one. This list is the
                    difference between quoting a number and arguing for it. */}
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
              <p className="text-[13px] text-ink-500">With the reasoning, so you can hold the number when someone pushes on it.</p>
            </div>
          )}

          <div className="flex items-start gap-2.5 mt-4 px-1">
            <Info size={13} className="text-ink-300 shrink-0 mt-0.5" />
            <p className="text-[12.5px] text-ink-500 leading-relaxed">
              Guidance for a conversation, not legal or financial advice. Vesting and a cliff matter as much as the percentage, and neither is decided here.
            </p>
          </div>

          {openRoles.length === 0 && startup && (
            <Link
              to="/app/gaps"
              className="flex items-center justify-between gap-3 bg-surface rounded-xl border border-surface-border shadow-card px-5 py-4 mt-4 group hover:border-violet-500/50 transition-colors"
            >
              <span className="text-[13.5px] text-ink-700">Work out which roles you need first</span>
              <ArrowUpRight size={15} className="text-ink-300 group-hover:text-violet-600 transition-colors shrink-0" />
            </Link>
          )}
        </div>
      </div>
    </Shell>
  );
}
