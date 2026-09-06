import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LineChart } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Badge from '../components/charts/Badge.jsx';
import { getInvestorRecommendations, refreshInvestorRecommendations, sendConnection } from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';

export default function InvestorDealFlow() {
  const showToast = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deals, setDeals] = useState([]);

  async function load() {
    const { ok, data } = await getInvestorRecommendations();
    if (ok && data.success) setDeals(data.recommendations);
  }

  useEffect(() => { load().then(() => setLoading(false)); }, []);

  async function handleRefresh() {
    setRefreshing(true);
    const { ok, data } = await refreshInvestorRecommendations();
    setRefreshing(false);
    if (!ok || !data.success) { showToast('Refresh failed.', 'error'); return; }
    await load();
    showToast('Deal flow refreshed.');
  }

  if (loading) return <Shell persona="INVESTOR" title="Deal flow"><div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" /></div></Shell>;

  return (
    <Shell persona="INVESTOR" title="Deal flow">
      <PageHeader icon={LineChart} iconBg="bg-blue-50" iconColor="text-blue-500" title="Deal flow" subtitle="Ranked against your stated thesis, with real evidence."
        action={
          <button onClick={handleRefresh} disabled={refreshing} className="text-sm bg-ink-900 hover:bg-ink-700 text-white px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50">
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        } />
      {deals.length === 0 ? (
        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-12 text-center">
          <p className="text-[15px] text-ink-500">No deal flow yet. Click Refresh above.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {deals.map((d) => (
            <div key={d.id} className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <Link to={`/app/startups/${d.startup_id}`} className="text-[15px] font-semibold text-ink-900 hover:text-violet-600 transition-colors">{d.startup_name}</Link>
                  <p className="text-[13px] text-ink-500">{(d.domain || []).join(', ')} · {d.stage}</p>
                </div>
                <span className="text-lg font-semibold text-violet-600">{Math.round(d.score * 100)}%</span>
              </div>
              <div className="space-y-1 mb-4">
                {(d.explanation?.strengths || []).map((s) => <p key={s} className="text-[13px] text-ink-700 flex gap-1.5"><span className="text-mint-500">✓</span>{s}</p>)}
                {(d.explanation?.watch || []).map((s) => <p key={s} className="text-[13px] text-amber-500 flex gap-1.5"><span>△</span>{s}</p>)}
              </div>
              <Link to={`/app/startups/${d.startup_id}`} className="text-xs bg-violet-50 text-violet-700 px-3 py-1.5 rounded-lg font-medium hover:bg-violet-100 transition-colors inline-block">
                View startup
              </Link>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
