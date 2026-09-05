import React, { useState } from 'react';
import Shell from '../components/Shell.jsx';

export default function ContributorEquityAsk() {
  const [result] = useState({ low: 8.7, high: 16.1 });
  return (
    <Shell persona="CONTRIBUTOR" title="Priya Data" subtitle="Equity ask calculator">
      <div className="mb-6">
        <h1 className="text-[26px] font-semibold text-ink-900 tracking-tight">Equity ask calculator</h1>
        <p className="text-sm text-ink-500 mt-1">Negotiation guidance — not a guaranteed market rate.</p>
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-surface rounded-xl border border-surface-border shadow-card p-7">
          <p className="text-[15px] font-semibold text-ink-900 mb-5">Your inputs</p>
          <div className="grid grid-cols-2 gap-5">
            {[['Role', 'Data Scientist'], ['Stage', 'Idea'], ['Commitment', 'Part-time'], ['Experience', '4 years']].map(([label, value]) => (
              <div key={label}>
                <label className="text-[13px] font-medium text-ink-500 mb-1.5 block">{label}</label>
                <select className="w-full px-3 py-2.5 rounded-lg border border-surface-border bg-surface-muted text-[15px] text-ink-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20"><option>{value}</option></select>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7 flex flex-col items-center justify-center text-center">
          <p className="text-[13px] font-medium text-ink-500 mb-2">Reasonable ask</p>
          <p className="text-4xl font-bold text-violet-600 mb-1">{result.low}–{result.high}%</p>
          <p className="text-[13px] text-ink-500">Based on role, stage, experience</p>
        </div>
      </div>
    </Shell>
  );
}
