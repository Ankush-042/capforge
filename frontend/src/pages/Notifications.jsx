import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import PageHeader from '../components/PageHeader.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../services/startups.js';

function groupByDay(notifications) {
  const today = new Date().toDateString();
  const groups = { Today: [], Earlier: [] };
  for (const n of notifications) {
    const isToday = new Date(n.created_at).toDateString() === today;
    groups[isToday ? 'Today' : 'Earlier'].push(n);
  }
  return groups;
}

export default function Notifications() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  async function load() {
    const { ok, data } = await getNotifications();
    if (ok && data.success) setItems(data.notifications);
  }

  useEffect(() => { load().then(() => setLoading(false)); }, []);

  async function markAllRead() {
    await markAllNotificationsRead();
    await load();
  }

  async function handleClick(n) {
    if (!n.is_read) { await markNotificationRead(n.id); await load(); }
  }

  if (loading) return <Shell title="Notifications"><div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" /></div></Shell>;

  const groups = groupByDay(items);

  return (
    <Shell title="Notifications">
      <PageHeader icon={Bell} iconBg="bg-amber-50" iconColor="text-amber-500" title="Notifications"
        action={<button onClick={markAllRead} className="text-xs text-violet-600 font-medium hover:text-violet-700 transition-colors">Mark all read</button>} />
      {items.length === 0 ? (
        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-12 text-center">
          <EmptyState icon={Bell} message="No notifications yet." />
        </div>
      ) : Object.entries(groups).map(([g, list]) => list.length > 0 && (
        <div key={g} className="mb-6">
          <p className="text-[13px] font-medium text-ink-500 mb-2">{g}</p>
          <div className="bg-surface rounded-xl border border-surface-border shadow-card">
            {list.map((n) => (
              <button key={n.id} onClick={() => handleClick(n)} className={`w-full text-left flex items-start gap-3 p-5 border-b border-surface-border last:border-0 ${!n.is_read ? 'bg-violet-50/40' : ''}`}>
                {!n.is_read ? <span className="w-2 h-2 rounded-full bg-violet-500 mt-1.5 shrink-0" /> : <span className="w-2 h-2 shrink-0" />}
                <div className="flex-1">
                  <p className="text-[15px] font-medium text-ink-900">{n.title}</p>
                  <p className="text-[13px] text-ink-500 mt-0.5">{n.message}</p>
                </div>
                <span className="text-xs text-ink-300 shrink-0">{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </Shell>
  );
}
