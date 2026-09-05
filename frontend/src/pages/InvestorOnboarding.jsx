import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { upsertInvestorProfile } from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';

const STAGES = ['Idea', 'Prototype', 'MVP', 'Early Traction'];
const DOMAINS = ['AI', 'FinTech', 'HealthTech', 'Climate', 'EdTech', 'SaaS', 'Food service', 'DeepTech'];

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

  async function handleSubmit() {
    setSaving(true);
    const { ok } = await upsertInvestorProfile({
      thesis, preferredStages, preferredDomains, investmentType,
      ticketMin: ticketMin ? parseFloat(ticketMin) : undefined,
      ticketMax: ticketMax ? parseFloat(ticketMax) : undefined,
    });
    setSaving(false);
    if (ok) { showToast('Profile complete.'); navigate('/app/investor'); }
    else showToast('Something went wrong saving your profile — try again.', 'error');
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-ink-900">Define your thesis</h1>
          <p className="text-sm text-ink-500 mt-1">This is what your deal-flow will be ranked against.</p>
        </div>
        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7 space-y-4">
          <div>
            <label className="text-[13px] font-medium text-ink-500 mb-1.5 block">Investment thesis</label>
            <textarea value={thesis} onChange={(e) => setThesis(e.target.value)} rows={3} placeholder="e.g. Early-stage AI-native SaaS, especially in vertical B2B"
              className="w-full px-3.5 py-2.5 rounded-lg border border-surface-border bg-surface-muted text-[15px] focus:outline-none focus:ring-2 focus:ring-violet-500/20 resize-none" />
          </div>
          <div>
            <label className="text-[13px] font-medium text-ink-500 mb-2 block">Preferred stages</label>
            <div className="flex flex-wrap gap-2">
              {STAGES.map((s) => (
                <button key={s} type="button" onClick={() => toggle(preferredStages, setPreferredStages, s.toLowerCase())}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${preferredStages.includes(s.toLowerCase()) ? 'bg-violet-600 text-white' : 'bg-surface-muted text-ink-500'}`}>
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[13px] font-medium text-ink-500 mb-1.5 block">Ticket size min (USD)</label>
              <input type="number" min="0" value={ticketMin} onChange={(e) => setTicketMin(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-surface-border bg-surface-muted text-[15px] focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
            </div>
            <div>
              <label className="text-[13px] font-medium text-ink-500 mb-1.5 block">Ticket size max (USD)</label>
              <input type="number" min="0" value={ticketMax} onChange={(e) => setTicketMax(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-surface-border bg-surface-muted text-[15px] focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
            </div>
          </div>
          <div>
            <label className="text-[13px] font-medium text-ink-500 mb-1.5 block">Investment type</label>
            <select value={investmentType} onChange={(e) => setInvestmentType(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-surface-border bg-surface-muted text-[15px] focus:outline-none focus:ring-2 focus:ring-violet-500/20">
              <option>Angel</option><option>VC Fund</option><option>Syndicate</option>
            </select>
          </div>
          <button onClick={handleSubmit} disabled={saving}
            className="w-full bg-ink-900 hover:bg-ink-700 text-white py-2.5 rounded-lg text-[15px] font-medium transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : 'Complete profile'}
          </button>
          <button onClick={() => navigate('/app/investor')} className="w-full text-[13px] text-ink-500 text-center">Skip for now</button>
        </div>
      </div>
    </div>
  );
}
