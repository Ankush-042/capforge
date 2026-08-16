import React from 'react';
import Shell from '../components/Shell.jsx';

export default function CompetitorAnalysis() {
  return (
    <Shell title="FoodSense2" subtitle="Market positioning">
      <div className="mb-6">
        <h1 className="text-[26px] font-semibold text-ink-900 tracking-tight">Market positioning</h1>
        <p className="text-sm text-ink-500 mt-1">AI-interpreted — validate before acting on it.</p>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
          <p className="text-[13px] font-medium text-ink-500 mb-2">Comparable category</p>
          <p className="text-[15px] text-ink-900 font-medium">Restaurant inventory-management SaaS tools</p>
        </div>
        <div className="col-span-2 bg-surface rounded-xl border border-surface-border shadow-card p-7">
          <p className="text-[13px] font-medium text-ink-500 mb-2">Potential overlap</p>
          <p className="text-[15px] text-ink-700 leading-relaxed">Likely comparable to solutions focusing on optimizing food inventory based on historical sales data and external factors.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
          <p className="text-[15px] font-semibold text-ink-900 mb-4">Differentiation opportunities</p>
          <div className="space-y-3">
            {['Integration with weather data for more accurate demand prediction', 'User-friendly interface for easy adoption by food service staff', 'Real-time monitoring and alerts for inventory fluctuations'].map((d) => (
              <p key={d} className="text-[15px] text-ink-700 flex gap-2"><span className="text-mint-500">✓</span>{d}</p>
            ))}
          </div>
        </div>
        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
          <p className="text-[15px] font-semibold text-ink-900 mb-4">Worth validating</p>
          <div className="space-y-3">
            {['How do existing solutions handle demand variability from weather?', 'What are primary pain points in current inventory management?', 'How can predictive accuracy be validated over time?'].map((q) => (
              <p key={q} className="text-[15px] text-ink-700 flex gap-2"><span className="text-amber-500">?</span>{q}</p>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}
