import React, { useState, useEffect } from 'react';
import { Scale } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import { apiFetch } from '../services/api.js';

export default function MultiOfferComparison() {
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState([]);

  useEffect(() => {
    apiFetch('/offers/compare').then(({ ok, data }) => {
      if (ok && data.success) setOffers(data.offers);
      setLoading(false);
    });
  }, []);

  if (loading) return <Shell persona="CONTRIBUTOR" title="Compare offers"><div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" /></div></Shell>;

  return (
    <Shell persona="CONTRIBUTOR" title="Compare offers">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center"><Scale size={18} /></div>
        <h1 className="text-[26px] font-semibold text-ink-900 tracking-tight">Compare your opportunities</h1>
      </div>
      {offers.length === 0 ? (
        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-12 text-center">
          <p className="text-[15px] text-ink-500">No active opportunities to compare yet.</p>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-surface-border shadow-card overflow-hidden">
          <table className="w-full text-[15px]">
            <thead><tr className="border-b border-surface-border">
              <th className="text-left px-6 py-4 text-[13px] font-medium text-ink-500">Startup</th>
              <th className="text-left px-6 py-4 text-[13px] font-medium text-ink-500">Role</th>
              <th className="text-left px-6 py-4 text-[13px] font-medium text-ink-500">Type</th>
              <th className="text-left px-6 py-4 text-[13px] font-medium text-ink-500">Stage</th>
              <th className="text-left px-6 py-4 text-[13px] font-medium text-ink-500">Match</th>
            </tr></thead>
            <tbody>
              {offers.map((o) => (
                <tr key={o.id} className="border-b border-surface-border last:border-0">
                  <td className="px-6 py-4 font-medium text-ink-900">{o.startup_name}</td>
                  <td className="px-6 py-4 text-ink-700">{o.gap_role}</td>
                  <td className="px-6 py-4 text-ink-700">{o.seeking_type?.replace('_', ' ')}</td>
                  <td className="px-6 py-4 text-ink-700">{o.stage}</td>
                  <td className="px-6 py-4 text-violet-600 font-medium">{Math.round(o.score * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}
