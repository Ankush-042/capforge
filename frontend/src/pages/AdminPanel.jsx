import React, { useState, useEffect } from 'react';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ShieldCheck, Search, Ban, CheckCircle2, Shield, ShieldOff, Trash2, AlertTriangle, Wrench, Users2, Building2, Link2, Layers } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import SkeletonPage from '../components/Skeleton.jsx';
import StatCard, { STAT_PALETTE } from '../components/charts/StatCard.jsx';
import { getAdminOperational, getAdminStats, getAdminUsers, getAdminStartups, setStartupVerification, deleteAdminStartup, setUserStatus, setUserAdmin, getIntegrityCheck, fixIntegrityIssue } from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';

const VERIFICATION_STATUSES = ['CLAIMED', 'PENDING_VERIFICATION', 'VERIFIED', 'UNVERIFIED'];
const SEVERITY_STYLE = { critical: 'bg-signal-critical/10 text-signal-critical', high: 'bg-amber-100 text-amber-700', medium: 'bg-blue-50 text-blue-600', low: 'bg-surface-muted text-ink-500' };
const BAR_COLORS = ['#7C5CFC', '#4C86F9', '#F0A84E', '#EF6E85', '#3FB081'];

/** Real, dedicated bar-chart treatment for a breakdown — replaces flat text rows with an actual visual comparison. */

/**
 * ACTIVITY OVER TIME, which the panel never showed.
 *
 * Four bar charts of totals cannot say whether the platform is growing,
 * stalling or dead. Eight weeks can, at a glance, and the shape is the whole
 * point: a single number is a fact, a line is a trend.
 *
 * Empty weeks are drawn rather than skipped, because a gap in a series reads
 * as a quiet week while a missing row reads as a bug.
 */
