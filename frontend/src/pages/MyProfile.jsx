import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Check, AlertTriangle, X } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import { useMyPersona } from '../hooks/useMyPersona.js';
import { getMyProfile, updateBaseProfile, upsertContributorProfile, upsertInvestorProfile } from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';

/**
 * Your profile, which is what matching actually runs on.
 *
 * The page worked. Its real weakness was invisible parsing: skills, domains
 * and stages were raw comma-separated text fields, and nothing ever showed
 * what had actually been parsed out of them. A real profile once saved as
 * "user interviewsability testings, u" and the page displayed it back as the
 * same unbroken string, so there was no way to notice.
 *
 * Everything list-shaped now shows its parsed chips live underneath, so a
 * mangled entry is visible immediately. Domains and stages are togglable
 * from the real options the matching engine uses, since typing them by hand
 * is how they end up empty or misspelled, which silently costs someone every
 * domain match they should have had.
 */

const DOMAINS = ['healthtech', 'fintech', 'edtech', 'climate', 'saas', 'cybersecurity', 'logistics', 'proptech', 'hr tech', 'legal tech', 'biotech', 'creator economy'];
const STAGES = ['idea', 'prototype', 'mvp', 'early traction'];

const FIELD = 'w-full px-3.5 py-2.5 rounded-lg border border-surface-border bg-surface-muted text-[14.5px] text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-violet-500 focus:bg-surface transition-colors';

function parseList(str) {
  return (str || '').split(',').map((s) => s.trim()).filter(Boolean);
}

/** Shows exactly what will be saved, so a mangled entry is visible. */
function ParsedChips({ value, empty }) {
  const items = parseList(value);
  if (items.length === 0) return <p className="text-[12.5px] text-ink-300 mt-2">{empty}</p>;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2.5">
      {items.map((s, i) => (
        <span key={`${s}-${i}`} className="text-[11.5px] px-2 py-1 rounded-md bg-violet-50 text-violet-700">{s}</span>
      ))}
    </div>
  );
}

