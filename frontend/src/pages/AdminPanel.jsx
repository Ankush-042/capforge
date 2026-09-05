import React, { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import Badge from '../components/charts/Badge.jsx';
import { getAdminStats, getAdminUsers, getAdminStartups, setStartupVerification } from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';

export default function AdminPanel() {
  const showToast = useToast();
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [tab, setTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [startups, setStartups] = useState([]);

  async function loadAll() {
    const [statsRes, usersRes, startupsRes] = await Promise.all([getAdminStats(), getAdminUsers(), getAdminStartups()]);
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
    else showToast('Could not update.', 'error');
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
        <div className="bg-surface rounded-xl border border-surface-border shadow-card">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between p-4 border-b border-surface-border last:border-0">
              <div><p className="text-[15px] font-medium text-ink-900">{u.display_name || u.email}</p><p className="text-[13px] text-ink-500">{u.email}</p></div>
              <span className="text-xs px-2 py-1 rounded-md bg-surface-muted text-ink-500 font-medium">{u.primary_role}</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'startups' && (
        <div className="bg-surface rounded-xl border border-surface-border shadow-card">
          {startups.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-4 border-b border-surface-border last:border-0">
              <div><p className="text-[15px] font-medium text-ink-900">{s.name}</p><p className="text-[13px] text-ink-500">{s.status} · {s.verification_status}</p></div>
              <div className="flex gap-2">
                {s.verification_status === 'PENDING_VERIFICATION' && (
                  <button onClick={() => handleVerify(s.id, 'VERIFIED')} className="text-xs bg-mint-50 text-mint-500 px-3 py-1.5 rounded-lg font-medium">Approve</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
