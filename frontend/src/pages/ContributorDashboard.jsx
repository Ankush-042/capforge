import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Shell from '../components/Shell.jsx';
import StatCard, { STAT_PALETTE } from '../components/charts/StatCard.jsx';
import { getMyProfile, getMyRecommendationsAsContributor, getMyConnections } from '../services/startups.js';

/** Real fix applied consistently now, everywhere this data is shown: group by startup, don't count/list raw gap-matches as if each were a separate opportunity. */
function groupByStartup(recs) {
  const groups = new Map();
  for (const r of recs) {
    if (!groups.has(r.startup_id)) groups.set(r.startup_id, { startup_id: r.startup_id, startup_name: r.startup_name, domain: r.domain, roles: [] });
    groups.get(r.startup_id).roles.push(r);
  }
  return [...groups.values()].map(g => ({ ...g, roles: g.roles.sort((a, b) => b.score - a.score) })).sort((a, b) => b.roles[0].score - a.roles[0].score);
}

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
  const grouped = groupByStartup(recs);

  return (
    <Shell persona="CONTRIBUTOR" title={profile?.display_name || 'Dashboard'} subtitle={profile?.headline}>
      <div className="mb-6">
        <p className="text-xs text-ink-500 mb-1">Good evening, {profile?.display_name?.split(' ')[0]}</p>
        <h1 className="text-[26px] font-semibold text-ink-900 tracking-tight">Where your skills create the most value</h1>
      </div>

      <div className="grid grid-cols-4 gap-5 mb-7">
        <StatCard label="Recommended" value={grouped.length} sub="Startups match you" icon="◈" {...STAT_PALETTE.lavender} />
        <StatCard label="Profile strength" value={`${profile?.completion_score || 0}%`} sub="Add more to improve" icon="◎" {...STAT_PALETTE.blue} />
        <StatCard label="Pending" value={pending} sub="Awaiting response" icon="◐" {...STAT_PALETTE.peach} />
        <StatCard label="Connections" value={connections.length} sub="Total" icon="◍" {...STAT_PALETTE.cream} />
      </div>

      <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
        <p className="text-[15px] font-semibold text-ink-900 mb-4">Recommended for you</p>
        {grouped.length === 0 ? (
          <p className="text-[13px] text-ink-500 py-6 text-center">No recommendations yet — a founder needs to rank candidates for a gap that matches you.</p>
        ) : grouped.slice(0, 5).map((g) => {
          const top = g.roles[0];
          return (
            <Link to={`/app/startups/${g.startup_id}`} key={g.startup_id} className="hover-lift flex items-center justify-between py-4 border-b border-surface-border last:border-0 hover:bg-surface-muted/50 transition-colors -mx-1 px-1 rounded-lg">
              <div>
                <p className="text-[15px] font-medium text-ink-900">{g.startup_name}</p>
                <p className="text-[13px] text-ink-500">{(g.domain || []).join(', ')} · needs {top.gap_role}{g.roles.length > 1 && ` (+${g.roles.length - 1} more)`}</p>
              </div>
              <span className="text-sm font-medium text-violet-600">{Math.round(top.score * 100)}%</span>
            </Link>
          );
        })}
      </div>
    </Shell>
  );
}
