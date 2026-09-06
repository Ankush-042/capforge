import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Play, Trash2 } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import PageHeader from '../components/PageHeader.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { getMySavedSearches, runSavedSearch, deleteSavedSearch } from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';

export default function SavedSearches() {
  const showToast = useToast();
  const [loading, setLoading] = useState(true);
  const [searches, setSearches] = useState([]);
  const [results, setResults] = useState(null);
  const [activeSearchName, setActiveSearchName] = useState(null);

  async function load() {
    const { ok, data } = await getMySavedSearches();
    if (ok && data.success) setSearches(data.savedSearches);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function handleRun(s) {
    const { ok, data } = await runSavedSearch(s.id);
    if (ok && data.success) { setResults(data.results); setActiveSearchName(s.name); }
    else showToast(data.error || 'Could not run search.', 'error');
  }

  async function handleDelete(id) {
    const { ok, data } = await deleteSavedSearch(id);
    if (ok && data.success) { showToast('Saved search removed.'); await load(); }
  }

  if (loading) return <Shell persona="INVESTOR" title="Saved Searches"><div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" /></div></Shell>;

  return (
    <Shell persona="INVESTOR" title="Saved Searches">
      <PageHeader icon={Bookmark} iconBg="bg-amber-50" iconColor="text-amber-500" title="Saved searches" subtitle="Real, re-runnable — the way real angels/VCs track a thesis over time." />

      {searches.length === 0 ? (
        <div className="bg-white rounded-xl border border-surface-border shadow-card">
          <EmptyState icon={Bookmark} message="No saved searches yet — save one from the Search page." />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-surface-border shadow-card mb-6">
          {searches.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-5 border-b border-surface-border last:border-0">
              <div>
                <p className="text-[15px] font-medium text-ink-900">{s.name}</p>
                <p className="text-[13px] text-ink-500">{Object.entries(s.filters).map(([k, v]) => `${k}: ${v}`).join(' · ') || 'No filters'}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleRun(s)} className="flex items-center gap-1.5 text-xs bg-violet-50 text-violet-700 px-3 py-1.5 rounded-lg font-medium hover:bg-violet-100 transition-colors"><Play size={12} /> Run</button>
                <button onClick={() => handleDelete(s.id)} className="text-xs text-ink-300 hover:text-signal-critical px-2 transition-colors"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {results && (
        <div className="bg-white rounded-xl border border-surface-border shadow-card p-7">
          <p className="text-[15px] font-semibold text-ink-900 mb-4">Results for "{activeSearchName}" — {results.length} found</p>
          {results.length === 0 ? <p className="text-[13px] text-ink-500 text-center py-6">No matches right now.</p> : results.map((s) => (
            <Link to={`/app/startups/${s.id}`} key={s.id} className="flex items-center justify-between py-3 border-b border-surface-border last:border-0 hover:bg-surface-muted/50 -mx-1 px-1 rounded-lg transition-colors">
              <div><p className="text-[15px] text-ink-900">{s.name}</p><p className="text-[13px] text-ink-500">{(s.domain || []).join(', ')} · {s.stage}</p></div>
            </Link>
          ))}
        </div>
      )}
    </Shell>
  );
}
