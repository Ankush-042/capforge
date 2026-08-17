import React from 'react';
import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="px-10 py-6 flex items-center justify-between max-w-[1440px] mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500" />
          <span className="text-[15px] font-semibold text-ink-900">CapForge</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-[15px] text-ink-500 hover:text-ink-900 px-4 py-2 transition-colors">Log in</Link>
          <Link to="/register" className="text-[15px] bg-ink-900 hover:bg-ink-700 text-white px-4 py-2.5 rounded-lg transition-colors">Sign up</Link>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-10 py-20 text-center">
        <h1 className="text-5xl font-semibold text-ink-900 tracking-tight max-w-2xl mx-auto leading-tight">
          Build the team your venture actually needs
        </h1>
        <p className="text-lg text-ink-500 mt-6 max-w-xl mx-auto leading-relaxed">
          CapForge understands your startup, identifies what's missing, and connects you with the people and capital that can move it forward.
        </p>
        <div className="flex items-center justify-center gap-3 mt-10">
          <Link to="/register" className="text-[15px] bg-ink-900 hover:bg-ink-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">Start building</Link>
          <button className="text-[15px] text-ink-700 border border-surface-border px-6 py-3 rounded-lg font-medium hover:bg-surface-muted transition-colors">See how it works</button>
        </div>
      </main>

      <div className="max-w-[1440px] mx-auto px-10 pb-24 grid grid-cols-3 gap-6">
        {[
          { icon: '◈', title: 'Diagnose', desc: 'CapForge identifies exactly what your venture is missing — talent, skills, market clarity.' },
          { icon: '◐', title: 'Match', desc: 'Explainable, evidence-based candidate ranking against your specific gaps.' },
          { icon: '◒', title: 'Grow', desc: 'Readiness and risk tracking that updates as your team and venture evolve.' },
        ].map((f) => (
          <div key={f.title} className="bg-surface rounded-xl border border-surface-border shadow-card p-8">
            <div className="w-11 h-11 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center text-lg mb-4">{f.icon}</div>
            <p className="text-lg font-semibold text-ink-900 mb-2">{f.title}</p>
            <p className="text-[15px] text-ink-500 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
