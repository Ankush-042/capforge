import React, { useState } from 'react';

const STEPS = ['Idea', 'Understanding'];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [rawIdea, setRawIdea] = useState('');

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${i <= step ? 'bg-violet-500 text-white' : 'bg-surface-muted text-ink-300'}`}>{i + 1}</div>
              <span className={`text-[13px] ${i <= step ? 'text-ink-900' : 'text-ink-300'}`}>{s}</span>
              {i < STEPS.length - 1 && <span className="w-8 h-px bg-surface-border" />}
            </div>
          ))}
        </div>

        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-8">
          <h1 className="text-xl font-semibold text-ink-900 mb-1">Tell CapForge about your startup</h1>
          <p className="text-[15px] text-ink-500 mb-6">Describe it in your own words — CapForge will structure it for you.</p>
          <label className="text-[13px] font-medium text-ink-500 mb-1.5 block">Startup name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. FoodSense"
            className="w-full mb-4 px-3.5 py-2.5 rounded-lg border border-surface-border bg-surface-muted text-[15px] focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300" />
          <label className="text-[13px] font-medium text-ink-500 mb-1.5 block">Your idea</label>
          <textarea value={rawIdea} onChange={(e) => setRawIdea(e.target.value)} rows={5} placeholder="I want to build..."
            className="w-full px-3.5 py-2.5 rounded-lg border border-surface-border bg-surface-muted text-[15px] focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300 resize-none" />
          <button className="w-full mt-5 bg-ink-900 hover:bg-ink-700 text-white py-2.5 rounded-lg text-[15px] font-medium transition-colors">
            Analyze idea
          </button>
        </div>
      </div>
    </div>
  );
}
