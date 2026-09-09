import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Shell from '../components/Shell.jsx';
import StatCard, { STAT_PALETTE } from '../components/charts/StatCard.jsx';
import SignalPanel from '../components/SignalPanel.jsx';
import Badge from '../components/charts/Badge.jsx';
import { getMyProfile, getInvestorRecommendations, getMyConnections } from '../services/startups.js';

export default function InvestorDashboard() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [deals, setDeals] = useState([]);
  const [connections, setConnections] = useState([]);
  const [hasRoleProfile, setHasRoleProfile] = useState(true);

  useEffect(() => {
    async function load() {
      const [profileRes, dealsRes, connRes] = await Promise.all([getMyProfile(), getInvestorRecommendations(), getMyConnections()]);
      if (profileRes.ok && profileRes.data.success) { setProfile(profileRes.data.profile); setHasRoleProfile(!!profileRes.data.roleProfile); }
      if (dealsRes.ok && dealsRes.data.success) setDeals(dealsRes.data.recommendations);
      if (connRes.ok && connRes.data.success) setConnections(connRes.data.connections);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <Shell persona="INVESTOR" title="Dashboard"><div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" /></div></Shell>;

  const avgFit = deals.length > 0 ? Math.round(deals.reduce((s, d) => s + d.score, 0) / deals.length * 100) : 0;

  return (
    <Shell persona="INVESTOR" title={profile?.display_name || 'Dashboard'}>
      {!hasRoleProfile && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[15px] font-semibold text-amber-800">Your thesis isn't set — you have zero real deal flow right now</p>
            <p className="text-[13px] text-amber-700 mt-0.5">Domains, stages, and ticket size were never set. No ventures can be matched to you until this is complete.</p>
          </div>
          <Link to="/app/investor/onboarding" className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Finish now</Link>
        </div>
      )}
      <div className="mb-6">
        <p className="text-xs text-ink-500 mb-1">Good evening, {profile?.display_name?.split(' ')[0]}</p>
        <h1 className="text-[26px] font-semibold text-ink-900 tracking-tight">Which ventures deserve your attention</h1>
      </div>

      <div className="grid grid-cols-4 gap-5 mb-7">
        <StatCard label="Deal flow" value={deals.length} sub="Matching your thesis" icon="◈" {...STAT_PALETTE.lavender} />
        <StatCard label="Avg. thesis fit" value={`${avgFit}%`} sub="Across recommendations" icon="◎" {...STAT_PALETTE.blue} />
        <StatCard label="Connections" value={connections.length} sub="Total" icon="◐" {...STAT_PALETTE.peach} />
        <StatCard label="Pending" value={connections.filter((c) => c.status === 'PENDING').length} sub="Awaiting response" icon="◍" {...STAT_PALETTE.cream} />
      </div>

      <div className="mb-7"><SignalPanel endpoint="/signal/investor" /></div>

      <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
        <p className="text-[15px] font-semibold text-ink-900 mb-4">Top matches</p>
        {deals.length === 0 ? <p className="text-[13px] text-ink-500 py-6 text-center">{hasRoleProfile ? 'No ventures currently match your thesis — check back as new ventures cross the readiness bar.' : 'Complete your thesis in onboarding to start seeing real deal flow.'}</p> : deals.slice(0, 5).map((d) => (
          <div key={d.id} className="flex items-center justify-between py-3">
            <div>
              <p className="text-[15px] font-medium text-ink-900">{d.startup_name}</p>
              <p className="text-[13px] text-ink-500">{(d.domain || []).join(', ')} · {d.stage}</p>
            </div>
            <span className="text-sm font-medium text-violet-600">{Math.round(d.score * 100)}%</span>
          </div>
        ))}
      </div>
    </Shell>
  );
}
