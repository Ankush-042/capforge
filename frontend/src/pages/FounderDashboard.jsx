import React from 'react';
import Shell from '../components/Shell.jsx';

/**
 * Founder Dashboard — the Sprint 17 reference screen. Chosen deliberately
 * because it has to prove hierarchy under real density (readiness, gaps,
 * team, actions all competing for space at once) — the hardest honest test
 * of the design language before committing to 49 more screens.
 *
 * Static/mock data here ONLY to establish the visual bar for approval —
 * this gets wired to the real API in the next pass once direction is confirmed.
 */

const SIGNAL_COLOR = { CRITICAL: 'text-signal-critical', HIGH: 'text-signal-high', MEDIUM: 'text-signal-medium', LOW: 'text-signal-low' };

function ReadinessRing({ score }) {
  const circumference = 2 * Math.PI * 26;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative w-16 h-16 shrink-0">
      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="26" stroke="currentColor" strokeWidth="4" fill="none" className="text-surface-2" />
        <circle cx="32" cy="32" r="26" stroke="currentColor" strokeWidth="4" fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="text-accent transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-text-primary">{score}</div>
    </div>
  );
}

function GapRow({ role, priority, coverage }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-surface-border-soft last:border-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className={`text-[10px] font-medium tracking-wide ${SIGNAL_COLOR[priority]}`}>●</span>
        <span className="text-sm text-text-primary truncate">{role}</span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs text-text-tertiary">{coverage}% covered</span>
        <span className={`text-[11px] px-1.5 py-0.5 rounded ${SIGNAL_COLOR[priority]} bg-surface-2`}>{priority}</span>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-surface-1 rounded-md border border-surface-border-soft px-4 py-3">
      <p className="text-xs text-text-tertiary mb-1">{label}</p>
      <p className="text-xl text-text-primary font-medium tabular-nums">{value}</p>
      {sub && <p className="text-xs text-text-tertiary mt-0.5">{sub}</p>}
    </div>
  );
}

export default function FounderDashboard() {
  return (
    <Shell title="FoodSense2" activeNav="Overview">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-xs text-text-tertiary mb-1">Good evening</p>
          <h1 className="text-2xl text-text-primary font-medium tracking-tight">FoodSense2</h1>
          <p className="text-sm text-text-secondary mt-1 max-w-lg">AI-powered demand forecasting for small restaurants, reducing food waste through predictive inventory.</p>
        </div>
        <button className="text-sm bg-surface-1 hover:bg-surface-2 text-text-primary px-3.5 py-2 rounded border border-surface-border-soft transition-colors shrink-0">
          Discover talent
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Team coverage" value="33%" sub="1 of 3 roles filled" />
        <StatCard label="Pending requests" value="1" sub="Awaiting response" />
        <StatCard label="Open milestones" value="6" sub="AI-suggested" />
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-4">
        <div className="space-y-4">
          <div className="bg-surface-1 rounded-md border border-surface-border-soft p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-text-primary">Unresolved gaps</h2>
              <span className="text-xs text-text-tertiary">2 critical</span>
            </div>
            <GapRow role="Full Stack Engineer" priority="CRITICAL" coverage={0} />
            <GapRow role="UX/UI Designer" priority="CRITICAL" coverage={0} />
            <GapRow role="Data Scientist" priority="LOW" coverage={100} />
          </div>

          <div className="bg-surface-1 rounded-md border border-surface-border-soft p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-text-primary">Recommended for Full Stack Engineer</h2>
            </div>
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center text-xs text-text-secondary">P</div>
                <div>
                  <p className="text-sm text-text-primary">Priya Data</p>
                  <p className="text-xs text-text-tertiary">Full-stack · 4 yrs · part-time</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-text-secondary tabular-nums">76%</span>
                <button className="text-xs text-accent hover:text-text-primary transition-colors">Connect</button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-surface-1 rounded-md border border-surface-border-soft p-5">
            <div className="flex items-center gap-4 mb-4">
              <ReadinessRing score={62} />
              <div>
                <p className="text-sm text-text-primary font-medium">Readiness</p>
                <p className="text-xs text-text-tertiary">Up from 50 last week</p>
              </div>
            </div>
            <div className="space-y-2">
              {[['Team', 33], ['Problem', 90], ['Solution', 90], ['Market', 100]].map(([k, v]) => (
                <div key={k} className="flex items-center gap-2">
                  <span className="text-xs text-text-tertiary w-14 shrink-0">{k}</span>
                  <div className="flex-1 h-1 bg-surface-2 rounded-full overflow-hidden">
                    <div className="h-full bg-accent/70 rounded-full" style={{ width: `${v}%` }} />
                  </div>
                  <span className="text-xs text-text-tertiary tabular-nums w-7 text-right">{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface-1 rounded-md border border-surface-border-soft p-5">
            <h2 className="text-sm font-medium text-text-primary mb-3">Top risk</h2>
            <p className="text-xs text-signal-high mb-1">TEAM · HIGH</p>
            <p className="text-sm text-text-secondary leading-relaxed">2 critical roles unfilled — Full Stack Engineer, UX/UI Designer.</p>
          </div>
        </div>
      </div>
    </Shell>
  );
}
