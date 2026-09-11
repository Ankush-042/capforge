import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { AlertTriangle, ArrowUpRight } from 'lucide-react';
import { updateBaseProfile, upsertContributorProfile } from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';

/**
 * The first thing a contributor does.
 *
 * It was nine fields in one card under the heading "Tell CapForge about
 * yourself". Everything had identical weight, so the field that matters most
 * to matching, what someone actually wants to work on, sat between a
 * portfolio URL and a years-of-experience box.
 *
 * The order now reflects what the engine weighs. What you want comes first
 * and gets the room to answer properly. The mechanical facts follow.
 */

const STAGES = ['Idea', 'Prototype', 'MVP', 'Early Traction'];
const DOMAINS = ['HealthTech', 'FinTech', 'EdTech', 'Climate', 'SaaS', 'Cybersecurity', 'Logistics', 'PropTech', 'HR Tech', 'Legal Tech', 'Biotech', 'Creator Economy'];

const FIELD = 'w-full px-4 py-3 rounded-lg border border-surface-border bg-surface-muted text-[15px] text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-violet-500 focus:bg-surface transition-colors';

function Pills({ options, selected, onToggle }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const v = o.toLowerCase();
        const on = selected.includes(v);
        return (
          <button
            key={o}
            type="button"
            onClick={() => onToggle(v)}
            className={`text-[13px] px-3.5 py-2 rounded-full font-medium transition-colors ${
              on ? 'bg-violet-600 text-white' : 'bg-surface-muted text-ink-700 hover:bg-surface-border'
            }`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

export default function ContributorOnboarding() {
  const navigate = useNavigate();
  const showToast = useToast();
  const [saving, setSaving] = useState(false);

  const [headline, setHeadline] = useState('');
  const [lookingFor, setLookingFor] = useState('');
  const [skillsInput, setSkillsInput] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [availability, setAvailability] = useState('part-time');
  const [preferredStage, setPreferredStage] = useState([]);
  const [preferredDomains, setPreferredDomains] = useState([]);

  function toggle(list, setList, value) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  const skills = skillsInput.split(',').map((s) => s.trim()).filter(Boolean);
  const missingSignal = preferredDomains.length === 0 || preferredStage.length === 0;
  const canSubmit = headline.trim() && skills.length > 0;

  async function handleSubmit() {
    if (!canSubmit) { showToast('Add your role and at least one skill first.', 'error'); return; }
    setSaving(true);
    const profileRes = await updateBaseProfile({ headline, skills });
    const contribRes = await upsertContributorProfile({
      availability, preferredStage, preferredDomains,
      lookingFor: lookingFor || undefined,
      experienceYears: experienceYears ? parseInt(experienceYears) : undefined,
      portfolioUrl: portfolioUrl || undefined,
    });
    setSaving(false);
    if (profileRes.ok && contribRes.ok) { showToast('You are set up. Finding ventures that need you.'); navigate('/app/contributor'); }
    else showToast('Something went wrong saving that. Try again.', 'error');
  }

  return (
    <div className="min-h-screen bg-canvas px-6 py-12">
      <div className="w-full max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-xl bg-ink-950 p-8 mb-6"
        >
          <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle at 15% 25%, #7C5CFC 0%, transparent 55%), radial-gradient(circle at 85% 75%, #1F5D52 0%, transparent 55%)' }} />
          <div className="relative">
            <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-mint-500 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-mint-500" />One thing before you start
            </p>
            <h1 className="font-display text-[28px] font-semibold text-white leading-tight mb-3">
              Founders will find you through this.
            </h1>
            <p className="text-[15px] text-white/70 leading-relaxed max-w-lg">
              Not a CV. What you write here decides which ventures reach you, and the part about what you actually want carries as much weight as your skills.
            </p>
          </div>
        </motion.div>

        {/* WHAT YOU WANT comes first, because it is what the engine weighs
            most and it was previously buried between a URL field and a
            number input. */}
        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7 mb-4">
          <p className="text-[16px] font-semibold text-ink-950 mb-1">What do you actually want to work on?</p>
          <p className="text-[13.5px] text-ink-500 mb-4">
            Not your skills. What pulls you in, and what you are done with. Being honest about the second part matters as much as the first.
          </p>
          <textarea
            value={lookingFor}
            onChange={(e) => setLookingFor(e.target.value)}
            rows={5}
            placeholder="I want to work on something where…"
            className={`${FIELD} resize-none leading-relaxed`}
          />

          <div className="mt-6">
            <p className="text-[13.5px] font-medium text-ink-700 mb-2.5">Fields you care about</p>
            <Pills options={DOMAINS} selected={preferredDomains} onToggle={(v) => toggle(preferredDomains, setPreferredDomains, v)} />
          </div>

          <div className="mt-5">
            <p className="text-[13.5px] font-medium text-ink-700 mb-2.5">How early you want to join</p>
            <Pills options={STAGES} selected={preferredStage} onToggle={(v) => toggle(preferredStage, setPreferredStage, v)} />
          </div>
        </div>

        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7 mb-4">
          <p className="text-[16px] font-semibold text-ink-950 mb-4">And what you bring</p>

          <div className="mb-4">
            <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">What you do</label>
            <input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Backend Engineer" className={FIELD} />
          </div>

          <div className="mb-4">
            <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">What you can do</label>
            <input value={skillsInput} onChange={(e) => setSkillsInput(e.target.value)} placeholder="python, postgresql, aws" className={FIELD} />
            {/* Shows exactly what gets saved. A real profile once stored
                'user interviewsability testings' and nothing on screen
                revealed it. */}
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {skills.map((s, i) => (
                  <span key={`${s}-${i}`} className="text-[11.5px] px-2 py-1 rounded-md bg-violet-50 text-violet-700">{s}</span>
                ))}
              </div>
            ) : (
              <p className="text-[12.5px] text-ink-300 mt-2">Separate each one with a comma</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">How much time</label>
              <select value={availability} onChange={(e) => setAvailability(e.target.value)} className={FIELD}>
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="advisor">Advising</option>
              </select>
            </div>
            <div>
              <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">Years doing this</label>
              <input type="number" min="0" value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)} className={FIELD} />
            </div>
            <div>
              <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">Your work</label>
              <input value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} placeholder="https://" className={FIELD} />
            </div>
          </div>
        </div>

        {missingSignal && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-5 mb-4">
            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-[14px] font-semibold text-amber-800">
                {preferredDomains.length === 0 && preferredStage.length === 0
                  ? 'You have not picked any fields or stages'
                  : preferredDomains.length === 0 ? 'You have not picked any fields'
                  : 'You have not picked any stages'}
              </p>
              <p className="text-[13px] text-amber-700 mt-0.5 leading-relaxed">
                These decide which ventures reach you. Without them matching runs on skills alone, which is how someone ends up shown a role at a company they would never join.
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4">
          <button
            onClick={handleSubmit}
            disabled={saving || !canSubmit}
            className="flex items-center gap-2 bg-ink-900 hover:bg-ink-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-3 rounded-full text-[15px] font-medium transition-colors"
          >
            {saving ? 'Setting you up…' : 'Start finding ventures'}
            {!saving && <ArrowUpRight size={15} />}
          </button>
          <button
            onClick={() => navigate('/app/contributor')}
            className="text-[13.5px] text-ink-500 hover:text-ink-900 transition-colors"
          >
            Do this later
          </button>
        </div>
        <p className="text-[12.5px] text-ink-500 mt-3">
          You can change any of this any time. Nothing here is locked in.
        </p>
      </div>
    </div>
  );
}
