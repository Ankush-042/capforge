import React, { useState, useEffect } from 'react';
import { Inbox } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import AvatarRow from '../components/charts/AvatarRow.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { InboxIcon, Send } from 'lucide-react';
import { getMyConnections, respondToConnection, getMyProfile } from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';

const STATUS_STYLE = { PENDING: 'bg-amber-50 text-amber-500', ACCEPTED: 'bg-mint-50 text-mint-500', REJECTED: 'bg-rose-50 text-rose-500' };

export default function Connections({ persona = 'CONTRIBUTOR' }) {
  const showToast = useToast();
  const [loading, setLoading] = useState(true);
  const [myUserId, setMyUserId] = useState(null);
  const [connections, setConnections] = useState([]);

  async function load() {
    const { ok, data } = await getMyConnections();
    if (ok && data.success) setConnections(data.connections);
  }

  useEffect(() => {
    async function init() {
      const profileRes = await getMyProfile();
      if (profileRes.ok && profileRes.data.success) setMyUserId(profileRes.data.profile.user_id);
      await load();
      setLoading(false);
    }
    init();
  }, []);

  async function handleRespond(connection, action) {
    const { ok, data } = await respondToConnection(connection.id, action);
    if (!ok || !data.success) { showToast(data.detail || data.error || 'Could not respond.', 'error'); return; }
    if (action === 'accept' && data.propagation?.gaps_recalculated) {
      showToast(`Accepted! Team updated, gaps and readiness recalculated automatically.`);
    } else {
      showToast(action === 'accept' ? 'Connection accepted.' : 'Connection declined.');
    }
    await load();
  }

  if (loading) return <Shell persona={persona} title="Connections"><div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" /></div></Shell>;

  const received = connections.filter((c) => c.receiver_id === myUserId);
  const sent = connections.filter((c) => c.sender_id === myUserId);

  return (
    <Shell persona={persona} title="Connections" subtitle="Sent and received">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center"><Inbox size={18} /></div>
        <h1 className="text-[26px] font-semibold text-ink-900 tracking-tight">Connections</h1>
      </div>

      <div className="mb-6">
        <p className="text-[13px] font-medium text-ink-500 mb-3">Received — {received.filter((c) => c.status === 'PENDING').length} pending</p>
        <div className="bg-surface rounded-xl border border-surface-border shadow-card">
          {received.length === 0 ? (
            <EmptyState icon={InboxIcon} message="No connection requests received yet." />
          ) : received.map((c) => (
            <div key={c.id} className="flex items-center justify-between p-5 border-b border-surface-border last:border-0">
              <AvatarRow initial={c.startup_name[0]} name={c.startup_name} subtitle={c.message || `Regarding ${c.type === 'FOUNDER_INVESTOR' ? 'investment' : 'a role'}`} />
              {c.status === 'PENDING' ? (
                <div className="flex gap-2">
                  <button onClick={() => handleRespond(c, 'reject')} className="text-xs px-3 py-1.5 rounded-lg border border-surface-border text-ink-500 hover:bg-surface-muted transition-colors">Decline</button>
                  <button onClick={() => handleRespond(c, 'accept')} className="text-xs bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors">Accept</button>
                </div>
              ) : (
                <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${STATUS_STYLE[c.status]}`}>{c.status}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[13px] font-medium text-ink-500 mb-3">Sent by you</p>
        <div className="bg-surface rounded-xl border border-surface-border shadow-card">
          {sent.length === 0 ? (
            <EmptyState icon={Send} message="You haven't sent any connection requests yet." />
          ) : sent.map((c) => (
            <div key={c.id} className="flex items-center justify-between p-5 border-b border-surface-border last:border-0">
              <AvatarRow initial={c.startup_name[0]} name={c.startup_name} subtitle={c.message} />
              <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${STATUS_STYLE[c.status]}`}>{c.status}</span>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}
