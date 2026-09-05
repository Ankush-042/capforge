import React, { useState, useEffect } from 'react';
import Shell from '../components/Shell.jsx';
import { getSkillDemand } from '../services/startups.js';

const DEMAND_COLOR = { HIGH: 'text-signal-critical', MEDIUM: 'text-signal-medium', LOW: 'text-signal-low' };

export default function SkillDemand() {
  const [loading, setLoading] = useState(true);
  const [skills, setSkills] = useState([]);

  useEffect(() => {
    getSkillDemand().then(({ ok, data }) => {
      if (ok && data.success) setSkills(data.skills);
      setLoading(false);
    });
  }, []);

  if (loading) return <Shell persona="CONTRIBUTOR" title="Skill demand"><div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" /></div></Shell>;

  const gap = skills.find((s) => s.demandLevel === 'HIGH' && !s.haveIt);

  return (
    <Shell persona="CONTRIBUTOR" title="Skill demand">
      <div className="mb-6">
        <h1 className="text-[26px] font-semibold text-ink-900 tracking-tight">Skills in demand</h1>
        <p className="text-sm text-ink-500 mt-1">Aggregated from real, currently-open startup gaps across the platform.</p>
      </div>
      {skills.length === 0 ? (
        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-12 text-center">
          <p className="text-[15px] text-ink-500">No open gaps on the platform yet to aggregate demand from.</p>
        </div>
      ) : (
        <>
          <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
            {skills.map((s) => (
              <div key={s.skill} className="flex items-center justify-between py-3 border-b border-surface-border last:border-0">
                <div className="flex items-center gap-3">
                  <p className="text-[15px] text-ink-900 capitalize">{s.skill}</p>
                  {s.haveIt && <span className="text-xs px-2 py-0.5 rounded-md bg-mint-50 text-mint-500 font-medium">You have this</span>}
                </div>
                <span className={`text-xs font-medium ${DEMAND_COLOR[s.demandLevel]}`}>{s.demandLevel}</span>
              </div>
            ))}
          </div>
          {gap && (
            <div className="bg-violet-50 rounded-xl p-6 mt-6">
              <p className="text-[15px] text-violet-700 leading-relaxed">
                <strong className="capitalize">{gap.skill}</strong> is currently in high demand across open startup gaps, and doesn't yet appear on your profile.
              </p>
            </div>
          )}
        </>
      )}
    </Shell>
  );
}
