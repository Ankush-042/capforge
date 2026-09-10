import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Shell from '../components/Shell.jsx';
import { Search, Sparkles, BarChart3, MessageSquare, ArrowUpRight } from 'lucide-react';
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

  // Postgres returns NUMERIC as a STRING, so `s + d.score` concatenates
  // instead of adding and the result is NaN. The DealFlow page happens to
  // work because Math.round(string * 100) coerces, but reduce with + does
  // not. Parse explicitly, and guard against any unparseable value.
  const avgFit = deals.length > 0
    ? Math.round(deals.reduce((s, d) => s + (parseFloat(d.score) || 0), 0) / deals.length * 100)
    : 0;

  const top = deals.length > 0 ? deals[0] : null;

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
      {/* WHERE YOU ARE. An investor opening this wants to know if anything
          new is worth their attention, not to read a greeting. */}
      <div className="mb-7">
        <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-violet-600 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
          {top ? 'Matching your thesis' : 'Nothing matching yet'}
        </p>
        <h1 className="font-editorial italic text-[32px] text-trust-fg leading-tight max-w-3xl">
          {top
            ? `${top.startup_name} is the closest thing to what you back.`
            : 'No ventures match your thesis right now.'}
        </h1>
        <p className="text-[15px] text-ink-700 mt-3 max-w-2xl leading-relaxed">
          {top
            ? `${deals.length === 1 ? 'One venture has' : `${deals.length} ventures have`} crossed the readiness bar and fit what you invest in.`
            : 'Ventures appear here once they pass the readiness bar and match your domains and stages.'}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <Link to="/app/investor/deal-flow" className="group rounded-xl border border-black/5 shadow-card p-5 hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-200" style={{ backgroundColor: '#EED8FF' }}>
          <div className="flex items-start justify-between mb-4">
            <span className="text-[11px] font-semibold tracking-wide uppercase text-ink-700/70">Deal flow</span>
            <Search size={14} className="text-ink-700/50 group-hover:text-ink-900 transition-colors" />
          </div>
          <span className="text-[34px] font-semibold text-ink-950 leading-none tabular-nums tracking-tight">{deals.length}</span>
          <p className="text-[12px] text-ink-700/80 mt-2 leading-snug">{deals.length === 0 ? 'Nothing yet' : 'Fit your thesis'}</p>
        </Link>

        <Link to="/app/investor/deal-flow" className="group rounded-xl border border-black/5 shadow-card p-5 hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-200" style={{ backgroundColor: '#D1EAFE' }}>
          <div className="flex items-start justify-between mb-4">
            <span className="text-[11px] font-semibold tracking-wide uppercase text-ink-700/70">Best fit</span>
            <Sparkles size={14} className="text-ink-700/50 group-hover:text-ink-900 transition-colors" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[34px] font-semibold text-ink-950 leading-none tabular-nums tracking-tight">{top ? Math.round(parseFloat(top.score) * 100) : '—'}</span>
            {top && <span className="text-[13px] text-ink-700/60">%</span>}
          </div>
          <p className="text-[12px] text-ink-700/80 mt-2 leading-snug truncate">{top ? top.startup_name : 'No matches'}</p>
        </Link>

        <Link to="/app/investor/deal-flow" className="group rounded-xl border border-black/5 shadow-card p-5 hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-200" style={{ backgroundColor: '#FFE8DA' }}>
          <div className="flex items-start justify-between mb-4">
            <span className="text-[11px] font-semibold tracking-wide uppercase text-ink-700/70">Average fit</span>
            <BarChart3 size={14} className="text-ink-700/50 group-hover:text-ink-900 transition-colors" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[34px] font-semibold text-ink-950 leading-none tabular-nums tracking-tight">{deals.length > 0 ? avgFit : '—'}</span>
            {deals.length > 0 && <span className="text-[13px] text-ink-700/60">%</span>}
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-black/10 overflow-hidden">
            <div className="h-full rounded-full bg-blue-500 transition-all duration-700" style={{ width: `${avgFit}%` }} />
          </div>
        </Link>

        <Link to="/app/inbox" className="group rounded-xl border border-black/5 shadow-card p-5 hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-200" style={{ backgroundColor: '#FFF3D1' }}>
          <div className="flex items-start justify-between mb-4">
            <span className="text-[11px] font-semibold tracking-wide uppercase text-ink-700/70">Conversations</span>
            <MessageSquare size={14} className="text-ink-700/50 group-hover:text-ink-900 transition-colors" />
          </div>
          <span className="text-[34px] font-semibold text-ink-950 leading-none tabular-nums tracking-tight">{connections.length}</span>
          <p className="text-[12px] text-ink-700/80 mt-2 leading-snug">{connections.length === 0 ? 'None started' : 'Founders you are talking to'}</p>
        </Link>
      </div>

      {/* Market context sits above the deals: what is moving should frame
          what you are looking at, not trail after it. */}
      <div className="mb-8"><SignalPanel endpoint="/signal/investor" /></div>

      {top && (
        <div className="mb-8">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-[15px] font-semibold text-ink-900">Worth your attention</h2>
            <Link to="/app/investor/deal-flow" className="text-[13px] text-ink-500 hover:text-violet-600 transition-colors">All deal flow</Link>
          </div>
          <Link to={`/app/startups/${top.startup_id}`} className="group block relative overflow-hidden rounded-xl bg-ink-950 p-7 hover:shadow-elevated transition-shadow">
            <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle at 15% 20%, #7C5CFC 0%, transparent 55%), radial-gradient(circle at 85% 80%, #1F5D52 0%, transparent 55%)' }} />
            <div className="relative flex items-start justify-between gap-8">
              <div className="min-w-0">
                <p className="text-[11px] font-medium tracking-[0.12em] uppercase text-mint-500 mb-2">
                  {Math.round(parseFloat(top.score) * 100)}% thesis fit{top.stage ? ` · ${top.stage}` : ''}
                </p>
                <p className="font-display text-[26px] font-semibold text-white leading-tight mb-2">{top.startup_name}</p>
                <p className="text-[14px] text-white/60 leading-relaxed max-w-xl">{(top.domain || []).join(' · ')}</p>
              </div>
              <div className="shrink-0 flex items-center gap-2 text-[13px] font-medium text-white/70 group-hover:text-white transition-colors">
                See the venture <ArrowUpRight size={15} />
              </div>
            </div>
          </Link>
        </div>
      )}

      <div>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-[15px] font-semibold text-ink-900">Also matching</h2>
          <Link to="/app/investor/saved-searches" className="text-[13px] text-ink-500 hover:text-violet-600 transition-colors">Saved searches</Link>
        </div>
        {deals.length <= 1 ? (
          <div className="bg-surface rounded-xl border border-surface-border shadow-card">
            <p className="text-[13px] text-ink-500 py-12 text-center">
              {deals.length === 0
                ? (hasRoleProfile ? 'Nothing matches your thesis yet. Ventures appear as they cross the readiness bar.' : 'Complete your thesis to start seeing real deal flow.')
                : 'Just the one so far.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {deals.slice(1, 5).map((d) => (
              <Link key={d.id} to={`/app/startups/${d.startup_id}`}
                className="group bg-surface rounded-xl border border-surface-border shadow-card p-5 hover:border-violet-500/50 hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-200">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <p className="text-[15px] font-semibold text-ink-950 truncate">{d.startup_name}</p>
                  <span className="text-[13px] font-semibold text-violet-600 tabular-nums shrink-0">{Math.round(parseFloat(d.score) * 100)}%</span>
                </div>
                <p className="text-[13px] text-ink-500 leading-snug">{d.stage || 'Stage not set'}</p>
                <p className="text-[12px] text-ink-300 mt-2 truncate">{(d.domain || []).join(' · ')}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
