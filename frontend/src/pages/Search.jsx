import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Search as SearchIcon, Sparkles, BookmarkPlus, ArrowUpRight } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import { useMyPersona } from '../hooks/useMyPersona.js';
import { searchStartups, searchContributors, semanticSearchStartups, createSavedSearch } from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';

/**
 * Finding things.
 *
 * The controls were a row of seven buttons, toggles and inputs with no
 * hierarchy: two tabs, a semantic toggle, a domain filter, a stage select, a
 * search button and a save button, all the same size in one line. Results
 * were thin rows in a box.
 *
 * The semantic mode is genuinely the interesting thing here, and it was a
 * small toggle labelled 'Semantic' which explains nothing. It now explains
 * what it does, because describing what you want in your own words is a
 * different act from typing a keyword.
 */

const FUNDING_STAGES = ['Bootstrapped', 'Pre-seed', 'Seed', 'Series A+'];

export default function Search() {
  const { persona, displayName } = useMyPersona();
  const showToast = useToast();
  const [tab, setTab] = useState('startups');
  const [mode, setMode] = useState('keyword');
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
    const response = (mode === 'semantic' && tab === 'startups')
      ? await semanticSearchStartups(query)
      : tab === 'startups'
        ? await searchStartups(currentFilters())
        : await searchContributors(currentFilters());
    setSearching(false);
    setResults(response.ok && response.data.success ? response.data.results : []);
  }

  async function handleSaveSearch() {
    const name = window.prompt('Name this search, so you recognise it later');
    if (!name) return;
    const { ok, data } = await createSavedSearch(name, currentFilters());
    if (ok && data.success) showToast('Saved. Re-run it any time from Saved searches.');
    else showToast(data.error || 'Could not save that.', 'error');
  }

  const isSemantic = mode === 'semantic' && tab === 'startups';

  return (
    <Shell persona={persona} displayName={displayName} title="Search" subtitle="Everything on the platform">
      {/* THE SEARCH ITSELF, given real weight rather than being one control
          among seven. */}
      <div className="relative mb-4">
        <SearchIcon size={17} className="absolute left-5 top-1/2 -translate-y-1/2 text-ink-300" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runSearch()}
          placeholder={isSemantic
            ? 'Describe the kind of venture you are looking for…'
            : tab === 'startups' ? 'Search ventures by name, problem or keyword…' : 'Search people by name, role or skill…'}
          className="w-full pl-13 pr-32 py-4 rounded-full border border-surface-border bg-surface text-[15.5px] text-ink-900 placeholder:text-ink-300 shadow-card focus:outline-none focus:border-violet-500 transition-colors"
          style={{ paddingLeft: '52px' }}
        />
        <button
          onClick={runSearch}
          disabled={searching}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-ink-900 hover:bg-ink-700 text-white px-5 py-2.5 rounded-full text-[14px] font-medium transition-colors disabled:opacity-50"
        >
          {searching ? 'Looking…' : 'Search'}
        </button>
      </div>

      {/* CONTROLS, grouped by what they do rather than in one flat row. */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-1 bg-surface-muted rounded-full p-1">
          {['startups', 'contributors'].map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setResults([]); setSearched(false); }}
              className={`text-[13px] px-4 py-1.5 rounded-full font-medium transition-colors ${
                tab === t ? 'bg-surface text-ink-950 shadow-sm' : 'text-ink-500 hover:text-ink-900'
              }`}
            >
              {t === 'startups' ? 'Ventures' : 'People'}
            </button>
          ))}
        </div>

        {tab === 'startups' && (
          <button
            onClick={() => setMode(mode === 'semantic' ? 'keyword' : 'semantic')}
            className={`flex items-center gap-1.5 text-[13px] px-4 py-2 rounded-full font-medium transition-colors ${
              isSemantic ? 'bg-violet-600 text-white' : 'bg-surface-muted text-ink-700 hover:bg-surface-border'
            }`}
          >
            <Sparkles size={13} /> Search by meaning
          </button>
        )}

        {!isSemantic && (
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            placeholder="Filter by field"
            className="text-[13px] px-4 py-2 rounded-full border border-surface-border bg-surface text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-violet-500 transition-colors w-[180px]"
          />
        )}

        {!isSemantic && tab === 'startups' && persona === 'INVESTOR' && (
          <select
            value={fundingStage}
            onChange={(e) => setFundingStage(e.target.value)}
            className="text-[13px] px-4 py-2 rounded-full border border-surface-border bg-surface text-ink-900 focus:outline-none focus:border-violet-500 transition-colors"
          >
            <option value="">Any funding stage</option>
            {FUNDING_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}

        {persona === 'INVESTOR' && tab === 'startups' && !isSemantic && (
          <button
            onClick={handleSaveSearch}
            className="flex items-center gap-1.5 text-[13px] px-4 py-2 rounded-full font-medium text-ink-700 hover:text-violet-700 transition-colors"
          >
            <BookmarkPlus size={13} /> Save this
          </button>
        )}
      </div>

      {/* What the mode actually does, since 'Semantic' explains nothing. */}
      {isSemantic && (
        <p className="text-[13px] text-ink-500 mb-6 max-w-2xl leading-relaxed">
          Describe what you are after in plain language and this finds ventures that mean the same thing, not ones that happen to use the same words.
        </p>
      )}
      {!isSemantic && <div className="mb-6" />}

      {!searched ? (
        <div className="bg-surface rounded-xl border border-surface-border shadow-card py-16 text-center">
          <SearchIcon size={22} className="text-ink-300 mx-auto mb-3" />
          <p className="text-[15px] text-ink-700 mb-1">
            {tab === 'startups' ? 'Find a venture.' : 'Find someone.'}
          </p>
          <p className="text-[13px] text-ink-500 max-w-sm mx-auto">
            {tab === 'startups'
              ? 'Search by name or keyword, or switch to searching by meaning and describe what you want.'
              : 'Search by name, the role someone holds, or a skill they have.'}
          </p>
        </div>
      ) : results.length === 0 ? (
        <div className="bg-surface rounded-xl border border-surface-border shadow-card py-16 text-center">
          <p className="text-[15px] text-ink-700 mb-1">Nothing found.</p>
          <p className="text-[13px] text-ink-500">Try fewer filters, or different words.</p>
        </div>
      ) : (
        <>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-[15px] font-semibold text-ink-900">
              {results.length} {tab === 'startups' ? (results.length === 1 ? 'venture' : 'ventures') : (results.length === 1 ? 'person' : 'people')}
            </h2>
            {isSemantic && <span className="text-[13px] text-ink-500">Ranked by how close the meaning is</span>}
          </div>

          <div className="grid grid-cols-3 gap-4">
            {tab === 'startups'
              ? results.map((s, i) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.25) }}
                  >
                    <Link
                      to={`/app/startups/${s.id}`}
                      className="group block bg-surface rounded-xl border border-surface-border shadow-card p-5 hover:border-violet-500/50 hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-200"
                    >
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <p className="text-[15px] font-semibold text-ink-950 truncate">{s.name}</p>
                        {s.similarity !== undefined
                          ? <span className="text-[12.5px] font-semibold text-violet-700 tabular-nums shrink-0">{Math.round(parseFloat(s.similarity) * 100)}%</span>
                          : <ArrowUpRight size={14} className="text-ink-300 group-hover:text-violet-600 transition-colors shrink-0" />}
                      </div>
                      <p className="text-[12.5px] text-ink-500 truncate">{(s.domain || []).slice(0, 2).join(' · ')}</p>
                      {s.stage && <p className="text-[12px] text-ink-300 mt-1.5">{s.stage}</p>}
                    </Link>
                  </motion.div>
                ))
              : results.map((c, i) => (
                  <motion.div
                    key={c.user_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.25) }}
                  >
                    <Link
                      to={`/app/profile/${c.user_id}`}
                      className="group block bg-surface rounded-xl border border-surface-border shadow-card p-5 hover:border-violet-500/50 hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-200"
                    >
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <p className="text-[15px] font-semibold text-ink-950 truncate">{c.display_name}</p>
                        <ArrowUpRight size={14} className="text-ink-300 group-hover:text-violet-600 transition-colors shrink-0" />
                      </div>
                      {c.headline && <p className="text-[12.5px] text-ink-500 truncate">{c.headline}</p>}
                      {(c.skills || []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2.5">
                          {(c.skills || []).slice(0, 3).map((sk) => (
                            <span key={sk} className="text-[11px] px-2 py-0.5 rounded-md bg-surface-muted text-ink-700">{sk}</span>
                          ))}
                        </div>
                      )}
                    </Link>
                  </motion.div>
                ))}
          </div>
        </>
      )}
    </Shell>
  );
}
