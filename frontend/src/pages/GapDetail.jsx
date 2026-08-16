import React from 'react';
import { useParams } from 'react-router-dom';
import Shell from '../components/Shell.jsx';
import Badge from '../components/charts/Badge.jsx';
import AvatarRow from '../components/charts/AvatarRow.jsx';

const candidates = [
  { initial: 'P', name: 'Priya Data', subtitle: 'Full-stack · 4 yrs · part-time', score: 76,
    strengths: ['Strong skill match — covers machine learning, data modeling', 'Profile headline directly matches the role', 'Prefers working with startups at this exact stage'],
    limitations: [] },
];

export default function GapDetail() {
  const { id } = useParams();
  return (
    <Shell title="FoodSense2" subtitle="Gap detail">
      <div className="mb-6">
        <p className="text-xs text-ink-500 mb-1">Gap #{id}</p>
        <div className="flex items-center gap-3">
          <h1 className="text-[26px] font-semibold text-ink-900 tracking-tight">Full Stack Engineer</h1>
          <Badge label="CRITICAL" priority="CRITICAL" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
          <p className="text-[15px] font-semibold text-ink-900 mb-4">Why this matters</p>
          <p className="text-[15px] text-ink-700 leading-relaxed mb-5">No current team member covers the "Full Stack Engineer" role, and no overlapping skills were found on the team.</p>
          <div className="pt-4 border-t border-surface-border">
            <p className="text-[13px] font-medium text-ink-500 mb-2">Required skills</p>
            <div className="flex flex-wrap gap-2">
              {['mobile app development', 'backend development', 'database management'].map(s => (
                <span key={s} className="text-xs px-2.5 py-1 rounded-md bg-violet-50 text-violet-700">{s}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-2 bg-surface rounded-xl border border-surface-border shadow-card p-7">
          <p className="text-[15px] font-semibold text-ink-900 mb-4">Recommended candidates</p>
          {candidates.map((c) => (
            <div key={c.name} className="border-b border-surface-border last:border-0 pb-5 mb-5 last:pb-0 last:mb-0">
              <AvatarRow
                {...c}
                trailing={
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-violet-600">{c.score}%</span>
                    <button className="text-xs bg-violet-50 text-violet-700 px-3 py-1.5 rounded-lg font-medium hover:bg-violet-100 transition-colors">Connect</button>
                  </div>
                }
              />
              <div className="mt-3 pl-12 space-y-1">
                {c.strengths.map((s) => <p key={s} className="text-[13px] text-mint-500 flex gap-1.5"><span>✓</span>{s}</p>)}
                {c.limitations.map((s) => <p key={s} className="text-[13px] text-amber-500 flex gap-1.5"><span>△</span>{s}</p>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}
