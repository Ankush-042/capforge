import React, { useState } from 'react';
import Shell from '../components/Shell.jsx';

const results = {
  startups: [{ name: 'FoodSense2', domain: 'Food service', stage: 'Idea' }],
  contributors: [{ name: 'Priya Data', skills: 'Machine learning, Data modeling' }],
};

export default function Search() {
  const [tab, setTab] = useState('startups');
  const [query, setQuery] = useState('');

  return (
    <Shell title="Search" subtitle="Structured + natural-language">
      <div className="mb-6">
        <h1 className="text-[26px] font-semibold text-ink-900 tracking-tight">Search</h1>
      </div>
      <div className="relative mb-5">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-300">⌕</span>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search startups, skills, domains..."
          className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-surface-border bg-surface text-[15px] focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300 shadow-card" />
      </div>
      <div className="flex gap-2 mb-5">
        {['startups', 'contributors'].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors capitalize ${tab === t ? 'bg-ink-900 text-white' : 'bg-surface-muted text-ink-500 hover:bg-surface-border'}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
        {results[tab].length === 0 ? (
          <div className="text-center py-10">
            <p className="text-[15px] text-ink-500">No results found. Try a different search term or fewer filters.</p>
          </div>
        ) : tab === 'startups' ? (
          results.startups.map((s) => (
            <div key={s.name} className="flex items-center justify-between py-3 border-b border-surface-border last:border-0">
              <div><p className="text-[15px] font-medium text-ink-900">{s.name}</p><p className="text-[13px] text-ink-500">{s.domain} · {s.stage}</p></div>
            </div>
          ))
        ) : (
          results.contributors.map((c) => (
            <div key={c.name} className="flex items-center justify-between py-3 border-b border-surface-border last:border-0">
              <div><p className="text-[15px] font-medium text-ink-900">{c.name}</p><p className="text-[13px] text-ink-500">{c.skills}</p></div>
            </div>
          ))
        )}
      </div>
    </Shell>
  );
}
