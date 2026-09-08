import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search, Ban, CheckCircle2, Shield, ShieldOff, Trash2 } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import { getAdminStats, getAdminUsers, getAdminStartups, setStartupVerification, deleteAdminStartup, setUserStatus, setUserAdmin } from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';

const VERIFICATION_STATUSES = ['CLAIMED', 'PENDING_VERIFICATION', 'VERIFIED', 'UNVERIFIED'];

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
  const [users, setUsers] = useState([]);
  const [startups, setStartups] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [startupSearch, setStartupSearch] = useState('');

  async function loadAll(uSearch = userSearch, sSearch = startupSearch) {
    const [statsRes, usersRes, startupsRes] = await Promise.all([getAdminStats(), getAdminUsers(uSearch), getAdminStartups(sSearch)]);
    if (statsRes.data?.error === 'FORBIDDEN') { setForbidden(true); setLoading(false); return; }
    if (statsRes.ok && statsRes.data.success) setStats(statsRes.data.stats);
    if (usersRes.ok && usersRes.data.success) setUsers(usersRes.data.users);
    if (startupsRes.ok && startupsRes.data.success) setStartups(startupsRes.data.startups);
    setLoading(false);
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

  if (loading) return <Shell title="Admin"><div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" /></div></Shell>;
  if (forbidden) return <Shell title="Admin"><div className="bg-surface rounded-xl border border-surface-border shadow-card p-12 text-center"><p className="text-[15px] text-ink-500">Admin access required. This account is not an admin.</p></div></Shell>;

  return (
    <Shell title="Admin panel" subtitle="Platform oversight">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center"><ShieldCheck size={18} /></div>
        <h1 className="text-[26px] font-semibold text-ink-900 tracking-tight">Admin panel</h1>
      </div>

      <div className="flex gap-2 mb-5">
        {['stats', 'users', 'startups'].map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`text-sm px-4 py-2 rounded-lg font-medium capitalize transition-colors ${tab === t ? 'bg-ink-900 text-white' : 'bg-surface-muted text-ink-500'}`}>{t}</button>
        ))}
      </div>

      {tab === 'stats' && stats && (
        <div className="grid grid-cols-2 gap-6">
          {Object.entries(stats).map(([key, rows]) => (
            <div key={key} className="bg-surface rounded-xl border border-surface-border shadow-card p-6">
              <p className="text-[13px] font-medium text-ink-500 mb-3 capitalize">{key.replace(/_/g, ' ')}</p>
              {rows.map((r, i) => <div key={i} className="flex justify-between text-[15px] py-1"><span className="text-ink-700">{Object.values(r)[0]}</span><span className="font-medium text-ink-900">{Object.values(r)[1]}</span></div>)}
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
