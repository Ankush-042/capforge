import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ExternalLink, MessageSquare, Briefcase, MapPin, Clock, Target } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import { useMyPersona } from '../hooks/useMyPersona.js';
import { getUserProfile, startConversation } from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';

/**
 * A person, before you decide to talk to them.
 *
 * Everything lived in one long card: avatar, bio, a tinted strip for what
 * they want, skills, then a footer grid of facts. The most decision-relevant
 * thing on the page, what this person actually says they are looking for,
 * sat in the middle at the same weight as their years of experience.
 *
 * You are about to ask someone to build a company with you. What they want
 * out of it matters more than their skill list, which is why the matching
 * engine weighs it and why it leads here.
 */

const AVATAR_TONES = [
  { bg: '#EED8FF', fg: '#6D28D9' },
  { bg: '#D1EAFE', fg: '#1677E8' },
  { bg: '#EAF7F0', fg: '#1F5D52' },
  { bg: '#FFE8DA', fg: '#E84C32' },
];

function toneFor(name) {
  const i = (name || '?').charCodeAt(0) % AVATAR_TONES.length;
  return AVATAR_TONES[i];
}

export default function ProfileView() {
  const { userId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { persona, displayName } = useMyPersona();
  const showToast = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [roleProfile, setRoleProfile] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getUserProfile(userId).then(({ ok, data }) => {
      if (ok && data.success) { setProfile(data.profile); setRoleProfile(data.roleProfile); }
      else setError(data.error || 'PROFILE_NOT_FOUND');
      setLoading(false);
    });
  }, [userId]);

  async function handleMessage() {
    const startupId = searchParams.get('startupId') || undefined;
    const gapId = searchParams.get('gapId') || undefined;
    const { ok, data } = await startConversation(userId, { startupId, gapId });
    if (ok && data.success) navigate(`/app/inbox/${data.conversation.id}`);
    else showToast(data.error || 'Could not start a conversation.', 'error');
  }

  if (loading) {
    return (
      <Shell persona={persona} displayName={displayName} title="Profile">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" />
        </div>
      </Shell>
    );
  }

  if (error || !profile) {
    return (
      <Shell persona={persona} displayName={displayName} title="Profile">
        <div className="bg-surface rounded-xl border border-surface-border shadow-card py-16 text-center">
          <p className="text-[15px] text-ink-700 mb-1">This profile is not available.</p>
          <p className="text-[13px] text-ink-500">They may have made it private, or the account no longer exists.</p>
        </div>
      </Shell>
    );
  }

  const tone = toneFor(profile.display_name);
  const mission = roleProfile?.looking_for;
  const thesis = roleProfile?.investment_thesis || roleProfile?.thesis;
  // Contributors store preferred_stage, investors preferred_stages.
  // Confirmed in profileService: handling only one drops it for half of all profiles.
  const stages = roleProfile?.preferred_stage || roleProfile?.preferred_stages || [];

  return (
    <Shell persona={persona} displayName={displayName} title={profile.display_name} subtitle={profile.headline}>
      {/* WHO THEY ARE, and the action attached to it. */}
      <div className="bg-surface rounded-xl border border-surface-border shadow-card p-8 mb-4">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-5 min-w-0">
            <div
              className="w-[68px] h-[68px] rounded-full flex items-center justify-center text-[26px] font-semibold shrink-0"
              style={{ backgroundColor: tone.bg, color: tone.fg }}
            >
              {(profile.display_name || '?').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-[26px] font-semibold text-ink-950 leading-tight">{profile.display_name}</h1>
              {profile.headline && <p className="text-[15px] text-ink-700 mt-1">{profile.headline}</p>}
              <div className="flex items-center gap-4 mt-2.5 flex-wrap">
                {profile.location && (
                  <span className="flex items-center gap-1.5 text-[13px] text-ink-500"><MapPin size={13} />{profile.location}</span>
                )}
                {roleProfile?.experience_years !== undefined && roleProfile?.experience_years !== null && (
                  <span className="flex items-center gap-1.5 text-[13px] text-ink-500">
                    <Briefcase size={13} />{roleProfile.experience_years} years in
                  </span>
                )}
                {roleProfile?.availability && (
                  <span className="flex items-center gap-1.5 text-[13px] text-ink-500">
                    <Clock size={13} />{roleProfile.availability}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={handleMessage}
            className="shrink-0 flex items-center gap-2 bg-ink-900 hover:bg-ink-700 text-white px-5 py-2.5 rounded-full text-[14px] font-medium transition-colors"
          >
            <MessageSquare size={15} /> Message
          </button>
        </div>
      </div>

      {/* WHAT THEY WANT. This is the thing that decides whether a
          conversation is worth starting, and it was a tinted strip in the
          middle of a long card at the same weight as everything else. */}
      {(mission || thesis) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="relative overflow-hidden rounded-xl bg-ink-950 p-8 mb-4"
        >
          <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle at 15% 25%, #7C5CFC 0%, transparent 55%), radial-gradient(circle at 85% 75%, #1F5D52 0%, transparent 55%)' }} />
          <div className="relative">
            <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-mint-500 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-mint-500" />
              {thesis ? 'What they back' : 'What they are looking for'}
            </p>
            <p className="font-display text-[19px] font-normal italic text-white/85 leading-relaxed max-w-2xl">
              “{mission || thesis}”
            </p>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 space-y-4">
          {profile.bio && (
            <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
              <p className="text-[11px] font-semibold tracking-wide uppercase text-ink-300 mb-2.5">About</p>
              <p className="text-[15.5px] text-ink-900 leading-relaxed">{profile.bio}</p>
            </div>
          )}

          {(profile.skills || []).length > 0 && (
            <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
              <p className="text-[11px] font-semibold tracking-wide uppercase text-ink-300 mb-3">What they can do</p>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((s) => (
                  <span key={s} className="text-[13px] px-3 py-1.5 rounded-lg bg-violet-50 text-violet-700 capitalize">{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="col-span-2 space-y-4">
          {(roleProfile?.preferred_domains || []).length > 0 && (
            <div className="bg-surface rounded-xl border border-surface-border shadow-card p-6">
              <div className="flex items-center gap-2 mb-3">
                <Target size={15} className="text-violet-600" />
                <p className="text-[14px] font-semibold text-ink-950">Fields they care about</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(roleProfile.preferred_domains || []).map((d) => (
                  <span key={d} className="text-[12.5px] px-2.5 py-1 rounded-md bg-surface-muted text-ink-700 capitalize">{d}</span>
                ))}
              </div>
              {stages.length > 0 && (
                <p className="text-[12.5px] text-ink-500 mt-3">
                  Prefers ventures at {stages.join(', ').toLowerCase()} stage
                </p>
              )}
            </div>
          )}

          {roleProfile?.portfolio_url && (
            <a
              href={roleProfile.portfolio_url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between gap-3 bg-surface rounded-xl border border-surface-border shadow-card p-6 hover:border-violet-500/50 hover:shadow-elevated transition-all duration-200"
            >
              <div>
                <p className="text-[14px] font-semibold text-ink-950">See their work</p>
                <p className="text-[12.5px] text-ink-500 mt-0.5 truncate max-w-[200px]">{roleProfile.portfolio_url.replace(/^https?:\/\//, '')}</p>
              </div>
              <ExternalLink size={15} className="text-ink-300 group-hover:text-violet-600 transition-colors shrink-0" />
            </a>
          )}
        </div>
      </div>
    </Shell>
  );
}
