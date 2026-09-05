import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Shell from '../components/Shell.jsx';
import StatCard, { STAT_PALETTE } from '../components/charts/StatCard.jsx';
import { getMyProfile, getMyRecommendationsAsContributor, getMyConnections } from '../services/startups.js';

export default function ContributorDashboard() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [recs, setRecs] = useState([]);
  const [connections, setConnections] = useState([]);

  useEffect(() => {
    async function load() {
      const [profileRes, recsRes, connRes] = await Promise.all([getMyProfile(), getMyRecommendationsAsContributor(), getMyConnections()]);
      if (profileRes.ok && profileRes.data.success) setProfile(profileRes.data.profile);
      if (recsRes.ok && recsRes.data.success) setRecs(recsRes.data.recommendations);
      if (connRes.ok && connRes.data.success) setConnections(connRes.data.connections);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <Shell persona="CONTRIBUTOR" title="Dashboard"><div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" /></div></Shell>;

  const pending = connections.filter((c) => c.status === 'PENDING').length;

  return (
    <Shell persona="CONTRIBUTOR" title={profile?.display_name || 'Dashboard'} subtitle={profile?.headline}>
      <div className="mb-6">
        <p className="text-xs text-ink-500 mb-1">Good evening, {profile?.display_name?.split(' ')[0]}</p>
        <h1 className="text-[26px] font-semibold text-ink-900 tracking-tight">Where your skills create the most value</h1>
      </div>

      <div className="grid grid-cols-4 gap-5 mb-7">
        <StatCard label="Recommended" value={recs.length} sub="Startups match you" icon="◈" {...STAT_PALETTE.lavender} />
        <StatCard label="Profile strength" value={`${profile?.completion_score || 0}%`} sub="Add more to improve" icon="◎" {...STAT_PALETTE.blue} />
        <StatCard label="Pending" value={pending} sub="Awaiting response" icon="◐" {...STAT_PALETTE.peach} />
        <StatCard label="Connections" value={connections.length} sub="Total" icon="◍" {...STAT_PALETTE.cream} />
      </div>

      <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
        <p className="text-[15px] font-semibold text-ink-900 mb-4">Recommended for you</p>
        {recs.length === 0 ? (
          <p className="text-[13px] text-ink-500 py-6 text-center">No recommendations yet — a founder needs to rank candidates for a gap that matches you.</p>
        ) : recs.slice(0, 5).map((r) => (
          <div key={r.id} className="flex items-center justify-between py-4 border-b border-surface-border last:border-0">
            <div>
              <p className="text-[15px] font-medium text-ink-900">{r.startup_name}</p>
              <p className="text-[13px] text-ink-500">{(r.domain || []).join(', ')} · needs {r.gap_role}</p>
            </div>
            <span className="text-sm font-medium text-violet-600">{Math.round(r.score * 100)}%</span>
          </div>
        ))}
      </div>
    </Shell>
  );
}
