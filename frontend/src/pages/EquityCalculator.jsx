import React, { useState } from 'react';
import Shell from '../components/Shell.jsx';

export default function EquityCalculator() {
  const [result, setResult] = useState({ low: 7.3, high: 13.5 });

  return (
    <Shell title="FoodSense2" subtitle="Equity calculator">
      <div className="mb-6">
        <h1 className="text-[26px] font-semibold text-ink-900 tracking-tight">Equity calculator</h1>
        <p className="text-sm text-ink-500 mt-1">Guidance for discussion — not legal or financial advice.</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-surface rounded-xl border border-surface-border shadow-card p-7">
          <p className="text-[15px] font-semibold text-ink-900 mb-5">Inputs</p>
          <div className="grid grid-cols-2 gap-5">
            {[
              { label: 'Role', value: 'CTO' },
              { label: 'Stage', value: 'Idea' },
              { label: 'Commitment', value: 'Full-time' },
              { label: 'Priority', value: 'Critical' },
            ].map((f) => (
              <div key={f.label}>
                <label className="text-[13px] font-medium text-ink-500 mb-1.5 block">{f.label}</label>
                <select className="w-full px-3 py-2.5 rounded-lg border border-surface-border bg-surface-muted text-[15px] text-ink-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20">
                  <option>{f.value}</option>
                </select>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7 flex flex-col items-center justify-center text-center">
          <p className="text-[13px] font-medium text-ink-500 mb-2">Indicative range</p>
          <p className="text-4xl font-bold text-violet-600 mb-1">{result.low}–{result.high}%</p>
          <p className="text-[13px] text-ink-500">Based on role criticality, stage, commitment</p>
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7 mt-6">
        <p className="text-[13px] font-medium text-ink-500 mb-3">Assumptions</p>
        <div className="space-y-1.5">
          {['Reflects role criticality, venture stage, and time commitment only.', 'Does not account for prior relationship or negotiation leverage.', 'This is guidance for discussion, not legal or financial advice.'].map((a) => (
            <p key={a} className="text-[13px] text-ink-500">— {a}</p>
          ))}
        </div>
      </div>
    </Shell>
  );
}
