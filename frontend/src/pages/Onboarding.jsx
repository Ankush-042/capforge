import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { createStartup, confirmStartup } from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';

const PROCESSING_MESSAGES = ['Understanding your venture', 'Identifying required capabilities', 'Preparing your venture profile'];
const FUNDING_STAGES = ['Bootstrapped', 'Pre-seed', 'Seed', 'Series A+'];

function Chip({ children }) {
  return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm bg-violet-50 text-violet-700 mr-2 mb-2">{children}</span>;
}

export default function Onboarding() {
  const navigate = useNavigate();
  const showToast = useToast();
  const [phase, setPhase] = useState('input');
  const [processingStep, setProcessingStep] = useState(0);
  const [showMore, setShowMore] = useState(false);
  const [error, setError] = useState(null);
  const [startup, setStartup] = useState(null);

  const [name, setName] = useState('');
  const [rawIdea, setRawIdea] = useState('');
  const [currentTeamSize, setCurrentTeamSize] = useState('');
  const [fundingRaised, setFundingRaised] = useState('');
  const [fundingStage, setFundingStage] = useState('');
  const [targetTimeline, setTargetTimeline] = useState('');
  const [equityOfferedRange, setEquityOfferedRange] = useState('');
  const [founderPriorExperience, setFounderPriorExperience] = useState('');

  async function handleAnalyze() {
    if (!name.trim() || rawIdea.trim().length < 10) {
      setError('Give it a name, and describe the idea in a bit more detail.');
      return;
    }
    setError(null);
    setPhase('processing');
    const stepTimer = setInterval(() => setProcessingStep((s) => (s + 1) % PROCESSING_MESSAGES.length), 1400);

    const { ok, data } = await createStartup({
      name, rawIdea,
      currentTeamSize: currentTeamSize ? parseInt(currentTeamSize) : undefined,
      fundingRaised: fundingRaised ? parseFloat(fundingRaised) : undefined,
      fundingStage: fundingStage || undefined,
      targetTimeline: targetTimeline || undefined,
      equityOfferedRange: equityOfferedRange || undefined,
      founderPriorExperience: founderPriorExperience || undefined,
    });
    clearInterval(stepTimer);

    if (!ok || !data.success) {
      setPhase('error');
      const msg = data.detail || data.error || "We couldn't complete the venture analysis. Your idea is safe — try again.";
      setError(msg);
      showToast(msg, 'error');
      return;
    }
    setStartup(data.startup);
    setPhase('review');
  }

  async function handleConfirm() {
    const { ok, data } = await confirmStartup(startup.id, {});
    if (ok && data.success) { showToast('Venture confirmed.'); navigate('/app'); }
    else showToast(data.detail || data.error || 'Could not confirm — try again.', 'error');
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-ink-900">Tell CapForge about your startup</h1>
          <p className="text-sm text-ink-500 mt-1">The more context you give, the stronger your matches will be.</p>
        </div>

        {(phase === 'input' || phase === 'error') && (
          <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
            <label className="text-[13px] font-medium text-ink-500 mb-1.5 block">Startup name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. FoodSense"
              className="w-full mb-4 px-3.5 py-2.5 rounded-lg border border-surface-border bg-surface-muted text-[15px] focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300" />
            <label className="text-[13px] font-medium text-ink-500 mb-1.5 block">Your idea</label>
            <textarea value={rawIdea} onChange={(e) => setRawIdea(e.target.value)} rows={5} placeholder="I want to build..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-surface-border bg-surface-muted text-[15px] focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300 resize-none" />

            <button onClick={() => setShowMore(!showMore)} className="flex items-center gap-1.5 text-[13px] text-violet-600 font-medium mt-4">
              {showMore ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {showMore ? 'Hide additional context' : 'Add more context (optional, strengthens matching)'}
            </button>

            {showMore && (
              <div className="mt-4 space-y-4 pt-4 border-t border-surface-border">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[13px] font-medium text-ink-500 mb-1.5 block">Current team size</label>
                    <input type="number" min="1" value={currentTeamSize} onChange={(e) => setCurrentTeamSize(e.target.value)} placeholder="1"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-surface-border bg-surface-muted text-[15px] focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
                  </div>
                  <div>
                    <label className="text-[13px] font-medium text-ink-500 mb-1.5 block">Funding stage</label>
                    <select value={fundingStage} onChange={(e) => setFundingStage(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-surface-border bg-surface-muted text-[15px] focus:outline-none focus:ring-2 focus:ring-violet-500/20">
                      <option value="">Select…</option>
                      {FUNDING_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[13px] font-medium text-ink-500 mb-1.5 block">Funding raised so far (USD, optional)</label>
                  <input type="number" min="0" value={fundingRaised} onChange={(e) => setFundingRaised(e.target.value)} placeholder="0"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-surface-border bg-surface-muted text-[15px] focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
                </div>
                <div>
                  <label className="text-[13px] font-medium text-ink-500 mb-1.5 block">Target timeline</label>
                  <input value={targetTimeline} onChange={(e) => setTargetTimeline(e.target.value)} placeholder="e.g. MVP in 4 months"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-surface-border bg-surface-muted text-[15px] focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
                </div>
                <div>
                  <label className="text-[13px] font-medium text-ink-500 mb-1.5 block">Equity you'd offer a co-founder/key hire</label>
                  <input value={equityOfferedRange} onChange={(e) => setEquityOfferedRange(e.target.value)} placeholder="e.g. 5-10% for a technical co-founder"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-surface-border bg-surface-muted text-[15px] focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
                </div>
                <div>
                  <label className="text-[13px] font-medium text-ink-500 mb-1.5 block">Your relevant prior experience</label>
                  <textarea value={founderPriorExperience} onChange={(e) => setFounderPriorExperience(e.target.value)} rows={2} placeholder="e.g. 5 years in fintech product management, ran a previous startup..."
                    className="w-full px-3.5 py-2.5 rounded-lg border border-surface-border bg-surface-muted text-[15px] focus:outline-none focus:ring-2 focus:ring-violet-500/20 resize-none" />
                </div>
              </div>
            )}

            {error && <p className="text-[13px] text-rose-500 mt-3">{error}</p>}
            <button onClick={handleAnalyze} className="w-full mt-5 bg-ink-900 hover:bg-ink-700 text-white py-2.5 rounded-lg text-[15px] font-medium transition-colors">
              Analyze idea
            </button>
          </div>
        )}

        {phase === 'processing' && (
          <div className="bg-surface rounded-xl border border-surface-border shadow-card p-10 flex flex-col items-center">
            <div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin mb-5" />
            <p className="text-ink-700 text-sm">{PROCESSING_MESSAGES[processingStep]}…</p>
          </div>
        )}

        {phase === 'review' && startup && (
          <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
            <h2 className="text-sm font-semibold tracking-wide text-ink-500 uppercase mb-5">CapForge Understanding</h2>
            <p className="text-[13px] font-medium text-ink-500 mb-1">Problem</p>
            <p className="text-[15px] text-ink-900 mb-4">{startup.problem}</p>
            <p className="text-[13px] font-medium text-ink-500 mb-1">Solution</p>
            <p className="text-[15px] text-ink-900 mb-4">{startup.solution}</p>
            <p className="text-[13px] font-medium text-ink-500 mb-2">Domain</p>
            <div className="mb-4">{(startup.domain || []).map((d) => <Chip key={d}>{d}</Chip>)}</div>
            <p className="text-[13px] font-medium text-ink-500 mb-2">Required roles</p>
            <div className="space-y-2 mb-5">
              {(startup.role_requirements || []).map((r) => (
                <div key={r.role} className="bg-surface-muted rounded-lg p-3">
                  <p className="text-[15px] font-medium text-ink-900 mb-1">{r.role}</p>
                  <div>{(r.skills || []).map((s) => <Chip key={s}>{s}</Chip>)}</div>
                </div>
              ))}
            </div>
            <button onClick={handleConfirm} className="w-full bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-lg text-[15px] font-medium transition-colors">
              Confirm & continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
