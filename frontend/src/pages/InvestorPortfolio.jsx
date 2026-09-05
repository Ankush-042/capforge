import React from 'react';
import Shell from '../components/Shell.jsx';
import DonutChart from '../components/charts/DonutChart.jsx';

const domainSplit = [
  { name: 'FinTech', value: 40, color: '#7C5CFC' },
  { name: 'Food service', value: 30, color: '#4C86F9' },
  { name: 'HealthTech', value: 30, color: '#3FB081' },
];

export default function InvestorPortfolio() {
  return (
    <Shell persona="INVESTOR" title="Raj Capital" subtitle="Portfolio">
      <div className="mb-6">
        <h1 className="text-[26px] font-semibold text-ink-900 tracking-tight">Portfolio</h1>
        <p className="text-sm text-ink-500 mt-1">Domain distribution across your connected ventures.</p>
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
          <p className="text-[15px] font-semibold text-ink-900 mb-4">By domain</p>
          <DonutChart data={domainSplit} height={200} />
        </div>
        <div className="col-span-2 bg-surface rounded-xl border border-surface-border shadow-card p-7">
          <p className="text-[15px] font-semibold text-ink-900 mb-4">Diversification signal</p>
          <p className="text-[15px] text-ink-700 leading-relaxed">Your portfolio is concentrated in FinTech (40%). Strong non-FinTech matches in HealthTech and Climate are available for review.</p>
        </div>
      </div>
    </Shell>
  );
}
