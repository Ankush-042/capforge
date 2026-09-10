import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Shell from '../components/Shell.jsx';
import { Target, Sparkles, UserCheck, MessageSquare, ArrowUpRight } from 'lucide-react';
import MetricTile, { TILE_PALETTE } from '../components/charts/MetricTile.jsx';
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
  const [hasRoleProfile, setHasRoleProfile] = useState(true);

  useEffect(() => {
    async function load() {
      const [profileRes, recsRes, connRes] = await Promise.all([getMyProfile(), getMyRecommendationsAsContributor(), getMyConnections()]);
      if (profileRes.ok && profileRes.data.success) { setProfile(profileRes.data.profile); setHasRoleProfile(!!profileRes.data.roleProfile); }
      if (recsRes.ok && recsRes.data.success) setRecs(recsRes.data.recommendations);
      if (connRes.ok && connRes.data.success) setConnections(connRes.data.connections);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <Shell persona="CONTRIBUTOR" title="Dashboard"><div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" /></div></Shell>;

  const pending = connections.filter((c) => c.status === 'PENDING').length;
  const grouped = groupByStartup(recs);

  const best = grouped.length > 0 ? grouped[0] : null;

  return (
    <Shell persona="CONTRIBUTOR" title={profile?.display_name || 'Dashboard'} subtitle={profile?.headline}>
      {!hasRoleProfile && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[15px] font-semibold text-amber-800">Your profile isn't finished — you're invisible to matching right now</p>
            <p className="text-[13px] text-amber-700 mt-0.5">Availability, domains, and stage were never set. No founder can be matched to you until this is complete.</p>
          </div>
          <Link to="/app/contributor/onboarding" className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Finish now</Link>
        </div>
      )}
      {/* WHERE YOU ARE. A contributor opening this should know whether
          anyone actually wants them yet, and what the single best option
          is, before reading anything else. */}
      <div className="mb-7">
        <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-violet-600 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
          {best ? 'Ventures are looking for you' : 'Getting you found'}
        </p>
        <h1 className="font-editorial italic text-[32px] text-trust-fg leading-tight max-w-3xl">
          {best
            ? `${best.startup_name} needs a ${best.roles[0].gap_role}, and you fit.`
            : 'Nobody has matched with you yet.'}
        </h1>
        <p className="text-[15px] text-ink-700 mt-3 max-w-2xl leading-relaxed">
          {best
            ? `${grouped.length === 1 ? 'One venture' : `${grouped.length} ventures`} currently need what you do. This is the closest fit.`
            : 'Fill in what you are looking for and the domains you care about. That is what founders are matched against.'}
        </p>
      </div>

      {/* METRIC STRIP — same rhythm as the founder home: four equal tiles,
          label, number, meaning. */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <MetricTile
          label="Ventures" value={grouped.length}
          icon={Target} to="/app/contributor/opportunities" {...TILE_PALETTE.lavender}
          caption={grouped.length === 0 ? 'None yet' : 'Currently need you'}
        />
        <MetricTile
          label="Best fit" value={best ? Math.round(best.roles[0].score * 100) : '\u2014'} unit={best ? '%' : null}
          icon={Sparkles} to="/app/contributor/opportunities" {...TILE_PALETTE.blue}
          caption={best ? best.startup_name : 'No matches yet'}
        />
        <MetricTile
          label="Profile" value={profile?.completion_score || 0} unit="%"
          icon={UserCheck} to="/app/my-profile" {...TILE_PALETTE.peach}
          progress={profile?.completion_score || 0}
          caption={(profile?.completion_score || 0) < 80 ? 'Add more to be found' : 'Looking good'}
        />
        <MetricTile
          label="Conversations" value={connections.length}
          icon={MessageSquare} to="/app/inbox" {...TILE_PALETTE.cream}
          badge={pending > 0 ? `${pending} waiting` : null}
          caption={connections.length === 0 ? 'None started' : 'Founders you are talking to'}
        />
      </div>

      {/* THE BEST OPTION — full width, dark, the way the founder home treats
          its critical role. This is the decision the page exists for. */}
      {best && (
        <div className="mb-8">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-[15px] font-semibold text-ink-900">Worth a closer look</h2>
            <Link to="/app/contributor/opportunities" className="text-[13px] text-ink-500 hover:text-violet-600 transition-colors">All ventures</Link>
          </div>
          <Link to={`/app/startups/${best.startup_id}`} className="group block relative overflow-hidden rounded-xl bg-ink-950 p-7 hover:shadow-elevated transition-shadow">
            <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle at 15% 20%, #7C5CFC 0%, transparent 55%), radial-gradient(circle at 85% 80%, #1F5D52 0%, transparent 55%)' }} />
            <div className="relative flex items-start justify-between gap-8">
              <div className="min-w-0">
                <p className="text-[11px] font-medium tracking-[0.12em] uppercase text-mint-500 mb-2">
                  {Math.round(best.roles[0].score * 100)}% fit · {best.roles[0].gap_role}
                </p>
                <p className="font-display text-[26px] font-semibold text-white leading-tight mb-2">{best.startup_name}</p>
                <p className="text-[14px] text-white/60 leading-relaxed max-w-xl">{(best.domain || []).join(' · ')}</p>
              </div>
              <div className="shrink-0 flex items-center gap-2 text-[13px] font-medium text-white/70 group-hover:text-white transition-colors">
                See the venture <ArrowUpRight size={15} />
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* EVERYTHING ELSE — real cards on the canvas, not rows inside a box. */}
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-[15px] font-semibold text-ink-900">Others that need you</h2>
          <Link to="/app/contributor/offers" className="text-[13px] text-ink-500 hover:text-violet-600 transition-colors">Compare them</Link>
        </div>
        {grouped.length <= 1 ? (
          <div className="bg-surface rounded-xl border border-surface-border shadow-card">
            <p className="text-[13px] text-ink-500 py-12 text-center">
              {grouped.length === 0 ? 'No ventures need you yet. Keep your profile current so founders can find you.' : 'Just the one so far.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {grouped.slice(1, 5).map((g) => {
              const top = g.roles[0];
              return (
                <Link key={g.startup_id} to={`/app/startups/${g.startup_id}`}
                  className="group bg-surface rounded-xl border border-surface-border shadow-card p-5 hover:border-violet-500/50 hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-200">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <p className="text-[15px] font-semibold text-ink-950 truncate">{g.startup_name}</p>
                    <span className="text-[13px] font-semibold text-violet-600 tabular-nums shrink-0">{Math.round(top.score * 100)}%</span>
                  </div>
                  <p className="text-[13px] text-ink-500 leading-snug">
                    Needs a {top.gap_role}{g.roles.length > 1 && ` and ${g.roles.length - 1} more`}
                  </p>
                  <p className="text-[12px] text-ink-300 mt-2 truncate">{(g.domain || []).join(' · ')}</p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </Shell>
  );
}
