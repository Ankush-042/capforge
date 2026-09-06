import React, { useState, useEffect } from 'react';
import { Compass } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { getMyRecommendationsAsContributor, sendConnection } from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';

export default function ContributorOpportunities() {
  const showToast = useToast();
  const [loading, setLoading] = useState(true);
  const [recs, setRecs] = useState([]);

  useEffect(() => {
    getMyRecommendationsAsContributor().then(({ ok, data }) => {
      if (ok && data.success) setRecs(data.recommendations);
      setLoading(false);
    });
  }, []);

  async function handleInterest(r) {
    showToast('Interest expressed — the founder will be notified when they view your candidacy.');
  }

  if (loading) return <Shell persona="CONTRIBUTOR" title="Opportunities"><div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" /></div></Shell>;

  return (
    <Shell persona="CONTRIBUTOR" title="Opportunities">
      <PageHeader icon={Compass} iconBg="bg-violet-50" iconColor="text-violet-600" title="Opportunities" subtitle="Ranked by real fit — not a generic search list." />
      {recs.length === 0 ? (
        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-12 text-center">
          <p className="text-[15px] text-ink-500">No opportunities yet. Complete your profile with real skills to be considered for open gaps.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {recs.map((r) => (
            <div key={r.id} className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-[15px] font-semibold text-ink-900">{r.startup_name}</p>
                  <p className="text-[13px] text-ink-500">{(r.domain || []).join(', ')} · {r.stage} · needs {r.gap_role}</p>
                </div>
                <span className="text-lg font-semibold text-violet-600">{Math.round(r.score * 100)}%</span>
              </div>
              <div className="space-y-1 mb-4">
                {r.causal_narrative ? (
                  <p className="text-[13px] text-ink-700 leading-relaxed">{r.causal_narrative}</p>
                ) : (
                  (r.explanation?.strengths || []).map((s) => <p key={s} className="text-[13px] text-ink-700 flex gap-1.5"><span className="text-mint-500">✓</span>{s}</p>)
                )}
                {(r.explanation?.limitations || []).map((s) => <p key={s} className="text-[13px] text-amber-500 flex gap-1.5 mt-1"><span>△</span>{s}</p>)}
              </div>
              <button onClick={() => handleInterest(r)} className="text-xs bg-violet-50 text-violet-700 px-3 py-1.5 rounded-lg font-medium hover:bg-violet-100 transition-colors">
                Express interest
              </button>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
