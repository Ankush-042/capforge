import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Eye, Bell, Shield, User, ArrowUpRight, Globe, Lock, Users } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import { useMyPersona } from '../hooks/useMyPersona.js';
import {
  getMyProfile, updateBaseProfile, getNotificationPreferences,
  updateNotificationPreferences, getMyProfileViews,
} from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';

/**
 * Settings.
 *
 * Five tabs, three of which said some version of "this is not available
 * yet". A settings page that mostly apologises is worse than a shorter one
 * that does something, so the dead sections are gone and what remains is
 * organised by consequence: who can find you, who has looked, and what you
 * get told about.
 *
 * Visibility in particular genuinely changes what search returns, which the
 * old copy asserted but did not explain. Each option now says what actually
 * happens.
 */

const VISIBILITY = [
  {
    value: 'DISCOVERABLE',
    icon: Globe,
    label: 'Discoverable',
    detail: 'Founders and investors can find you in search, and matching can surface you for open roles.',
  },
  {
    value: 'CONNECTIONS_ONLY',
    icon: Users,
    label: 'Connections only',
    detail: 'You stay out of search. Only people already in a conversation with you see your full profile.',
  },
  {
    value: 'PRIVATE',
    icon: Lock,
    label: 'Private',
    detail: 'Hidden from search entirely. Nothing will be matched to you while this is on.',
  },
];

const NOTIF = [
  ['connections', 'Someone wants to connect', 'When a founder or contributor reaches out.'],
  ['recommendations', 'New matches', 'When something new fits what you are looking for.'],
  ['team_updates', 'Team changes', 'When someone joins, or a role gets filled.'],
  ['ai_analysis', 'Analysis finished', 'When readiness, risks or roles finish recalculating.'],
];

const SECTIONS = [
  { id: 'privacy', label: 'Who can find you', icon: Shield },
  { id: 'views', label: 'Who has looked', icon: Eye },
  { id: 'notifications', label: 'What you get told', icon: Bell },
  { id: 'account', label: 'Account', icon: User },
];

