import React, { useState, useEffect } from 'react';
import Shell from '../components/Shell.jsx';
import { getMyProfile, updateBaseProfile } from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';

const CATEGORIES = ['Account', 'Profile', 'Privacy'];
const VISIBILITY_OPTIONS = [
  { value: 'DISCOVERABLE', label: 'Discoverable — anyone can find you in search' },
  { value: 'CONNECTIONS_ONLY', label: 'Connections only — only your connections see full details' },
  { value: 'PRIVATE', label: 'Private — hidden from search entirely' },
];

export default function Settings() {
  const showToast = useToast();
  const [tab, setTab] = useState('Account');
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getMyProfile().then(({ ok, data }) => { if (ok && data.success) setProfile(data.profile); });
  }, []);

  async function handleVisibilityChange(value) {
    setSaving(true);
    const { ok, data } = await updateBaseProfile({ visibility: value });
    setSaving(false);
    if (ok && data.success) { setProfile(data.profile); showToast('Visibility updated.'); }
    else showToast('Could not update visibility.', 'error');
  }

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
          {tab === 'Privacy' ? (
            <>
              <p className="text-[15px] font-semibold text-ink-900 mb-1">Visibility</p>
              <p className="text-[13px] text-ink-500 mb-4">Control who can find and view your profile. This is real — it changes what search actually returns.</p>
              {!profile ? <p className="text-[13px] text-ink-500">Loading…</p> : VISIBILITY_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-3 py-2.5 cursor-pointer">
                  <input type="radio" name="visibility" checked={profile.visibility === opt.value} onChange={() => handleVisibilityChange(opt.value)} disabled={saving} />
                  <span className="text-[15px] text-ink-700">{opt.label}</span>
                </label>
              ))}
            </>
          ) : tab === 'Profile' ? (
            <>
              <p className="text-[15px] font-semibold text-ink-900 mb-4">Profile</p>
              <p className="text-[13px] text-ink-500">Display name, headline, and skills are edited from your onboarding flow. Profile completeness: {profile?.completion_score || 0}%.</p>
            </>
          ) : (
            <>
              <p className="text-[15px] font-semibold text-ink-900 mb-4">Account</p>
              <p className="text-[13px] text-ink-500">Email and password changes aren't available yet.</p>
            </>
          )}
        </div>
      </div>
    </Shell>
  );
}
