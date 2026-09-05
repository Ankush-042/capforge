import React, { useState } from 'react';
import Shell from '../components/Shell.jsx';

const notifications = [
  { id: 1, title: 'New connection request', message: 'FoodSense2 wants to connect with you.', time: '2h ago', read: false, group: 'Today' },
  { id: 2, title: 'Connection accepted', message: 'Priya Data accepted your connection.', time: '5h ago', read: false, group: 'Today' },
  { id: 3, title: 'AI analysis completed', message: 'Gap diagnosis finished for FoodSense2.', time: 'Yesterday', read: true, group: 'Earlier' },
];

export default function Notifications() {
  const [items, setItems] = useState(notifications);
  const markAllRead = () => setItems(items.map((n) => ({ ...n, read: true })));
  const groups = [...new Set(items.map((n) => n.group))];

  return (
    <Shell title="Notifications">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-[26px] font-semibold text-ink-900 tracking-tight">Notifications</h1>
        <button onClick={markAllRead} className="text-xs text-violet-600 font-medium hover:text-violet-700 transition-colors">Mark all read</button>
      </div>
      {groups.map((g) => (
        <div key={g} className="mb-6">
          <p className="text-[13px] font-medium text-ink-500 mb-2">{g}</p>
          <div className="bg-surface rounded-xl border border-surface-border shadow-card">
            {items.filter((n) => n.group === g).map((n) => (
              <div key={n.id} className={`flex items-start gap-3 p-5 border-b border-surface-border last:border-0 ${!n.read ? 'bg-violet-50/40' : ''}`}>
                {!n.read && <span className="w-2 h-2 rounded-full bg-violet-500 mt-1.5 shrink-0" />}
                {n.read && <span className="w-2 h-2 shrink-0" />}
                <div className="flex-1">
                  <p className="text-[15px] font-medium text-ink-900">{n.title}</p>
                  <p className="text-[13px] text-ink-500 mt-0.5">{n.message}</p>
                </div>
                <span className="text-xs text-ink-300 shrink-0">{n.time}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </Shell>
  );
}