function ActivityChart({ rows }) {
  if (!rows || rows.length === 0) return null;
  const series = [
    { key: 'signups', label: 'Signups', color: '#7C5CFC' },
    { key: 'ventures', label: 'Ventures', color: '#1677E8' },
    { key: 'conversations', label: 'Conversations', color: '#C58A00' },
    { key: 'joins', label: 'People joining a team', color: '#3FB081' },
  ];
  const totals = Object.fromEntries(series.map((s) => [s.key, rows.reduce((a, r) => a + r[s.key], 0)]));

  return (
    <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7 mb-6">
      <div className="flex items-baseline justify-between mb-1">
        <p className="text-[15px] font-semibold text-ink-900">The last eight weeks</p>
        <div className="flex items-center gap-5">
          {series.map((x) => (
            <span key={x.key} className="flex items-center gap-1.5 text-[12px] text-ink-500">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: x.color }} />
              {x.label} <span className="font-medium text-ink-900 tabular-nums">{totals[x.key]}</span>
            </span>
          ))}
        </div>
      </div>
      <p className="text-[13px] text-ink-500 mb-5">Whether this is growing, flat, or stopped.</p>

      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={rows} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
          <defs>
            {series.map((x) => (
              <linearGradient key={x.key} id={`fill-${x.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={x.color} stopOpacity={0.18} />
                <stop offset="100%" stopColor={x.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#EFEFF3" vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8A8A99' }} />
          <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8A8A99' }} />
          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E7E6EE', fontSize: 13, boxShadow: 'none' }} />
          {series.map((x) => (
            <Area key={x.key} type="monotone" dataKey={x.key} name={x.label}
                  stroke={x.color} strokeWidth={2} fill={`url(#fill-${x.key})`} dot={false} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * IS ANYTHING BROKEN RIGHT NOW.
 *
 * These are the same faults the doctor script checks, surfaced in the product
 * so somebody can see a problem without opening a terminal. Each says what it
 * means rather than only a number, because "12" is not actionable and "12
 * roles cannot be matched semantically" is.
 */
function Health({ health }) {
  if (!health) return null;
  const faults = [
    { n: health.gaps_without_embedding, label: 'open roles have no embedding',
      means: 'Matching for those roles falls back to keywords, so good people are missed.',
      fix: 'node scripts/backfill-gap-embeddings.js' },
    { n: health.stale_recommendations, label: 'recommendations point at closed roles',
      means: 'Somebody will apply for a role that is already gone.',
      fix: 'node scripts/expire-stale-recommendations.js' },
    { n: health.ventures_unassessed, label: 'ventures have never been assessed',
      means: 'They show no score and sit at the bottom of every investor deal flow.',
      fix: 'node scripts/recompute-readiness.js' },
    { n: health.ventures_without_vision, label: 'ventures have no founder vision',
      means: 'They get no alignment score, so they rank on skills alone.',
      fix: 'The founder writes this themselves. There is no script for it.' },
  ].filter((f) => f.n > 0);

  return (
    <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7 mb-6">
      <p className="text-[15px] font-semibold text-ink-900 mb-1">Is anything broken</p>
      <p className="text-[13px] text-ink-500 mb-5">
        The same checks <span className="font-mono text-[12px]">scripts/doctor.js</span> runs, without opening a terminal.
      </p>

      {faults.length === 0 ? (
        <div className="flex items-center gap-2.5 text-[14px] text-mint-500">
          <span className="w-2 h-2 rounded-full bg-mint-500" />
          Nothing. {health.active_recommendations} active recommendations across the platform.
        </div>
      ) : (
        <div className="space-y-4">
          {faults.map((f) => (
            <div key={f.label} className="flex items-start gap-3.5">
              <span className="text-[19px] font-semibold text-signal-critical tabular-nums leading-none mt-0.5 w-9 shrink-0">{f.n}</span>
              <div className="min-w-0">
                <p className="text-[14px] text-ink-900">{f.label}</p>
                <p className="text-[13px] text-ink-500 leading-relaxed mt-0.5">{f.means}</p>
                <p className="text-[12px] text-ink-300 font-mono mt-1">{f.fix}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * IS THE ENGINE REACHING ANYBODY.
 *
 * Counting rows in the recommendations table says it ran. These say it
 * worked: what share of each side of the marketplace actually has something.
 */
function Reach({ reach }) {
  if (!reach) return null;
  const bars = [
    { label: 'Contributors with matches', got: reach.contributors_with_matches, of: reach.contributors_total },
    { label: 'Ventures with candidates', got: reach.ventures_with_candidates, of: reach.ventures_total },
    { label: 'Investors with deal flow', got: reach.investors_with_dealflow, of: reach.investors_total },
  ];

  return (
    <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
      <p className="text-[15px] font-semibold text-ink-900 mb-1">Is the engine reaching anybody</p>
      <p className="text-[13px] text-ink-500 mb-6">
        A recommendation count says it ran. This says it worked.
      </p>
      <div className="space-y-5">
        {bars.map((b) => {
          const pct = b.of > 0 ? Math.round((b.got / b.of) * 100) : 0;
          return (
            <div key={b.label}>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-[13.5px] text-ink-800">{b.label}</span>
                <span className="text-[13.5px] text-ink-500 tabular-nums">
                  <span className="font-semibold text-ink-950">{b.got}</span> of {b.of}
                </span>
              </div>
              <div className="h-[5px] rounded-full bg-surface-muted overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                     style={{ width: `${pct}%`, backgroundColor: pct < 40 ? '#E15C4D' : pct < 75 ? '#C58A00' : '#3FB081' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * WHICH FIELDS HAVE NOBODY IN THEM.
 *
 * The most actionable fact available to whoever runs this, and nothing has
 * ever shown it: a field with one venture is a field where a contributor who
 * picks it sees a single result and concludes the product is empty.
 */
function Fields({ fields }) {
  if (!fields || fields.length === 0) return null;
  const thin = fields.filter((f) => f.ventures <= 1);

  return (
    <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
      <p className="text-[15px] font-semibold text-ink-900 mb-1">Ventures per field</p>
      <p className="text-[13px] text-ink-500 mb-5">
        {thin.length > 0
          ? `${thin.length} field${thin.length === 1 ? '' : 's'} with one venture. Somebody choosing one of those sees a single result.`
          : 'Every field has more than one venture.'}
      </p>
      <div className="space-y-2.5">
        {fields.map((f) => (
          <div key={f.field} className="flex items-center gap-4">
            <span className="text-[13px] text-ink-700 w-36 shrink-0 truncate">{f.field}</span>
            <div className="flex-1 h-[5px] rounded-full bg-surface-muted overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                   style={{ width: `${Math.min(100, (f.ventures / Math.max(...fields.map((x) => x.ventures))) * 100)}%`,
                            backgroundColor: f.ventures <= 1 ? '#E4A33A' : '#7C5CFC' }} />
            </div>
            <span className="text-[13px] font-medium text-ink-900 tabular-nums w-7 text-right">{f.ventures}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BreakdownChart({ title, rows }) {
  const data = rows.map(r => ({ name: Object.values(r)[0], value: parseInt(Object.values(r)[1]) }));
  return (
    <div className="bg-surface rounded-xl border border-surface-border shadow-card p-6">
      <p className="text-[13px] font-medium text-ink-500 mb-4">{title}</p>
      <ResponsiveContainer width="100%" height={Math.max(data.length * 44, 90)}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 13, fontWeight: 700, fill: '#161719' }} axisLine={false} tickLine={false} />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20} label={{ position: 'right', fontSize: 14, fontWeight: 700, fill: '#161719' }}>
            {data.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Real fix for a confirmed complaint: the admin panel was genuinely
 * static — Users had zero actions at all, Startups had one narrow
 * one-way 'Approve' button. Now: real search across both, real
 * suspend/activate and promote/demote actions on users, real
 * verification-status control (any status, not just approve) and real
 * delete on startups.
 */
export default function AdminPanel() {
  const showToast = useToast();
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [tab, setTab] = useState('stats');
  const [stats, setStats] = useState(null);
  // Health, movement and reach. The four GROUP BY charts could answer none
  // of the questions somebody running this would actually ask.
  const [ops, setOps] = useState(null);
  const [users, setUsers] = useState([]);
  const [startups, setStartups] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [startupSearch, setStartupSearch] = useState('');
  const [health, setHealth] = useState(null);
  const [fixingId, setFixingId] = useState(null);

  async function loadAll(uSearch = userSearch, sSearch = startupSearch) {
    const [statsRes, usersRes, startupsRes, healthRes] = await Promise.all([getAdminStats(), getAdminUsers(uSearch), getAdminStartups(sSearch), getIntegrityCheck()]);
      getAdminOperational().then(({ ok, data }) => { if (ok && data.success) setOps(data); });
    if (statsRes.data?.error === 'FORBIDDEN') { setForbidden(true); setLoading(false); return; }
    if (statsRes.ok && statsRes.data.success) setStats(statsRes.data.stats);
    if (usersRes.ok && usersRes.data.success) setUsers(usersRes.data.users);
    if (startupsRes.ok && startupsRes.data.success) setStartups(startupsRes.data.startups);
    if (healthRes.ok && healthRes.data.success) setHealth(healthRes.data.checks);
    setLoading(false);
  }

  async function handleFix(checkId) {
    setFixingId(checkId);
    const { ok, data } = await fixIntegrityIssue(checkId);
    setFixingId(null);
    if (ok && data.success) { showToast(`Fixed ${data.fixed} record${data.fixed !== 1 ? 's' : ''}.`); await loadAll(); }
    else showToast(data.error || 'Could not fix automatically.', 'error');
  }

  useEffect(() => { loadAll(); }, []);

  async function handleVerify(startupId, status) {
    const { ok, data } = await setStartupVerification(startupId, status);
    if (ok && data.success) { showToast('Verification status updated.'); await loadAll(); }
    else showToast(data.error || 'Could not update.', 'error');
  }

  async function handleDeleteStartup(startupId, name) {
    if (!window.confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;
    const { ok, data } = await deleteAdminStartup(startupId);
    if (ok && data.success) { showToast(`${name} deleted.`); await loadAll(); }
    else showToast(data.error || 'Could not delete.', 'error');
  }

  async function handleToggleUserStatus(userId, currentStatus) {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const { ok, data } = await setUserStatus(userId, newStatus);
    if (ok && data.success) { showToast(`Account ${newStatus === 'SUSPENDED' ? 'suspended' : 'reactivated'}.`); await loadAll(); }
    else showToast(data.error || 'Could not update.', 'error');
  }

  async function handleToggleAdmin(userId, currentIsAdmin) {
    const { ok, data } = await setUserAdmin(userId, !currentIsAdmin);
    if (ok && data.success) { showToast(`Admin privileges ${!currentIsAdmin ? 'granted' : 'revoked'}.`); await loadAll(); }
    else showToast(data.error || 'Could not update.', 'error');
  }

  if (loading) return <Shell title="Admin"><SkeletonPage cards={3} /></Shell>;
  if (forbidden) return <Shell title="Admin"><div className="bg-surface rounded-xl border border-surface-border shadow-card p-12 text-center"><p className="text-[15px] text-ink-500">Admin access required. This account is not an admin.</p></div></Shell>;

  return (
    <Shell title="Admin panel" subtitle="Platform oversight">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center"><ShieldCheck size={18} /></div>
        <h1 className="text-[26px] font-semibold text-ink-900 tracking-tight">Admin panel</h1>
      </div>

      <div className="flex gap-2 mb-5">
        {['stats', 'health', 'users', 'startups'].map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`text-sm px-4 py-2 rounded-lg font-medium capitalize transition-colors ${tab === t ? 'bg-ink-900 text-white' : 'bg-surface-muted text-ink-500'}`}>{t}</button>
        ))}
      </div>

      {tab === 'stats' && stats && (
        <>
          <div className="grid grid-cols-4 gap-5 mb-6">
            <StatCard label="Total Users" value={stats.users_by_role.reduce((s, r) => s + parseInt(r.count), 0)} sub="Founders, contributors, investors" icon={<Users2 size={18} />} {...STAT_PALETTE.lavender} />
            <StatCard label="Total Startups" value={stats.startups_by_status.reduce((s, r) => s + parseInt(r.count), 0)} sub="Across every status" icon={<Building2 size={18} />} {...STAT_PALETTE.blue} />
            <StatCard label="Conversations" value={(stats.conversations_by_status || []).reduce((s, r) => s + parseInt(r.count), 0)} sub={`${(stats.conversations_by_status || []).find(r => r.status === 'FORMED')?.count || 0} became teams`} icon={<Link2 size={18} />} {...STAT_PALETTE.cream} />
            <StatCard label="Critical Gaps" value={stats.gaps_by_priority.find(r => r.priority_level === 'CRITICAL')?.count || 0} sub="Need real candidates" icon={<Layers size={18} />} {...STAT_PALETTE.peach} />
          </div>
          {/* WHAT SOMEBODY RUNNING THIS WOULD ACTUALLY ASK.
              The four bar charts below were true and answered none of it: is
              it growing, is anything broken, is the engine reaching anybody,
              and which fields are empty. Those come first now, and the
              breakdowns stay underneath because they are still worth having,
              just not worth the whole page. */}
          <ActivityChart rows={ops?.activity} />

          <Health health={ops?.health} />

          <div className="grid grid-cols-2 gap-6 mb-6">
            <Reach reach={ops?.reach} />
            <Fields fields={ops?.fields} />
          </div>

          <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-ink-300 mb-3">Breakdowns</p>
          <div className="grid grid-cols-2 gap-6">
            <BreakdownChart title="Users By Role" rows={stats.users_by_role} />
            <BreakdownChart title="Startups By Status" rows={stats.startups_by_status} />
            <BreakdownChart title="Conversations" rows={stats.conversations_by_status || []} />
            <BreakdownChart title="Gaps By Priority" rows={stats.gaps_by_priority} />
          </div>
        </>
      )}

      {tab === 'health' && health && (
        <div className="space-y-3">
          <p className="text-[13px] text-ink-500 mb-2">Every check here is drawn from a real, confirmed bug found during this build — not a hypothetical.</p>
          {health.map((check) => (
            <div key={check.id} className="bg-surface rounded-xl border border-surface-border shadow-card p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {check.count > 0 ? <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" /> : <CheckCircle2 size={18} className="text-mint-500 shrink-0 mt-0.5" />}
                  <div>
                    <p className="text-[15px] font-medium text-ink-900">{check.label}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[13px] font-semibold px-2 py-0.5 rounded-md ${SEVERITY_STYLE[check.severity]}`}>{check.count} affected</span>
                      <span className="text-[11px] text-ink-300 uppercase font-medium">{check.severity}</span>
                    </div>
                    {check.count > 0 && check.detail && (
                      <p className="text-[12px] text-ink-500 mt-2 max-w-2xl">{check.detail.filter(Boolean).slice(0, 8).join(', ')}{check.detail.length > 8 ? `, +${check.detail.length - 8} more` : ''}</p>
                    )}
                  </div>
                </div>
                {check.count > 0 && check.fixable && (
                  <button onClick={() => handleFix(check.id)} disabled={fixingId === check.id} className="shrink-0 flex items-center gap-1.5 text-xs bg-ink-900 hover:bg-ink-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50">
                    <Wrench size={12} /> {fixingId === check.id ? 'Fixing…' : 'Fix now'}
                  </button>
                )}
                {check.count > 0 && !check.fixable && (
                  <span className="shrink-0 text-[11px] text-ink-300 italic">Needs a real decision, not auto-fixable</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'users' && (
        <div>
          <div className="relative mb-4">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
            <input value={userSearch} onChange={(e) => { setUserSearch(e.target.value); loadAll(e.target.value, startupSearch); }}
              placeholder="Search by name or email…" className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-surface-border bg-surface-muted text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
          </div>
          <div className="bg-surface rounded-xl border border-surface-border shadow-card">
            {users.length === 0 ? <p className="text-[13px] text-ink-500 text-center py-8">No users match.</p> : users.map((u) => (
              <div key={u.id} className="flex items-center justify-between p-4 border-b border-surface-border last:border-0">
                <div>
                  <p className="text-[15px] font-medium text-ink-900 flex items-center gap-2">
                    {u.display_name || u.email}
                    {u.is_admin && <span className="text-[10px] px-1.5 py-0.5 rounded bg-ink-900 text-white font-medium">ADMIN</span>}
                    {u.status === 'SUSPENDED' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-signal-critical/10 text-signal-critical font-medium">SUSPENDED</span>}
                  </p>
                  <p className="text-[13px] text-ink-500">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded-md bg-surface-muted text-ink-500 font-medium">{u.primary_role}</span>
                  <button onClick={() => handleToggleAdmin(u.id, u.is_admin)} title={u.is_admin ? 'Revoke admin' : 'Grant admin'} className="p-1.5 rounded-lg hover:bg-surface-muted transition-colors text-ink-500">
                    {u.is_admin ? <ShieldOff size={15} /> : <Shield size={15} />}
                  </button>
                  <button onClick={() => handleToggleUserStatus(u.id, u.status)} title={u.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'} className="p-1.5 rounded-lg hover:bg-surface-muted transition-colors text-ink-500">
                    {u.status === 'ACTIVE' ? <Ban size={15} /> : <CheckCircle2 size={15} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'startups' && (
        <div>
          <div className="relative mb-4">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
            <input value={startupSearch} onChange={(e) => { setStartupSearch(e.target.value); loadAll(userSearch, e.target.value); }}
              placeholder="Search by startup name…" className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-surface-border bg-surface-muted text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
          </div>
          <div className="bg-surface rounded-xl border border-surface-border shadow-card">
            {startups.length === 0 ? <p className="text-[13px] text-ink-500 text-center py-8">No startups match.</p> : startups.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-4 border-b border-surface-border last:border-0">
                <div><p className="text-[15px] font-medium text-ink-900">{s.name}</p><p className="text-[13px] text-ink-500">{s.status} · {s.verification_status}</p></div>
                <div className="flex items-center gap-2">
                  <select value={s.verification_status} onChange={(e) => handleVerify(s.id, e.target.value)} className="text-xs px-2 py-1.5 rounded-lg border border-surface-border bg-white font-medium">
                    {VERIFICATION_STATUSES.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <button onClick={() => handleDeleteStartup(s.id, s.name)} title="Delete startup" className="p-1.5 rounded-lg hover:bg-signal-critical/10 transition-colors text-signal-critical">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Shell>
  );
}
