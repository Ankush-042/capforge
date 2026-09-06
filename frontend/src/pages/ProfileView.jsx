import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ExternalLink, MessageCircle, Briefcase, MapPin } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import { useMyPersona } from '../hooks/useMyPersona.js';
import { getUserProfile, startConversation } from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';

/**
 * Phase C — the real rich profile page. Before this, a candidate or
 * founder was only ever a name, a headline, and a score — nothing an
 * actual person could evaluate before deciding to message them.
 */
export default function ProfileView() {
  const { userId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const persona = useMyPersona();
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

  if (loading) return <Shell persona={persona} title="Profile"><div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" /></div></Shell>;
  if (error || !profile) return <Shell persona={persona} title="Profile"><div className="bg-white rounded-xl border border-surface-border shadow-card p-12 text-center"><p className="text-[15px] text-ink-500">This profile isn't available to view.</p></div></Shell>;

  return (
    <Shell persona={persona} title={profile.display_name}>
      <div className="bg-white rounded-xl border border-surface-border shadow-card p-8">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-2xl font-semibold text-white">
              {(profile.display_name || '?')[0]}
            </div>
            <div>
              <h1 className="text-[22px] font-semibold text-ink-900">{profile.display_name}</h1>
              <p className="text-[15px] text-ink-500">{profile.headline}</p>
              {profile.location && <p className="text-[13px] text-ink-300 flex items-center gap-1 mt-1"><MapPin size={12} />{profile.location}</p>}
            </div>
          </div>
          <button onClick={handleMessage} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
            <MessageCircle size={16} /> Message
          </button>
        </div>

        {profile.bio && (
          <div className="mb-6">
            <p className="text-[13px] font-medium text-ink-500 mb-1.5">About</p>
            <p className="text-[15px] text-ink-700 leading-relaxed">{profile.bio}</p>
          </div>
        )}

        {roleProfile?.looking_for && (
          <div className="mb-6 bg-violet-50 rounded-lg p-4">
            <p className="text-[13px] font-medium text-violet-700 mb-1.5">What they're looking for</p>
            <p className="text-[14px] text-ink-700 leading-relaxed">{roleProfile.looking_for}</p>
          </div>
        )}

        {(profile.skills || []).length > 0 && (
          <div className="mb-6">
            <p className="text-[13px] font-medium text-ink-500 mb-2">Skills</p>
            <div className="flex flex-wrap gap-1.5">
              {profile.skills.map((s) => <span key={s} className="text-[13px] px-2.5 py-1 rounded-md bg-violet-50 text-violet-700">{s}</span>)}
            </div>
          </div>
        )}

        {roleProfile && (
          <div className="grid grid-cols-2 gap-6 pt-6 border-t border-surface-border">
            {roleProfile.experience_years !== undefined && (
              <div className="flex items-center gap-2 text-[14px] text-ink-700"><Briefcase size={14} className="text-ink-300" />{roleProfile.experience_years} years experience</div>
            )}
            {roleProfile.availability && (
              <div className="text-[14px] text-ink-700">Availability: <span className="font-medium">{roleProfile.availability}</span></div>
            )}
            {roleProfile.portfolio_url && (
              <a href={roleProfile.portfolio_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[14px] text-violet-600 hover:text-violet-700 transition-colors">
                <ExternalLink size={14} /> View portfolio
              </a>
            )}
            {roleProfile.investment_thesis && (
              <div className="col-span-2">
                <p className="text-[13px] font-medium text-ink-500 mb-1">Investment thesis</p>
                <p className="text-[14px] text-ink-700">{roleProfile.investment_thesis}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Shell>
  );
}
