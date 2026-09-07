import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scale } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import { apiFetch } from '../services/api.js';

/**
 * Real fix for a confirmed bug — the SAME grouping problem already
 * found and fixed once on ContributorOpportunities.jsx, never carried
 * over to this page: a startup with several real matching roles
 * showed as several separate flat rows with the identical name,
 * reading as pointless repetition. Groups by startup now — one row
 * per venture, its single best-matching role shown, with a real count
 * if there's more than one.
 */
function groupByStartup(offers) {
  const groups = new Map();
  for (const o of offers) {
    if (!groups.has(o.startup_id)) {
      groups.set(o.startup_id, { startup_id: o.startup_id, startup_name: o.startup_name, stage: o.stage, roles: [] });
    }
    groups.get(o.startup_id).roles.push(o);
  }
  return [...groups.values()]
    .map(g => ({ ...g, roles: g.roles.sort((a, b) => b.score - a.score) }))
    .sort((a, b) => b.roles[0].score - a.roles[0].score);
}

export default function MultiOfferComparison() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState([]);

  useEffect(() => {
    apiFetch('/offers/compare').then(({ ok, data }) => {
      if (ok && data.success) setOffers(data.offers);
      setLoading(false);
    });
  }, []);

  if (loading) return <Shell persona="CONTRIBUTOR" title="Compare offers"><div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" /></div></Shell>;

  const grouped = groupByStartup(offers);

  return (
    <Shell persona="CONTRIBUTOR" title="Compare offers">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center"><Scale size={18} /></div>
        <h1 className="text-[26px] font-semibold text-ink-900 tracking-tight">Compare your opportunities</h1>
      </div>
      {grouped.length === 0 ? (
        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-12 text-center">
          <p className="text-[15px] text-ink-500">No active opportunities to compare yet.</p>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-surface-border shadow-card overflow-hidden">
          <table className="w-full text-[15px]">
            <thead><tr className="border-b border-surface-border">
              <th className="text-left px-6 py-4 text-[13px] font-medium text-ink-500">Startup</th>
              <th className="text-left px-6 py-4 text-[13px] font-medium text-ink-500">Best-matching role</th>
              <th className="text-left px-6 py-4 text-[13px] font-medium text-ink-500">Type</th>
              <th className="text-left px-6 py-4 text-[13px] font-medium text-ink-500">Stage</th>
              <th className="text-left px-6 py-4 text-[13px] font-medium text-ink-500">Match</th>
            </tr></thead>
            <tbody>
              {grouped.map((g) => {
                const top = g.roles[0];
                return (
                  <tr key={g.startup_id} className="border-b border-surface-border last:border-0 hover:bg-surface-muted/50 cursor-pointer" onClick={() => navigate(`/app/startups/${g.startup_id}`)}>
                    <td className="px-6 py-4 font-medium text-ink-900">{g.startup_name}</td>
                    <td className="px-6 py-4 text-ink-700">{top.gap_role}{g.roles.length > 1 && <span className="text-ink-300 text-[13px]"> +{g.roles.length - 1} more role{g.roles.length > 2 ? 's' : ''}</span>}</td>
                    <td className="px-6 py-4 text-ink-700">{top.seeking_type?.replace('_', ' ')}</td>
                    <td className="px-6 py-4 text-ink-700">{g.stage}</td>
                    <td className="px-6 py-4 text-violet-600 font-medium">{Math.round(top.score * 100)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}
