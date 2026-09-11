import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { AlertTriangle, ArrowUpRight } from 'lucide-react';
import { upsertInvestorProfile } from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';

/**
 * The first thing an investor does.
 *
 * The domains list was the generic one shared with contributors: AI,
 * FinTech, HealthTech, Climate, EdTech, SaaS, Food service, DeepTech. Half
 * of those do not match any venture on the platform, and several real
 * domains were missing entirely, so an investor could pick nothing that
 * existed and see empty deal flow with no idea why.
 *
 * The list now matches the domain equivalence groups the matching engine
 * actually uses, so every option here can genuinely return something.
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

export default function InvestorOnboarding() {
  const navigate = useNavigate();
  const showToast = useToast();
  const [saving, setSaving] = useState(false);

  const [thesis, setThesis] = useState('');
  const [preferredStages, setPreferredStages] = useState([]);
  const [preferredDomains, setPreferredDomains] = useState([]);
  const [ticketMin, setTicketMin] = useState('');
  const [ticketMax, setTicketMax] = useState('');
  const [investmentType, setInvestmentType] = useState('Angel');

  function toggle(list, setList, value) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  const noDomains = preferredDomains.length === 0;

  async function handleSubmit() {
    if (noDomains) { showToast('Pick at least one field, or nothing will reach you.', 'error'); return; }
    setSaving(true);
    const { ok } = await upsertInvestorProfile({
      thesis, preferredStages, preferredDomains, investmentType,
      ticketMin: ticketMin ? parseFloat(ticketMin) : undefined,
      ticketMax: ticketMax ? parseFloat(ticketMax) : undefined,
    });
    setSaving(false);
    if (ok) { showToast('Set up. Finding ventures that match.'); navigate('/app/investor'); }
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
              <span className="w-1.5 h-1.5 rounded-full bg-mint-500" />Before you see anything
            </p>
            <h1 className="font-display text-[28px] font-semibold text-white leading-tight mb-3">
              Nothing outside this will reach you.
            </h1>
            <p className="text-[15px] text-white/70 leading-relaxed max-w-lg">
              Your deal flow is filtered by what you say here, and only shows ventures that have crossed a real readiness bar. Narrow is fine. Empty is not.
            </p>
          </div>
        </motion.div>

        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7 mb-4">
          <p className="text-[16px] font-semibold text-ink-950 mb-1">What do you back?</p>
          <p className="text-[13.5px] text-ink-500 mb-4">
            In your own words. What you look for, and what you pass on. This is read when ranking ventures against you, so the second half matters.
          </p>
          <textarea
            value={thesis}
            onChange={(e) => setThesis(e.target.value)}
            rows={5}
            placeholder="I back…"
            className={`${FIELD} resize-none leading-relaxed`}
          />

          <div className="mt-6">
            <p className="text-[13.5px] font-medium text-ink-700 mb-2.5">Fields you invest in</p>
            <Pills options={DOMAINS} selected={preferredDomains} onToggle={(v) => toggle(preferredDomains, setPreferredDomains, v)} />
          </div>

          <div className="mt-5">
            <p className="text-[13.5px] font-medium text-ink-700 mb-2.5">How early you come in</p>
            <Pills options={STAGES} selected={preferredStages} onToggle={(v) => toggle(preferredStages, setPreferredStages, v)} />
          </div>
        </div>

        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7 mb-4">
          <p className="text-[16px] font-semibold text-ink-950 mb-4">How you invest</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">Smallest cheque</label>
              <input type="number" min="0" value={ticketMin} onChange={(e) => setTicketMin(e.target.value)} placeholder="USD" className={FIELD} />
            </div>
            <div>
              <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">Largest cheque</label>
              <input type="number" min="0" value={ticketMax} onChange={(e) => setTicketMax(e.target.value)} placeholder="USD" className={FIELD} />
            </div>
            <div>
              <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">You invest as</label>
              <select value={investmentType} onChange={(e) => setInvestmentType(e.target.value)} className={FIELD}>
                <option>Angel</option>
                <option>VC Fund</option>
                <option>Syndicate</option>
              </select>
            </div>
          </div>
        </div>

        {noDomains && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-5 mb-4">
            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-[14px] font-semibold text-amber-800">Pick at least one field</p>
              <p className="text-[13px] text-amber-700 mt-0.5 leading-relaxed">
                Deal flow is filtered by the fields you choose. With none selected, nothing will reach you at all.
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4">
          <button
            onClick={handleSubmit}
            disabled={saving || noDomains}
            className="flex items-center gap-2 bg-ink-900 hover:bg-ink-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-3 rounded-full text-[15px] font-medium transition-colors"
          >
            {saving ? 'Setting you up…' : 'See what matches'}
            {!saving && <ArrowUpRight size={15} />}
          </button>
          <button
            onClick={() => navigate('/app/investor')}
            className="text-[13.5px] text-ink-500 hover:text-ink-900 transition-colors"
          >
            Do this later
          </button>
        </div>
        <p className="text-[12.5px] text-ink-500 mt-3">You can widen or narrow any of this any time.</p>
      </div>
    </div>
  );
}
