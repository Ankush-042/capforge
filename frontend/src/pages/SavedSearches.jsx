import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Bookmark, Play, Trash2, ArrowUpRight, Search } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import { getMySavedSearches, runSavedSearch, deleteSavedSearch } from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';

/**
 * The theses you are tracking.
 *
 * This rendered filters as raw key-value pairs: "domain: fintech · stage:
 * Seed". That is a database row, not a thesis. An investor saves a search
 * because it represents a bet they are watching, and the page should read
 * that way.
 *
 * Results also appeared in a box below the list, so running two searches in
 * a row silently replaced the first with no indication which you were
 * looking at.
 */

const FILTER_LABEL = {
  domain: 'in',
  stage: 'at',
  funding_stage: 'raising',
  min_readiness: 'above readiness',
  query: 'matching',
};

function describeFilters(filters) {
  const entries = Object.entries(filters || {}).filter(([, v]) => v !== null && v !== '' && v !== undefined);
  if (entries.length === 0) return 'Everything, unfiltered';
  return entries
    .map(([k, v]) => `${FILTER_LABEL[k] || k} ${Array.isArray(v) ? v.join(', ') : v}`)
    .join(' · ');
}

export default function SavedSearches() {
  const showToast = useToast();
  const [loading, setLoading] = useState(true);
  const [searches, setSearches] = useState([]);
  const [results, setResults] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [running, setRunning] = useState(null);

  async function load() {
    const { ok, data } = await getMySavedSearches();
    if (ok && data.success) setSearches(data.savedSearches);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function handleRun(s) {
    setRunning(s.id);
    const { ok, data } = await runSavedSearch(s.id);
    setRunning(null);
    if (ok && data.success) { setResults(data.results); setActiveId(s.id); }
    else showToast(data.error || 'Could not run that search.', 'error');
  }

  async function handleDelete(id) {
    const { ok, data } = await deleteSavedSearch(id);
    if (ok && data.success) {
      if (activeId === id) { setResults(null); setActiveId(null); }
      showToast('Removed.');
      await load();
    }
  }

  if (loading) {
    return (
      <Shell persona="INVESTOR" title="Saved searches">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" />
        </div>
      </Shell>
    );
  }

  const active = searches.find((s) => s.id === activeId) || null;

  return (
    <Shell persona="INVESTOR" title="Saved searches" subtitle="The theses you are tracking">
      <div className="mb-7">
        <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-violet-600 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
          {searches.length === 0 ? 'Nothing saved' : `${searches.length} being tracked`}
        </p>
        <h1 className="font-editorial italic text-[32px] text-trust-fg leading-tight max-w-3xl">
          {searches.length === 0
            ? 'You are not tracking anything yet.'
            : 'Run these whenever you want to see what has changed.'}
        </h1>
        <p className="text-[15px] text-ink-700 mt-3 max-w-2xl leading-relaxed">
          A saved search is a bet you are watching. New ventures cross the readiness bar constantly, so what returns nothing today may return something next month.
        </p>
      </div>

      {searches.length === 0 ? (
        <div className="bg-surface rounded-xl border border-surface-border shadow-card py-16 text-center">
          <Bookmark size={22} className="text-ink-300 mx-auto mb-3" />
          <p className="text-[15px] text-ink-700 mb-1">Nothing saved yet.</p>
          <p className="text-[13px] text-ink-500 mb-6 max-w-sm mx-auto">
            Search for what you are looking for, then save it. It stays here and you can re-run it any time.
          </p>
          <Link
            to="/app/search"
            className="inline-flex items-center gap-2 text-[13px] font-medium bg-ink-900 hover:bg-ink-700 text-white px-5 py-2.5 rounded-full transition-colors"
          >
            <Search size={14} /> Start a search
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 mb-8">
            {searches.map((s, i) => {
              const isActive = s.id === activeId;
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.25) }}
                  className={`relative overflow-hidden bg-surface rounded-xl border shadow-card p-5 pl-6 transition-all duration-200 ${
                    isActive ? 'border-violet-500/50' : 'border-surface-border'
                  }`}
                >
                  <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: isActive ? '#7C5CFC' : '#E4E3EC' }} />
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold text-ink-950 truncate">{s.name}</p>
                      <p className="text-[12.5px] text-ink-500 mt-1 leading-snug">{describeFilters(s.filters)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleRun(s)}
                        disabled={running === s.id}
                        className="flex items-center gap-1.5 text-[12.5px] font-medium bg-ink-900 hover:bg-ink-700 text-white px-3.5 py-1.5 rounded-full transition-colors disabled:opacity-50"
                      >
                        <Play size={11} /> {running === s.id ? 'Running…' : 'Run'}
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="text-ink-300 hover:text-signal-critical p-1.5 transition-colors"
                        aria-label={`Remove ${s.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {results && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
              <div className="flex items-baseline justify-between mb-3">
                <div>
                  {/* Which search these belong to. Running two in a row used
                      to silently replace the first with no indication. */}
                  <h2 className="text-[15px] font-semibold text-ink-900">
                    {results.length === 0 ? 'Nothing matches' : `${results.length} match${results.length === 1 ? 'es' : ''}`} “{active?.name}”
                  </h2>
                  {active && <p className="text-[13px] text-ink-500 mt-0.5">{describeFilters(active.filters)}</p>}
                </div>
                <button onClick={() => { setResults(null); setActiveId(null); }} className="text-[13px] text-ink-500 hover:text-ink-900 transition-colors">
                  Clear
                </button>
              </div>

              {results.length === 0 ? (
                <div className="bg-surface rounded-xl border border-surface-border shadow-card py-12 text-center">
                  <p className="text-[14px] text-ink-700 mb-1">Nothing matches this today.</p>
                  <p className="text-[13px] text-ink-500">Worth re-running. Ventures cross the readiness bar all the time.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {results.map((s) => (
                    <Link
                      key={s.id}
                      to={`/app/startups/${s.id}`}
                      className="group bg-surface rounded-xl border border-surface-border shadow-card p-5 hover:border-violet-500/50 hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-200"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-[14.5px] font-semibold text-ink-950 truncate">{s.name}</p>
                        <ArrowUpRight size={14} className="text-ink-300 group-hover:text-violet-600 transition-colors shrink-0" />
                      </div>
                      <p className="text-[12.5px] text-ink-500 mt-1 truncate">{(s.domain || []).slice(0, 2).join(' · ')}</p>
                      {s.stage && <p className="text-[12px] text-ink-300 mt-1.5">{s.stage}</p>}
                    </Link>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </>
      )}
    </Shell>
  );
}