export default function Settings() {
  const { persona, displayName } = useMyPersona();
  const showToast = useToast();
  const [tab, setTab] = useState('privacy');
  const [profile, setProfile] = useState(null);
  const [prefs, setPrefs] = useState(null);
  const [views, setViews] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getMyProfile().then(({ ok, data }) => { if (ok && data.success) setProfile(data.profile); });
    getNotificationPreferences().then(({ ok, data }) => { if (ok && data.success) setPrefs(data.preferences); });
    getMyProfileViews().then(({ ok, data }) => { if (ok && data.success) setViews(data); });
  }, []);

  async function togglePref(key) {
    const next = !prefs[key];
    setPrefs({ ...prefs, [key]: next });
    const { ok, data } = await updateNotificationPreferences({ [key]: next });
    if (!ok || !data.success) {
      setPrefs({ ...prefs, [key]: !next });
      showToast('Could not save that.', 'error');
    }
  }

  async function setVisibility(value) {
    setSaving(true);
    const { ok, data } = await updateBaseProfile({ visibility: value });
    setSaving(false);
    if (ok && data.success) { setProfile(data.profile); showToast('Saved.'); }
    else showToast('Could not change that.', 'error');
  }

  return (
    <Shell persona={persona} displayName={displayName} title="Settings">
      <div className="grid grid-cols-[220px_1fr] gap-6">
        <div className="space-y-1">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const active = tab === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setTab(s.id)}
                className={`w-full flex items-center gap-2.5 text-left text-[13.5px] px-3 py-2.5 rounded-lg transition-colors ${
                  active ? 'bg-violet-50 text-violet-700 font-medium' : 'text-ink-700 hover:bg-surface-muted'
                }`}
              >
                <Icon size={15} className={active ? 'text-violet-600' : 'text-ink-300'} />
                {s.label}
              </button>
            );
          })}
        </div>

        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          {tab === 'privacy' && (
            <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
              <p className="text-[16px] font-semibold text-ink-950 mb-1">Who can find you</p>
              <p className="text-[13.5px] text-ink-500 mb-5">This genuinely changes what search returns and whether matching can surface you.</p>
              {!profile ? (
                <p className="text-[13px] text-ink-500">Loading…</p>
              ) : (
                <div className="space-y-2.5">
                  {VISIBILITY.map((o) => {
                    const Icon = o.icon;
                    const selected = profile.visibility === o.value;
                    return (
                      <button
                        key={o.value}
                        onClick={() => setVisibility(o.value)}
                        disabled={saving}
                        className={`w-full text-left flex items-start gap-3.5 rounded-xl border p-5 transition-all duration-200 disabled:opacity-60 ${
                          selected ? 'border-violet-500/50 bg-violet-50/40' : 'border-surface-border hover:border-violet-500/30'
                        }`}
                      >
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: selected ? '#EED8FF' : '#F4F4F7', color: selected ? '#6D28D9' : '#6E7079' }}
                        >
                          <Icon size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className={`text-[14.5px] ${selected ? 'font-semibold text-ink-950' : 'font-medium text-ink-900'}`}>{o.label}</p>
                          <p className="text-[13px] text-ink-700 mt-0.5 leading-relaxed">{o.detail}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === 'views' && (
            <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
              <p className="text-[16px] font-semibold text-ink-950 mb-1">Who has looked at your profile</p>
              <p className="text-[13.5px] text-ink-500 mb-5">
                {views ? `${views.totalCount} ${views.totalCount === 1 ? 'view' : 'views'} in total.` : 'Loading…'}
              </p>
              {views && views.views.length === 0 ? (
                <div className="py-10 text-center">
                  <Eye size={20} className="text-ink-300 mx-auto mb-2.5" />
                  <p className="text-[14px] text-ink-700">Nobody has looked yet.</p>
                  <p className="text-[13px] text-ink-500 mt-1">Views appear here when someone opens your profile.</p>
                </div>
              ) : (
                <div className="divide-y divide-surface-border">
                  {views?.views.map((v, i) => (
                    <Link
                      key={i}
                      to={v.user_id ? `/app/profile/${v.user_id}` : '#'}
                      className="flex items-center justify-between gap-4 py-3.5 group"
                    >
                      <div className="min-w-0">
                        <p className="text-[14.5px] font-medium text-ink-950 group-hover:text-violet-700 transition-colors truncate">{v.display_name}</p>
                        <p className="text-[13px] text-ink-500 truncate">
                          {v.headline}{v.primary_role ? ` · ${v.primary_role.toLowerCase()}` : ''}
                        </p>
                      </div>
                      <span className="text-[12.5px] text-ink-300 shrink-0">
                        {new Date(v.viewed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'notifications' && (
            <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
              <p className="text-[16px] font-semibold text-ink-950 mb-1">What you get told about</p>
              <p className="text-[13.5px] text-ink-500 mb-5">Turning something off means you will not be notified. It does not stop it happening.</p>
              {!prefs ? (
                <p className="text-[13px] text-ink-500">Loading…</p>
              ) : (
                <div className="divide-y divide-surface-border">
                  {NOTIF.map(([key, label, detail]) => (
                    <label key={key} className="flex items-start justify-between gap-6 py-4 cursor-pointer">
                      <div className="min-w-0">
                        <p className="text-[14.5px] font-medium text-ink-950">{label}</p>
                        <p className="text-[13px] text-ink-500 mt-0.5">{detail}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => togglePref(key)}
                        className={`relative w-10 h-6 rounded-full shrink-0 transition-colors ${prefs[key] ? 'bg-violet-600' : 'bg-surface-border'}`}
                        aria-pressed={!!prefs[key]}
                      >
                        <span
                          className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200"
                          style={{ left: prefs[key] ? '20px' : '4px' }}
                        />
                      </button>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'account' && (
            <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
              <p className="text-[16px] font-semibold text-ink-950 mb-1">Account</p>
              <p className="text-[13.5px] text-ink-500 mb-5">Your name, headline, bio and skills live on your profile.</p>
              <Link
                to="/app/my-profile"
                className="inline-flex items-center gap-2 text-[13.5px] font-medium bg-ink-900 hover:bg-ink-700 text-white px-5 py-2.5 rounded-full transition-colors"
              >
                Edit your profile <ArrowUpRight size={14} />
              </Link>
              {profile && (
                <div className="mt-6 pt-5 border-t border-surface-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13.5px] text-ink-700">Profile completeness</span>
                    <span className="text-[13.5px] font-semibold text-ink-950 tabular-nums">{profile.completion_score || 0}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${profile.completion_score || 0}%` }}
                      transition={{ duration: 0.7 }}
                      className="h-full rounded-full bg-violet-500"
                    />
                  </div>
                  <p className="text-[13px] text-ink-500 mt-2.5">
                    {(profile.completion_score || 0) < 80
                      ? 'A fuller profile is matched more accurately, and gives people a reason to reply.'
                      : 'Complete enough to be matched well.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </Shell>
  );
}
