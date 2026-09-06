import React, { useState, useEffect } from 'react';
import { Percent } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import { calculateEquity } from '../services/startups.js';
import { useActiveStartup } from '../context/ActiveStartupContext.jsx';
import { useToast } from '../components/Toast.jsx';

export default function EquityCalculator() {
  const { activeStartup } = useActiveStartup();
  const showToast = useToast();
  const [startup, setStartup] = useState(null);
  const [role, setRole] = useState('CTO');
  const [stage, setStage] = useState('Idea');
  const [commitment, setCommitment] = useState('full-time');
  const [priorityLevel, setPriorityLevel] = useState('CRITICAL');
  const [cashComp, setCashComp] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeStartup) setStartup(activeStartup);
  }, [activeStartup]);

  async function handleCalculate() {
    setLoading(true);
    const { ok, data } = await calculateEquity({
      calculationType: 'FOUNDER_SPLIT', startupId: startup?.id,
      inputs: { role, stage, commitment, priorityLevel, cashCompensation: cashComp }
    });
    setLoading(false);
    if (ok && data.success) setResult(data.calculation.result);
    else showToast(data.detail || data.error || 'Calculation failed.', 'error');
  }

  return (
    <Shell title={startup?.name || 'Equity calculator'} subtitle="Equity calculator">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-mint-50 text-mint-500 flex items-center justify-center"><Percent size={18} /></div>
        <div>
          <h1 className="text-[26px] font-semibold text-ink-900 tracking-tight">Equity calculator</h1>
          <p className="text-sm text-ink-500 mt-1">Guidance for discussion — not legal or financial advice.</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-surface rounded-xl border border-surface-border shadow-card p-7">
          <p className="text-[15px] font-semibold text-ink-900 mb-5">Inputs</p>
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="text-[13px] font-medium text-ink-500 mb-1.5 block">Role</label>
              <input value={role} onChange={(e) => setRole(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-surface-border bg-surface-muted text-[15px] focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
            </div>
            <div>
              <label className="text-[13px] font-medium text-ink-500 mb-1.5 block">Stage</label>
              <select value={stage} onChange={(e) => setStage(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-surface-border bg-surface-muted text-[15px] focus:outline-none focus:ring-2 focus:ring-violet-500/20">
                {['Idea', 'Prototype', 'MVP', 'Early Traction'].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[13px] font-medium text-ink-500 mb-1.5 block">Commitment</label>
              <select value={commitment} onChange={(e) => setCommitment(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-surface-border bg-surface-muted text-[15px] focus:outline-none focus:ring-2 focus:ring-violet-500/20">
                <option value="full-time">Full-time</option><option value="part-time">Part-time</option><option value="advisor">Advisor</option>
              </select>
            </div>
            <div>
              <label className="text-[13px] font-medium text-ink-500 mb-1.5 block">Priority</label>
              <select value={priorityLevel} onChange={(e) => setPriorityLevel(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-surface-border bg-surface-muted text-[15px] focus:outline-none focus:ring-2 focus:ring-violet-500/20">
                {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 mt-4 text-[13px] text-ink-500">
            <input type="checkbox" checked={cashComp} onChange={(e) => setCashComp(e.target.checked)} /> Taking a cash salary
          </label>
          <button onClick={handleCalculate} disabled={loading} className="mt-5 bg-ink-900 hover:bg-ink-700 text-white px-5 py-2.5 rounded-lg text-[15px] font-medium transition-colors disabled:opacity-50">
            {loading ? 'Calculating…' : 'Calculate'}
          </button>
        </div>

        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7 flex flex-col items-center justify-center text-center">
          {result ? (
            <>
              <p className="text-[13px] font-medium text-ink-500 mb-2">Indicative range</p>
              <p className="text-4xl font-bold text-violet-600 mb-1">{result.range.low}–{result.range.high}%</p>
              <p className="text-[13px] text-ink-500">{result.assumptions[0]}</p>
            </>
          ) : (
            <p className="text-[13px] text-ink-500">Fill in the inputs and calculate.</p>
          )}
        </div>
      </div>
    </Shell>
  );
}
