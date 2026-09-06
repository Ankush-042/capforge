import React, { useState } from 'react';
import { useMyPersona } from '../hooks/useMyPersona.js';
import { Link } from 'react-router-dom';
import { SearchIcon, Sparkles, BookmarkPlus } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { searchStartups, searchContributors, semanticSearchStartups, createSavedSearch } from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';

const FUNDING_STAGES = ['Bootstrapped', 'Pre-seed', 'Seed', 'Series A+'];

export default function Search() {
  const persona = useMyPersona();
  const showToast = useToast();
  const [tab, setTab] = useState('startups');
  const [mode, setMode] = useState('keyword'); // 'keyword' | 'semantic'
  const [query, setQuery] = useState('');
  const [domain, setDomain] = useState('');
  const [fundingStage, setFundingStage] = useState('');
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);

  function currentFilters() {
    const params = {};
    if (query) params.q = query;
    if (domain) params.domain = domain;
    if (fundingStage) params.fundingStage = fundingStage;
    return params;
  }

  async function runSearch() {
    setSearching(true);
    setSearched(true);
    let response;
    if (mode === 'semantic' && tab === 'startups') {
      response = await semanticSearchStartups(query);
    } else {
      response = tab === 'startups' ? await searchStartups(currentFilters()) : await searchContributors(currentFilters());
    }
    setSearching(false);
    if (response.ok && response.data.success) setResults(response.data.results);
    else setResults([]);
  }

  async function handleSaveSearch() {
    const name = window.prompt('Name this search (e.g. "Pre-seed fintech ventures")');
    if (!name) return;
    const { ok, data } = await createSavedSearch(name, currentFilters());
    if (ok && data.success) showToast('Search saved — find it any time from your saved searches.');
    else showToast(data.error || 'Could not save search.', 'error');
  }

  return (
    <Shell persona={persona} title="Search" subtitle="Real, live results">
      <PageHeader icon={SearchIcon} iconBg="bg-violet-50" iconColor="text-violet-600" title="Search" subtitle="Real, live results" />

      <div className="relative mb-4">
        <SearchIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-300" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && runSearch()}
          placeholder={mode === 'semantic' ? "Describe what you're looking for, in your own words..." : "Search by name, problem, or keyword..."}
          className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-surface-border bg-surface text-[15px] focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300 shadow-card" />
      </div>
      <div className="flex gap-2 mb-5 items-center flex-wrap">
        {['startups', 'contributors'].map((t) => (
          <button key={t} onClick={() => { setTab(t); setResults([]); setSearched(false); }}
            className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors capitalize ${tab === t ? 'bg-ink-900 text-white' : 'bg-surface-muted text-ink-500 hover:bg-surface-border'}`}>
            {t}
          </button>
        ))}
        {tab === 'startups' && (
          <button onClick={() => setMode(mode === 'semantic' ? 'keyword' : 'semantic')}
            className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${mode === 'semantic' ? 'bg-violet-600 text-white' : 'bg-surface-muted text-ink-500'}`}>
            <Sparkles size={14} /> Semantic
          </button>
        )}
        {mode === 'keyword' && (
          <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="Filter by domain (e.g. fintech)"
            className="text-sm px-3 py-2 rounded-lg border border-surface-border bg-surface-muted focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
        )}
        {mode === 'keyword' && tab === 'startups' && persona === 'INVESTOR' && (
          <select value={fundingStage} onChange={(e) => setFundingStage(e.target.value)}
            className="text-sm px-3 py-2 rounded-lg border border-surface-border bg-surface-muted focus:outline-none focus:ring-2 focus:ring-violet-500/20">
            <option value="">Any funding stage</option>
            {FUNDING_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        <button onClick={runSearch} disabled={searching} className="text-sm bg-violet-50 text-violet-700 px-4 py-2 rounded-lg font-medium hover:bg-violet-100 transition-colors disabled:opacity-50">
          {searching ? 'Searching…' : 'Search'}
        </button>
        {persona === 'INVESTOR' && tab === 'startups' && (
          <button onClick={handleSaveSearch} className="flex items-center gap-1.5 text-sm bg-surface-muted text-ink-700 px-3 py-2 rounded-lg font-medium hover:bg-surface-border transition-colors">
            <BookmarkPlus size={14} /> Save search
          </button>
        )}
      </div>

      <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
        {!searched ? (
          <p className="text-[15px] text-ink-500 text-center py-6">
            {mode === 'semantic' ? 'Describe what you\'re looking for in plain language — real embeddings find conceptually similar ventures, not just keyword matches.' : 'Enter a search term or domain filter, then click Search.'}
          </p>
        ) : results.length === 0 ? (
          <p className="text-[15px] text-ink-500 text-center py-6">No results found. Try a different search term or fewer filters.</p>
        ) : tab === 'startups' ? (
          results.map((s) => (
            <Link to={`/app/startups/${s.id}`} key={s.id} className="flex items-center justify-between py-3 border-b border-surface-border last:border-0 hover-lift hover:bg-surface-muted/50 -mx-1 px-1 rounded-lg transition-colors">
              <div><p className="text-[15px] font-medium text-ink-900">{s.name}</p><p className="text-[13px] text-ink-500">{(s.domain || []).join(', ')} · {s.stage}</p></div>
              {s.similarity !== undefined && <span className="text-sm font-medium text-violet-600">{Math.round(s.similarity * 100)}% match</span>}
            </Link>
          ))
        ) : (
          results.map((c) => (
            <div key={c.user_id} className="flex items-center justify-between py-3 border-b border-surface-border last:border-0">
              <div><p className="text-[15px] font-medium text-ink-900">{c.display_name}</p><p className="text-[13px] text-ink-500">{c.headline} · {(c.skills || []).join(', ')}</p></div>
            </div>
          ))
        )}
      </div>
    </Shell>
  );
}
