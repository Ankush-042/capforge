import React, { useState, useEffect } from 'react';
import { GraduationCap } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import { apiFetch } from '../services/api.js';

export default function LearningRecommendations() {
  const [loading, setLoading] = useState(true);
  const [recs, setRecs] = useState([]);

  useEffect(() => {
    apiFetch('/learning-recommendations').then(({ ok, data }) => {
      if (ok && data.success) setRecs(data.recommendations);
      setLoading(false);
    });
  }, []);

  if (loading) return <Shell persona="CONTRIBUTOR" title="Learning"><div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" /></div></Shell>;

  return (
    <Shell persona="CONTRIBUTOR" title="Learning recommendations">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-mint-50 text-mint-500 flex items-center justify-center"><GraduationCap size={18} /></div>
        <div>
          <h1 className="text-[26px] font-semibold text-ink-900 tracking-tight">Learning recommendations</h1>
          <p className="text-sm text-ink-500 mt-1">Derived from real, recurring skill gaps across the platform.</p>
        </div>
      </div>
      {recs.length === 0 ? (
        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-12 text-center">
          <p className="text-[15px] text-ink-500">No recommendations yet — you're covered on the skills currently in demand.</p>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
          {recs.map((r) => (
            <div key={r.skill} className="flex items-center justify-between py-3 border-b border-surface-border last:border-0">
              <div><p className="text-[15px] font-medium text-ink-900 capitalize">{r.skill}</p><p className="text-[13px] text-ink-500">{r.reason}</p></div>
              <span className="text-xs px-2 py-1 rounded-md bg-violet-50 text-violet-700 font-medium">{r.demand_count} gaps</span>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