function TogglePills({ options, selected, onToggle }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => onToggle(o)}
            className={`text-[12.5px] px-3 py-1.5 rounded-full font-medium capitalize transition-colors ${
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

function Section({ title, detail, children, onSave, saving, saveLabel }) {
  return (
    <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7 mb-4">
      <p className="text-[16px] font-semibold text-ink-950 mb-1">{title}</p>
      {detail && <p className="text-[13.5px] text-ink-500 mb-5">{detail}</p>}
      {children}
      <button
        onClick={onSave}
        disabled={saving}
        className="mt-6 bg-ink-900 hover:bg-ink-700 text-white px-5 py-2.5 rounded-full text-[14px] font-medium transition-colors disabled:opacity-50"
      >
        {saving ? 'Saving…' : saveLabel}
      </button>
    </div>
  );
}

export default function MyProfile() {
  const { persona, displayName } = useMyPersona();
  const showToast = useToast();
  const [loading, setLoading] = useState(true);
  const [completion, setCompletion] = useState(0);
  const [savingBase, setSavingBase] = useState(false);
  const [savingContrib, setSavingContrib] = useState(false);
  const [savingInvestor, setSavingInvestor] = useState(false);

  const [base, setBase] = useState({ displayName: '', headline: '', bio: '', location: '', skillsInput: '' });
  const [contrib, setContrib] = useState({ availability: '', lookingFor: '', portfolioUrl: '', preferredDomains: [], preferredStage: [], experienceYears: '' });
  const [investor, setInvestor] = useState({ thesis: '', ticketMin: '', ticketMax: '', preferredDomains: [], preferredStages: '', investmentType: '' });

  useEffect(() => {
    getMyProfile().then(({ ok, data }) => {
      if (ok && data.success) {
        const p = data.profile;
        setCompletion(p.completion_score || 0);
        setBase({
          displayName: p.display_name || '', headline: p.headline || '', bio: p.bio || '',
          location: p.location || '', skillsInput: (p.skills || []).join(', '),
        });
        const rp = data.roleProfile;
        if (rp && persona === 'CONTRIBUTOR') {
          setContrib({
            availability: rp.availability || '', lookingFor: rp.looking_for || '',
            portfolioUrl: rp.portfolio_url || '', preferredDomains: rp.preferred_domains || [],
            preferredStage: rp.preferred_stage || [], experienceYears: rp.experience_years ?? '',
          });
        }
        if (rp && persona === 'INVESTOR') {
          setInvestor({
            thesis: rp.thesis || '', ticketMin: rp.ticket_min ?? '', ticketMax: rp.ticket_max ?? '',
            preferredDomains: rp.preferred_domains || [],
            preferredStages: (rp.preferred_stages || []).join(', '), investmentType: rp.investment_type || '',
          });
        }
      }
      setLoading(false);
    });
  }, [persona]);

  async function withTimeout(promise, ms = 15000) {
    let t;
    const timeout = new Promise((resolve) => {
      t = setTimeout(() => resolve({ ok: false, data: { error: 'TIMED_OUT', detail: 'That took too long. Check your connection and try again.' } }), ms);
    });
    const result = await Promise.race([promise, timeout]);
    clearTimeout(t);
    return result;
  }

  async function handleSaveBase() {
    setSavingBase(true);
    const { ok, data } = await withTimeout(updateBaseProfile({
      displayName: base.displayName, headline: base.headline, bio: base.bio,
      location: base.location, skills: parseList(base.skillsInput),
    }));
    setSavingBase(false);
    if (ok && data.success) showToast('Saved. Your matches are updating, give it a few seconds.');
    else showToast(data.detail || data.error || 'Could not save that.', 'error');
  }

  async function handleSaveContrib() {
    setSavingContrib(true);
    const { ok, data } = await withTimeout(upsertContributorProfile({
      availability: contrib.availability, lookingFor: contrib.lookingFor, portfolioUrl: contrib.portfolioUrl,
      preferredDomains: contrib.preferredDomains, preferredStage: contrib.preferredStage,
      experienceYears: parseInt(contrib.experienceYears) || 0,
    }));
    setSavingContrib(false);
    if (ok && data.success) showToast('Saved. Your matches are updating, give it a few seconds.');
    else showToast(data.detail || data.error || 'Could not save that.', 'error');
  }

  async function handleSaveInvestor() {
    setSavingInvestor(true);
    const { ok, data } = await withTimeout(upsertInvestorProfile({
      thesis: investor.thesis,
      ticketMin: parseFloat(investor.ticketMin) || null, ticketMax: parseFloat(investor.ticketMax) || null,
      preferredDomains: investor.preferredDomains,
      preferredStages: parseList(investor.preferredStages), investmentType: investor.investmentType,
    }));
    setSavingInvestor(false);
    if (ok && data.success) showToast('Saved. Your deal flow is updating.');
    else showToast(data.detail || data.error || 'Could not save that.', 'error');
  }

  if (loading) {
    return (
      <Shell persona={persona} displayName={displayName} title="Your profile">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" />
        </div>
      </Shell>
    );
  }

  const missingMission = persona === 'CONTRIBUTOR' && !contrib.lookingFor;
  const missingDomains = persona === 'CONTRIBUTOR' && contrib.preferredDomains.length === 0;

  return (
    <Shell persona={persona} displayName={displayName} title="Your profile" subtitle="What matching actually runs on">
      <div className="mb-7">
        <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-violet-600 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
          {completion}% complete
        </p>
        <h1 className="font-editorial italic text-[32px] text-trust-fg leading-tight max-w-3xl">
          {completion >= 80 ? 'This is what founders see of you.' : 'The more honest this is, the better it works.'}
        </h1>
        <p className="text-[15px] text-ink-700 mt-3 max-w-2xl leading-relaxed">
          Nothing here is decoration. Every field feeds the matching, and what you write about what you want carries real weight, not just your skill list.
        </p>
        <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden max-w-md mt-4">
          <motion.div
            initial={{ width: 0 }} animate={{ width: `${completion}%` }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="h-full rounded-full bg-violet-500"
          />
        </div>
      </div>

      {(missingMission || missingDomains) && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-5 mb-4">
          <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-[14px] font-semibold text-amber-800">
              {missingMission && missingDomains ? 'Two things are limiting your matches'
                : missingMission ? 'You have not said what you are looking for'
                : 'You have not picked any fields'}
            </p>
            <p className="text-[13px] text-amber-700 mt-0.5 leading-relaxed">
              {missingDomains && 'Without fields, ventures in the areas you care about score no higher than any other. '}
              {missingMission && 'Without a mission, matching runs on skills alone, which is how people end up matched to work they would never take.'}
            </p>
          </div>
        </div>
      )}

      <div className="max-w-3xl">
        <Section
          title="The basics"
          detail="Your headline is what people see first, in search and next to every match."
          onSave={handleSaveBase} saving={savingBase} saveLabel="Save basics"
        >
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">Your name</label>
              <input value={base.displayName} onChange={(e) => setBase({ ...base, displayName: e.target.value })} className={FIELD} />
            </div>
            <div>
              <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">What you do</label>
              <input value={base.headline} onChange={(e) => setBase({ ...base, headline: e.target.value })} placeholder="Backend Engineer" className={FIELD} />
            </div>
          </div>
          <div className="mb-4">
            <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">A bit about you</label>
            <textarea value={base.bio} onChange={(e) => setBase({ ...base, bio: e.target.value })} rows={3} className={`${FIELD} resize-none leading-relaxed`} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">Where you are</label>
              <input value={base.location} onChange={(e) => setBase({ ...base, location: e.target.value })} placeholder="Bengaluru, India" className={FIELD} />
            </div>
            <div>
              <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">What you can do</label>
              <input value={base.skillsInput} onChange={(e) => setBase({ ...base, skillsInput: e.target.value })} placeholder="python, postgresql, aws" className={FIELD} />
              {/* Live preview of what will actually be saved. A profile once
                  stored 'user interviewsability testings' and the page showed
                  it back as the same string, so nobody could see it. */}
              <ParsedChips value={base.skillsInput} empty="Separate each skill with a comma" />
            </div>
          </div>
        </Section>

        {persona === 'CONTRIBUTOR' && (
          <Section
            title="What you are looking for"
            detail="This carries real weight in matching, alongside your skills. Be honest about what you would not take."
            onSave={handleSaveContrib} saving={savingContrib} saveLabel="Save"
          >
            <div className="mb-5">
              <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">The kind of thing you want to work on</label>
              <textarea
                value={contrib.lookingFor}
                onChange={(e) => setContrib({ ...contrib, lookingFor: e.target.value })}
                rows={4}
                placeholder="Not your skills. What draws you in, and what you are done with."
                className={`${FIELD} resize-none leading-relaxed`}
              />
            </div>

            <div className="mb-5">
              <label className="text-[13px] font-medium text-ink-700 mb-2 block">Fields you care about</label>
              <TogglePills
                options={DOMAINS}
                selected={contrib.preferredDomains}
                onToggle={(d) => setContrib({
                  ...contrib,
                  preferredDomains: contrib.preferredDomains.includes(d)
                    ? contrib.preferredDomains.filter((x) => x !== d)
                    : [...contrib.preferredDomains, d],
                })}
              />
            </div>

            <div className="mb-5">
              <label className="text-[13px] font-medium text-ink-700 mb-2 block">How early you want to join</label>
              <TogglePills
                options={STAGES}
                selected={contrib.preferredStage}
                onToggle={(s) => setContrib({
                  ...contrib,
                  preferredStage: contrib.preferredStage.includes(s)
                    ? contrib.preferredStage.filter((x) => x !== s)
                    : [...contrib.preferredStage, s],
                })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">How much time</label>
                <select value={contrib.availability} onChange={(e) => setContrib({ ...contrib, availability: e.target.value })} className={FIELD}>
                  <option value="">Select…</option>
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="advisor">Advising</option>
                </select>
              </div>
              <div>
                <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">Years doing this</label>
                <input type="number" min="0" value={contrib.experienceYears} onChange={(e) => setContrib({ ...contrib, experienceYears: e.target.value })} className={FIELD} />
              </div>
              <div>
                <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">Your work</label>
                <input value={contrib.portfolioUrl} onChange={(e) => setContrib({ ...contrib, portfolioUrl: e.target.value })} placeholder="https://" className={FIELD} />
              </div>
            </div>
          </Section>
        )}

        {persona === 'INVESTOR' && (
          <Section
            title="What you back"
            detail="Your thesis and fields decide which ventures reach you. Nothing outside them will."
            onSave={handleSaveInvestor} saving={savingInvestor} saveLabel="Save"
          >
            <div className="mb-5">
              <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">Your thesis</label>
              <textarea
                value={investor.thesis}
                onChange={(e) => setInvestor({ ...investor, thesis: e.target.value })}
                rows={4}
                placeholder="What you look for, and what you pass on."
                className={`${FIELD} resize-none leading-relaxed`}
              />
            </div>

            <div className="mb-5">
              <label className="text-[13px] font-medium text-ink-700 mb-2 block">Fields you invest in</label>
              <TogglePills
                options={DOMAINS}
                selected={investor.preferredDomains}
                onToggle={(d) => setInvestor({
                  ...investor,
                  preferredDomains: investor.preferredDomains.includes(d)
                    ? investor.preferredDomains.filter((x) => x !== d)
                    : [...investor.preferredDomains, d],
                })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">Smallest cheque</label>
                <input type="number" value={investor.ticketMin} onChange={(e) => setInvestor({ ...investor, ticketMin: e.target.value })} className={FIELD} />
              </div>
              <div>
                <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">Largest cheque</label>
                <input type="number" value={investor.ticketMax} onChange={(e) => setInvestor({ ...investor, ticketMax: e.target.value })} className={FIELD} />
              </div>
              <div>
                <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">Stages</label>
                <input value={investor.preferredStages} onChange={(e) => setInvestor({ ...investor, preferredStages: e.target.value })} placeholder="pre-seed, seed" className={FIELD} />
                <ParsedChips value={investor.preferredStages} empty="Comma separated" />
              </div>
            </div>
          </Section>
        )}
      </div>
    </Shell>
  );
}
