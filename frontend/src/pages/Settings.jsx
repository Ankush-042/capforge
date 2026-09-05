import React, { useState } from 'react';
import Shell from '../components/Shell.jsx';

const CATEGORIES = ['Account', 'Profile', 'Notifications', 'Privacy', 'Security'];

export default function Settings() {
  const [tab, setTab] = useState('Account');
  const [notifPrefs, setNotifPrefs] = useState({ connections: true, recommendations: true, team: true, aiAnalysis: false });

  return (
    <Shell title="Settings">
      <div className="mb-6"><h1 className="text-[26px] font-semibold text-ink-900 tracking-tight">Settings</h1></div>
      <div className="grid grid-cols-[200px_1fr] gap-6">
        <div className="space-y-1">
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setTab(c)}
              className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${tab === c ? 'bg-surface-muted text-ink-900 font-medium' : 'text-ink-500 hover:bg-surface-muted'}`}>
              {c}
            </button>
          ))}
        </div>
        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
          {tab === 'Notifications' ? (
            <>
              <p className="text-[15px] font-semibold text-ink-900 mb-4">Notification preferences</p>
              {Object.entries(notifPrefs).map(([key, val]) => (
                <label key={key} className="flex items-center justify-between py-3 border-b border-surface-border last:border-0 cursor-pointer">
                  <span className="text-[15px] text-ink-900 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                  <input type="checkbox" checked={val} onChange={() => setNotifPrefs({ ...notifPrefs, [key]: !val })} className="rounded border-surface-border" />
                </label>
              ))}
            </>
          ) : tab === 'Privacy' ? (
            <>
              <p className="text-[15px] font-semibold text-ink-900 mb-4">Visibility</p>
              <p className="text-[13px] text-ink-500 mb-4">Control who can find and view your profile.</p>
              {['Discoverable — anyone can find you in search', 'Connection-only — only your connections see full details', 'Private — hidden from search entirely'].map((opt) => (
                <label key={opt} className="flex items-center gap-3 py-2.5 cursor-pointer">
                  <input type="radio" name="visibility" defaultChecked={opt.startsWith('Discoverable')} />
                  <span className="text-[15px] text-ink-700">{opt}</span>
                </label>
              ))}
            </>
          ) : (
            <p className="text-[15px] text-ink-500">Nothing to configure here yet.</p>
          )}
        </div>
      </div>
    </Shell>
  );
}
