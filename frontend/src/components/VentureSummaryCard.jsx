import React from 'react';
import { TrendingUp } from 'lucide-react';
import Badge from './charts/Badge.jsx';

const DIM_LABELS = {
  team_composition: 'Team Composition',
  market_positioning: 'Market Positioning',
  product_readiness: 'Product Readiness',
  funding_readiness: 'Funding Readiness'
};

/**
 * The unified diagnosis-backed venture summary (Phase 3, Objective 3).
 * ONE reusable component so every venture renders the SAME shape —
 * used both on a founder's own dashboard ("what an investor sees when
 * they look at you") and on an investor's view of any discoverable
 * venture, so the two are guaranteed to be genuinely comparable.
 */
export default function VentureSummaryCard({ summary, framing }) {
  if (!summary) return null;
  const { readiness, top_risks, team_coverage } = summary;

  return (
    <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
      {framing && (
        <div className="flex items-center gap-2 mb-5 text-violet-600">
          <TrendingUp size={16} />
          <p className="text-[13px] font-medium">{framing}</p>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[15px] font-semibold text-ink-900">{summary.name}</p>
          <p className="text-[13px] text-ink-500">{(summary.domain || []).join(', ')} · {summary.stage}</p>
        </div>
        {readiness && <p className="text-3xl font-bold text-violet-600">{readiness.overall_score}</p>}
      </div>

      {readiness ? (
        <div className="space-y-4 mb-6">
          {Object.entries(readiness.dimensions).map(([key, value]) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[13px] font-medium text-ink-700">{DIM_LABELS[key] || key}</span>
                <span className="text-[13px] font-semibold text-ink-900">{Math.round(value * 100)}%</span>
              </div>
              <div className="h-1.5 bg-surface-muted rounded-full overflow-hidden mb-1.5">
                <div className="h-full bg-violet-500 rounded-full" style={{ width: `${value * 100}%` }} />
              </div>
              <p className="text-[12px] text-ink-500">{readiness.dimension_justifications?.[key]}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[13px] text-ink-500 mb-6">No readiness assessment yet.</p>
      )}

      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-surface-border">
        <div>
          <p className="text-[13px] font-medium text-ink-500 mb-2">Team coverage</p>
          <p className="text-[15px] text-ink-900">{team_coverage.roles_filled} filled, {team_coverage.roles_open} open</p>
        </div>
        <div>
          <p className="text-[13px] font-medium text-ink-500 mb-2">Top risk</p>
          {top_risks.length > 0 ? (
            <Badge label={`${top_risks[0].category} · ${top_risks[0].severity}`} priority={top_risks[0].severity} />
          ) : <p className="text-[13px] text-ink-500">None flagged</p>}
        </div>
        {summary.co_investors?.length > 0 && (
          <div className="col-span-2 pt-2">
            <p className="text-[13px] font-medium text-ink-500 mb-2">Other investors already connected</p>
            <p className="text-[14px] text-ink-700">{summary.co_investors.map(i => i.display_name).join(', ')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
