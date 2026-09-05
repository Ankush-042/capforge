import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateBaseProfile, upsertContributorProfile } from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';

const STAGES = ['Idea', 'Prototype', 'MVP', 'Early Traction'];
const DOMAINS = ['AI', 'FinTech', 'HealthTech', 'Climate', 'EdTech', 'SaaS', 'Food service', 'DeepTech'];

export default function ContributorOnboarding() {
  const navigate = useNavigate();
  const showToast = useToast();
  const [saving, setSaving] = useState(false);

  const [headline, setHeadline] = useState('');
  const [skillsInput, setSkillsInput] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [availability, setAvailability] = useState('part-time');
  const [preferredStage, setPreferredStage] = useState([]);
  const [preferredDomains, setPreferredDomains] = useState([]);
  const [equityPreference, setEquityPreference] = useState('');

  function toggle(list, setList, value) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  async function handleSubmit() {
    setSaving(true);
    const skills = skillsInput.split(',').map((s) => s.trim()).filter(Boolean);

    const profileRes = await updateBaseProfile({ headline, skills });
    const contribRes = await upsertContributorProfile({
      availability, preferredStage, preferredDomains,
      experienceYears: experienceYears ? parseInt(experienceYears) : undefined,
      portfolioUrl: portfolioUrl || undefined,
      equityPreference: equityPreference || undefined,
    });
    setSaving(false);

    if (profileRes.ok && contribRes.ok) { showToast('Profile complete.'); navigate('/app/contributor'); }
    else showToast('Something went wrong saving your profile — try again.', 'error');
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-ink-900">Tell CapForge about yourself</h1>
          <p className="text-sm text-ink-500 mt-1">Real, detailed profiles get real, strong matches.</p>
        </div>
        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7 space-y-4">
          <div>
            <label className="text-[13px] font-medium text-ink-500 mb-1.5 block">Headline / role</label>
            <input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g. Full Stack Engineer"
              className="w-full px-3.5 py-2.5 rounded-lg border border-surface-border bg-surface-muted text-[15px] focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
          </div>
          <div>
            <label className="text-[13px] font-medium text-ink-500 mb-1.5 block">Skills (comma-separated)</label>
            <input value={skillsInput} onChange={(e) => setSkillsInput(e.target.value)} placeholder="React, Node.js, PostgreSQL"
              className="w-full px-3.5 py-2.5 rounded-lg border border-surface-border bg-surface-muted text-[15px] focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[13px] font-medium text-ink-500 mb-1.5 block">Years of experience</label>
              <input type="number" min="0" value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-surface-border bg-surface-muted text-[15px] focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
            </div>
            <div>
              <label className="text-[13px] font-medium text-ink-500 mb-1.5 block">Availability</label>
              <select value={availability} onChange={(e) => setAvailability(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-surface-border bg-surface-muted text-[15px] focus:outline-none focus:ring-2 focus:ring-violet-500/20">
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="advisor">Advisor</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-[13px] font-medium text-ink-500 mb-1.5 block">Portfolio / GitHub URL</label>
            <input value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} placeholder="https://github.com/you"
              className="w-full px-3.5 py-2.5 rounded-lg border border-surface-border bg-surface-muted text-[15px] focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
          </div>
          <div>
            <label className="text-[13px] font-medium text-ink-500 mb-2 block">Preferred stage</label>
            <div className="flex flex-wrap gap-2">
              {STAGES.map((s) => (
                <button key={s} type="button" onClick={() => toggle(preferredStage, setPreferredStage, s.toLowerCase())}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${preferredStage.includes(s.toLowerCase()) ? 'bg-violet-600 text-white' : 'bg-surface-muted text-ink-500'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[13px] font-medium text-ink-500 mb-2 block">Preferred domains</label>
            <div className="flex flex-wrap gap-2">
              {DOMAINS.map((d) => (
                <button key={d} type="button" onClick={() => toggle(preferredDomains, setPreferredDomains, d.toLowerCase())}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${preferredDomains.includes(d.toLowerCase()) ? 'bg-violet-600 text-white' : 'bg-surface-muted text-ink-500'}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[13px] font-medium text-ink-500 mb-1.5 block">Equity preference (optional)</label>
            <input value={equityPreference} onChange={(e) => setEquityPreference(e.target.value)} placeholder="e.g. 3-5% for full-time technical co-founder role"
              className="w-full px-3.5 py-2.5 rounded-lg border border-surface-border bg-surface-muted text-[15px] focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
          </div>
          <button onClick={handleSubmit} disabled={saving}
            className="w-full bg-ink-900 hover:bg-ink-700 text-white py-2.5 rounded-lg text-[15px] font-medium transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : 'Complete profile'}
          </button>
          <button onClick={() => navigate('/app/contributor')} className="w-full text-[13px] text-ink-500 text-center">Skip for now</button>
        </div>
      </div>
    </div>
  );
}
