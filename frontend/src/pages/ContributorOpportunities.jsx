import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { getMyRecommendationsAsContributor, startConversation } from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';

/**
 * Real fix for a confirmed presentation flaw (not a data-duplication
 * bug — verified the underlying data is genuinely distinct, one row
 * per real diagnosed gap the contributor partially matches). A venture
 * with several open roles the contributor partially fits was showing
 * as several separate flat rows with the same startup name, reading
 * as spam/duplicates. Groups by startup now — one card per venture,
 * every matching role listed underneath it, ranked internally by score.
 */
function groupByStartup(recs) {
  const groups = new Map();
  for (const r of recs) {
    if (!groups.has(r.startup_id)) {
      groups.set(r.startup_id, { startup_id: r.startup_id, startup_name: r.startup_name, domain: r.domain, stage: r.stage, founder_id: r.founder_id, roles: [] });
    }
    groups.get(r.startup_id).roles.push(r);
  }
  return [...groups.values()]
    .map(g => ({ ...g, roles: g.roles.sort((a, b) => b.score - a.score) }))
    .sort((a, b) => b.roles[0].score - a.roles[0].score);
}

export default function ContributorOpportunities() {
  const navigate = useNavigate();
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
    const { ok, data } = await startConversation(r.founder_id, { startupId: r.startup_id, gapId: r.source_gap_id });
    if (ok && data.success) navigate(`/app/inbox/${data.conversation.id}`);
    else showToast(data.error || 'Could not start a conversation.', 'error');
  }

  if (loading) return <Shell persona="CONTRIBUTOR" title="Opportunities"><div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" /></div></Shell>;

  const grouped = groupByStartup(recs);

  return (
    <Shell persona="CONTRIBUTOR" title="Opportunities">
      <PageHeader icon={Compass} iconBg="bg-violet-50" iconColor="text-violet-600" title="Opportunities" subtitle="Ranked by real fit — not a generic search list." />
      {grouped.length === 0 ? (
        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-12 text-center">
          <p className="text-[15px] text-ink-500">No opportunities yet. Complete your profile with real skills to be considered for open gaps.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map((g) => {
            const top = g.roles[0];
            return (
              <div key={g.startup_id} className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <Link to={`/app/profile/${top.founder_id}`} className="text-[15px] font-semibold text-ink-900 hover:text-violet-600 transition-colors">{g.startup_name}</Link>
                    <p className="text-[13px] text-ink-500">{(g.domain || []).join(', ')} · {g.stage} · {g.roles.length} matching role{g.roles.length !== 1 ? 's' : ''}</p>
                  </div>
                  <span className="text-lg font-semibold text-violet-600">{Math.round(top.score * 100)}%</span>
                </div>

                <div className="space-y-1 mb-4">
                  {top.causal_narrative ? (
                    <p className="text-[13px] text-ink-700 leading-relaxed">{top.causal_narrative}</p>
                  ) : (
                    (top.explanation?.strengths || []).map((s) => <p key={s} className="text-[13px] text-ink-700 flex gap-1.5"><span className="text-mint-500">✓</span>{s}</p>)
                  )}
                </div>

                {g.roles.length > 1 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {g.roles.map((r) => (
                      <span key={r.id} className="text-[11px] px-2 py-1 rounded-md bg-surface-muted text-ink-700">{r.gap_role} · {Math.round(r.score * 100)}%</span>
                    ))}
                  </div>
                )}

                <button onClick={() => handleInterest(top)} className="text-xs bg-violet-50 text-violet-700 px-3 py-1.5 rounded-lg font-medium hover:bg-violet-100 transition-colors">
                  Message the founder
                </button>
              </div>
            );
          })}
        </div>
      )}
    </Shell>
  );
}
