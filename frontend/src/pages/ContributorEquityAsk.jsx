import React, { useState } from 'react';
import { calculateEquity } from '../services/startups.js';
import Shell from '../components/Shell.jsx';
import { useToast } from '../components/Toast.jsx';

export default function ContributorEquityAsk() {
  const showToast = useToast();
  const [role, setRole] = useState('Data Scientist');
  const [stage, setStage] = useState('Idea');
  const [commitment, setCommitment] = useState('part-time');
  const [experienceYears, setExperienceYears] = useState('4');
  const [priorityLevel, setPriorityLevel] = useState('CRITICAL');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleCalculate() {
    setLoading(true);
    const { ok, data } = await calculateEquity({
      calculationType: 'CONTRIBUTOR_ASK',
      inputs: { role, stage, commitment, priorityLevel, experienceYears: parseInt(experienceYears) || 0 }
    });
    setLoading(false);
    if (ok && data.success) setResult(data.calculation.result);
    else showToast(data.detail || data.error || 'Calculation failed.', 'error');
  }

  return (
    <Shell persona="CONTRIBUTOR" title="Equity ask calculator">
      <div className="mb-6">
        <h1 className="text-[26px] font-semibold text-ink-900 tracking-tight">Equity ask calculator</h1>
        <p className="text-sm text-ink-500 mt-1">Negotiation guidance — not a guaranteed market rate.</p>
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-surface rounded-xl border border-surface-border shadow-card p-7">
          <p className="text-[15px] font-semibold text-ink-900 mb-5">Your inputs</p>
          <div className="grid grid-cols-2 gap-5">
            <div><label className="text-[13px] font-medium text-ink-500 mb-1.5 block">Role</label>
              <input value={role} onChange={(e) => setRole(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-surface-border bg-surface-muted text-[15px] focus:outline-none focus:ring-2 focus:ring-violet-500/20" /></div>
            <div><label className="text-[13px] font-medium text-ink-500 mb-1.5 block">Stage</label>
              <select value={stage} onChange={(e) => setStage(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-surface-border bg-surface-muted text-[15px] focus:outline-none focus:ring-2 focus:ring-violet-500/20">
                {['Idea', 'Prototype', 'MVP', 'Early Traction'].map((s) => <option key={s}>{s}</option>)}</select></div>
            <div><label className="text-[13px] font-medium text-ink-500 mb-1.5 block">Commitment</label>
              <select value={commitment} onChange={(e) => setCommitment(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-surface-border bg-surface-muted text-[15px] focus:outline-none focus:ring-2 focus:ring-violet-500/20">
                <option value="full-time">Full-time</option><option value="part-time">Part-time</option><option value="advisor">Advisor</option></select></div>
            <div><label className="text-[13px] font-medium text-ink-500 mb-1.5 block">Experience (years)</label>
              <input type="number" min="0" value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-surface-border bg-surface-muted text-[15px] focus:outline-none focus:ring-2 focus:ring-violet-500/20" /></div>
          </div>
          <button onClick={handleCalculate} disabled={loading} className="mt-5 bg-ink-900 hover:bg-ink-700 text-white px-5 py-2.5 rounded-lg text-[15px] font-medium transition-colors disabled:opacity-50">
            {loading ? 'Calculating…' : 'Calculate'}
          </button>
        </div>
        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7 flex flex-col items-center justify-center text-center">
          {result ? (<><p className="text-[13px] font-medium text-ink-500 mb-2">Reasonable ask</p>
            <p className="text-4xl font-bold text-violet-600 mb-1">{result.range.low}–{result.range.high}%</p>
            <p className="text-[13px] text-ink-500">{result.assumptions[0]}</p></>) : (
            <p className="text-[13px] text-ink-500">Fill in inputs and calculate.</p>
          )}
        </div>
      </div>
    </Shell>
  );
}
