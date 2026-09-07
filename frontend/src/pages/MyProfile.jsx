import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { useMyPersona } from '../hooks/useMyPersona.js';
import { getMyProfile, updateBaseProfile, upsertContributorProfile, upsertInvestorProfile } from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';

/**
 * Real fix for a confirmed, important gap: there was no way to view
 * or edit your own profile at all — only ProfileView.jsx (viewing
 * SOMEONE ELSE). Direct point, correctly made: the profile IS the
 * main ingredient matching runs on, so it needs to be genuinely
 * editable, not locked in at onboarding and forgotten.
 */
export default function MyProfile() {
  const persona = useMyPersona();
  const showToast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [base, setBase] = useState({ displayName: '', headline: '', bio: '', location: '', skillsInput: '' });
  const [contrib, setContrib] = useState({ availability: '', lookingFor: '', portfolioUrl: '', preferredDomains: '', preferredStage: '', experienceYears: '' });
  const [investor, setInvestor] = useState({ thesis: '', ticketMin: '', ticketMax: '', preferredDomains: '', preferredStages: '', investmentType: '' });

  useEffect(() => {
    getMyProfile().then(({ ok, data }) => {
      if (ok && data.success) {
        const p = data.profile;
        setBase({ displayName: p.display_name || '', headline: p.headline || '', bio: p.bio || '', location: p.location || '', skillsInput: (p.skills || []).join(', ') });
        if (data.roleProfile && persona === 'CONTRIBUTOR') {
          const rp = data.roleProfile;
          setContrib({ availability: rp.availability || '', lookingFor: rp.looking_for || '', portfolioUrl: rp.portfolio_url || '', preferredDomains: (rp.preferred_domains || []).join(', '), preferredStage: (rp.preferred_stage || []).join(', '), experienceYears: rp.experience_years || '' });
        }
        if (data.roleProfile && persona === 'INVESTOR') {
          const rp = data.roleProfile;
          setInvestor({ thesis: rp.thesis || '', ticketMin: rp.ticket_min || '', ticketMax: rp.ticket_max || '', preferredDomains: (rp.preferred_domains || []).join(', '), preferredStages: (rp.preferred_stages || []).join(', '), investmentType: rp.investment_type || '' });
        }
      }
      setLoading(false);
    });
  }, [persona]);

  async function handleSaveBase() {
    setSaving(true);
    const skills = base.skillsInput.split(',').map(s => s.trim()).filter(Boolean);
    const { ok, data } = await updateBaseProfile({ displayName: base.displayName, headline: base.headline, bio: base.bio, location: base.location, skills });
    setSaving(false);
    if (ok && data.success) showToast('Profile updated.');
    else showToast(data.error || 'Could not save.', 'error');
  }

  async function handleSaveContrib() {
    setSaving(true);
    const { ok, data } = await upsertContributorProfile({
      availability: contrib.availability, lookingFor: contrib.lookingFor, portfolioUrl: contrib.portfolioUrl,
      preferredDomains: contrib.preferredDomains.split(',').map(s => s.trim()).filter(Boolean),
      preferredStage: contrib.preferredStage.split(',').map(s => s.trim()).filter(Boolean),
      experienceYears: parseInt(contrib.experienceYears) || 0
    });
    setSaving(false);
    if (ok && data.success) showToast('Contributor details updated — real recommendations will refresh.');
    else showToast(data.error || 'Could not save.', 'error');
  }

  async function handleSaveInvestor() {
    setSaving(true);
    const { ok, data } = await upsertInvestorProfile({
      thesis: investor.thesis, ticketMin: parseFloat(investor.ticketMin) || null, ticketMax: parseFloat(investor.ticketMax) || null,
      preferredDomains: investor.preferredDomains.split(',').map(s => s.trim()).filter(Boolean),
      preferredStages: investor.preferredStages.split(',').map(s => s.trim()).filter(Boolean),
      investmentType: investor.investmentType
    });
    setSaving(false);
    if (ok && data.success) showToast('Investor thesis updated.');
    else showToast(data.error || 'Could not save.', 'error');
  }

  if (loading) return <Shell persona={persona} title="My Profile"><div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" /></div></Shell>;

  const inputClass = "w-full px-3.5 py-2.5 rounded-lg border border-surface-border bg-surface-muted text-[15px] focus:outline-none focus:ring-2 focus:ring-violet-500/20";

  return (
    <Shell persona={persona} title="My Profile">
      <PageHeader icon={User} iconBg="bg-violet-50" iconColor="text-violet-600" title="My Profile" subtitle="This is the main ingredient matching runs on — keep it real and current." />

      <div className="bg-white rounded-xl border border-surface-border shadow-card p-7 mb-6">
        <p className="text-[15px] font-semibold text-ink-900 mb-4">Basics</p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div><label className="text-[13px] font-medium text-ink-500 mb-1.5 block">Display name</label>
            <input value={base.displayName} onChange={(e) => setBase({ ...base, displayName: e.target.value })} className={inputClass} /></div>
          <div><label className="text-[13px] font-medium text-ink-500 mb-1.5 block">Headline</label>
            <input value={base.headline} onChange={(e) => setBase({ ...base, headline: e.target.value })} className={inputClass} /></div>
        </div>
        <div className="mb-4"><label className="text-[13px] font-medium text-ink-500 mb-1.5 block">Bio</label>
          <textarea value={base.bio} onChange={(e) => setBase({ ...base, bio: e.target.value })} rows={3} className={inputClass + ' resize-none'} /></div>
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div><label className="text-[13px] font-medium text-ink-500 mb-1.5 block">Location</label>
            <input value={base.location} onChange={(e) => setBase({ ...base, location: e.target.value })} className={inputClass} /></div>
          <div><label className="text-[13px] font-medium text-ink-500 mb-1.5 block">Skills (comma-separated)</label>
            <input value={base.skillsInput} onChange={(e) => setBase({ ...base, skillsInput: e.target.value })} className={inputClass} /></div>
        </div>
        <button onClick={handleSaveBase} disabled={saving} className="bg-ink-900 hover:bg-ink-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
          {saving ? 'Saving…' : 'Save basics'}
        </button>
      </div>

      {persona === 'CONTRIBUTOR' && (
        <div className="bg-white rounded-xl border border-surface-border shadow-card p-7 mb-6">
          <p className="text-[15px] font-semibold text-ink-900 mb-4">Contributor details</p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div><label className="text-[13px] font-medium text-ink-500 mb-1.5 block">Availability</label>
              <select value={contrib.availability} onChange={(e) => setContrib({ ...contrib, availability: e.target.value })} className={inputClass}>
                <option value="">Select…</option><option value="full-time">Full-time</option><option value="part-time">Part-time</option><option value="advisor">Advisor</option></select></div>
            <div><label className="text-[13px] font-medium text-ink-500 mb-1.5 block">Experience (years)</label>
              <input type="number" value={contrib.experienceYears} onChange={(e) => setContrib({ ...contrib, experienceYears: e.target.value })} className={inputClass} /></div>
          </div>
          <div className="mb-4"><label className="text-[13px] font-medium text-ink-500 mb-1.5 block">What kind of mission are you looking for?</label>
            <textarea value={contrib.lookingFor} onChange={(e) => setContrib({ ...contrib, lookingFor: e.target.value })} rows={2} className={inputClass + ' resize-none'} /></div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div><label className="text-[13px] font-medium text-ink-500 mb-1.5 block">Preferred domains (comma-separated)</label>
              <input value={contrib.preferredDomains} onChange={(e) => setContrib({ ...contrib, preferredDomains: e.target.value })} className={inputClass} /></div>
            <div><label className="text-[13px] font-medium text-ink-500 mb-1.5 block">Preferred stages (comma-separated)</label>
              <input value={contrib.preferredStage} onChange={(e) => setContrib({ ...contrib, preferredStage: e.target.value })} className={inputClass} /></div>
          </div>
          <div className="mb-5"><label className="text-[13px] font-medium text-ink-500 mb-1.5 block">Portfolio URL</label>
            <input value={contrib.portfolioUrl} onChange={(e) => setContrib({ ...contrib, portfolioUrl: e.target.value })} className={inputClass} /></div>
          <button onClick={handleSaveContrib} disabled={saving} className="bg-ink-900 hover:bg-ink-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : 'Save contributor details'}
          </button>
        </div>
      )}

      {persona === 'INVESTOR' && (
        <div className="bg-white rounded-xl border border-surface-border shadow-card p-7 mb-6">
          <p className="text-[15px] font-semibold text-ink-900 mb-4">Investment thesis</p>
          <div className="mb-4"><label className="text-[13px] font-medium text-ink-500 mb-1.5 block">Thesis</label>
            <textarea value={investor.thesis} onChange={(e) => setInvestor({ ...investor, thesis: e.target.value })} rows={3} className={inputClass + ' resize-none'} /></div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div><label className="text-[13px] font-medium text-ink-500 mb-1.5 block">Ticket size min ($)</label>
              <input type="number" value={investor.ticketMin} onChange={(e) => setInvestor({ ...investor, ticketMin: e.target.value })} className={inputClass} /></div>
            <div><label className="text-[13px] font-medium text-ink-500 mb-1.5 block">Ticket size max ($)</label>
              <input type="number" value={investor.ticketMax} onChange={(e) => setInvestor({ ...investor, ticketMax: e.target.value })} className={inputClass} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div><label className="text-[13px] font-medium text-ink-500 mb-1.5 block">Preferred domains (comma-separated)</label>
              <input value={investor.preferredDomains} onChange={(e) => setInvestor({ ...investor, preferredDomains: e.target.value })} className={inputClass} /></div>
            <div><label className="text-[13px] font-medium text-ink-500 mb-1.5 block">Preferred stages (comma-separated)</label>
              <input value={investor.preferredStages} onChange={(e) => setInvestor({ ...investor, preferredStages: e.target.value })} className={inputClass} /></div>
          </div>
          <button onClick={handleSaveInvestor} disabled={saving} className="bg-ink-900 hover:bg-ink-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : 'Save thesis'}
          </button>
        </div>
      )}
    </Shell>
  );
}
