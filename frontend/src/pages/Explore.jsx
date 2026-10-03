import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Search as SearchIcon, Sparkles, Bookmark, BookmarkCheck, Users, ArrowUpRight, MessageSquare } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Avatar from '../components/Avatar.jsx';
import SkeletonPage from '../components/Skeleton.jsx';
import {
  searchStartups, semanticSearchStartups, getWatchlist, setWatchStatus, startConversation,
} from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';

/**
 * Explore, which replaces Saved searches.
 *
 * WHAT WAS WRONG. Saved searches was a saved-query manager: you built a
 * query, named it, and it sat in a list waiting to be re-run. Nobody does
 * that. What an investor actually wants is to look through what exists and
 * keep the ones worth following, and the product already has somewhere for
 * the second half to go — the watchlist, which Tracking reads and which now
 * drives the "moved since you marked them" block on deal flow.
 *
 * It also carried Ventures and People tabs. An investor is looking for
 * ventures. Searching people was a feature inherited from a shared page
 * rather than anything this persona needs.
 *
 * SO: browse by field, search by meaning, and save anything to track. Saving
 * here feeds something real rather than a list that only ever waits.
 *
 * ACCURACY OVER VOLUME, as everywhere else. Semantic search cuts where
 * relevance stops rather than returning a full page regardless, and a field
 * filter uses the same matcher the engine uses, so choosing healthtech finds
 * a venture the model labelled 'medical technology'.
 */

const DOMAINS = ['healthtech', 'fintech', 'edtech', 'climate', 'saas', 'cybersecurity',
  'logistics', 'proptech', 'hr tech', 'legal tech', 'biotech', 'creator economy', 'marketing'];

const STAGES = ['Idea', 'Prototype', 'MVP', 'Early Traction'];

function VentureRow({ v, watched, onToggle, index, onMessage }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.2) }}
      className="bg-surface rounded-xl border border-surface-border shadow-card p-6 hover:shadow-elevated transition-shadow"
    >
      {/* MATCHED TO THE CONTRIBUTOR CARD. This showed a name, three grey
          domain tags and a problem line, while the equivalent card on the
          contributor side carried the founder, the team, the stage and the
          readiness. The data was one join away and was simply not selected.
          The two sides of the product should not look like different
          products. */}
      <div className="flex items-start justify-between gap-5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5 mb-1 flex-wrap">
            <Link to={`/app/startups/${v.id}`} className="text-[16.5px] font-semibold text-ink-950 hover:text-violet-700 transition-colors">
              {v.name}
            </Link>
            {(v.domain || [])[0] && (
              <span className="text-[11px] font-medium text-violet-700 bg-violet-50 px-2 py-0.5 rounded">
                {(v.domain || [])[0]}
              </span>
            )}
          </div>

          <p className="text-[13.5px] text-ink-700 leading-relaxed line-clamp-2">{v.problem}</p>

          <div className="flex items-center gap-4 mt-3 flex-wrap">
            <span className="flex items-center gap-1.5 text-[12.5px] text-ink-500">
              <Users size={12} />
              <span className="font-medium text-ink-800 tabular-nums">{v.team_size ?? 0}</span> on the team
            </span>
            {v.stage && <span className="text-[12.5px] text-ink-500">{v.stage}</span>}
            {v.readiness !== null && v.readiness !== undefined && (
              <span className="text-[12.5px] text-ink-500">
                readiness <span className="font-medium text-ink-800 tabular-nums">{Math.round(parseFloat(v.readiness))}</span>
              </span>
            )}
            {(v.domain || []).length > 1 && (
              <span className="text-[12px] text-ink-300 truncate">{(v.domain || []).slice(1, 3).join(' · ')}</span>
            )}
          </div>
        </div>

        <button
          onClick={() => onToggle(v)}
          className={`shrink-0 flex items-center gap-1.5 text-[13px] font-medium px-3.5 py-2 rounded-full border transition-colors ${
            watched
              ? 'border-mint-500/40 text-mint-500 bg-mint-500/5'
              : 'border-surface-border text-ink-500 hover:border-ink-300 hover:text-ink-900'
          }`}
          title={watched ? 'You are tracking this' : 'Track this venture'}
        >
          {watched ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
          {watched ? 'Tracking' : 'Track'}
        </button>
      </div>

      <div className="flex items-center gap-4 mt-5 pt-4 border-t border-surface-border">
        <button
          onClick={() => onMessage(v)}
          className="flex items-center gap-1.5 text-[13.5px] font-medium bg-ink-900 hover:bg-ink-700 text-white px-4 py-2 rounded-full transition-colors"
        >
          <MessageSquare size={13} /> Write to {v.founder_name?.split(' ')[0] || 'the founder'}
        </button>
        <Link to={`/app/startups/${v.id}`} className="flex items-center gap-1 text-[13.5px] text-ink-500 hover:text-violet-700 transition-colors">
          Look properly <ArrowUpRight size={13} />
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <Avatar name={v.founder_name} src={v.founder_avatar} size={22} />
          <span className="text-[12.5px] text-ink-500">{v.founder_name}</span>
        </div>
      </div>
    </motion.div>
  );
}

export default function Explore() {
  const navigate = useNavigate();
  const showToast = useToast();
  const [query, setQuery] = useState('');
  const [domain, setDomain] = useState('');
  const [stage, setStage] = useState('');
  const [byMeaning, setByMeaning] = useState(false);

  const [results, setResults] = useState([]);
  const [cutOff, setCutOff] = useState(0);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(true);
  const [watching, setWatching] = useState(new Set());

  async function loadWatchlist() {
    const { ok, data } = await getWatchlist();
    if (ok && data.success) {
      setWatching(new Set((data.watchlist || [])
        .filter((w) => w.status === 'WATCHING').map((w) => w.startupId)));
    }
  }

  // Open on everything rather than on an empty box. A blank page with a
  // search field makes somebody invent a query before they know what is here.
  useEffect(() => {
    (async () => {
      await loadWatchlist();
      const { ok, data } = await searchStartups({});
      if (ok && data.success) setResults(data.results || []);
      setLoading(false);
    })();
  }, []);

  async function run(overrides = {}) {
    setLoading(true);
    setSearched(true);
    const d = overrides.domain !== undefined ? overrides.domain : domain;
    const st = overrides.stage !== undefined ? overrides.stage : stage;
    const q = overrides.query !== undefined ? overrides.query : query;

    const res = (byMeaning && q.trim())
      ? await semanticSearchStartups(q.trim(), d || undefined)
      : await searchStartups({ ...(q ? { q } : {}), ...(d ? { domain: d } : {}), ...(st ? { stage: st } : {}) });

    setResults(res.ok && res.data.success ? (res.data.results || []) : []);
    setCutOff(res.ok && res.data.success ? (res.data.cutOff || 0) : 0);
    setLoading(false);
  }

  async function message(v) {
    const { ok, data } = await startConversation(v.founder_id, { startupId: v.id });
    if (ok && data?.success) { navigate(`/app/inbox/${data.conversation.id}`); return; }
    showToast('Could not open that conversation.', 'error');
  }

  async function toggleWatch(v) {
    const already = watching.has(v.id);
    const { ok } = await setWatchStatus(v.id, already ? 'PASSED' : 'WATCHING', null);
    if (!ok) { showToast('Could not save that.', 'error'); return; }
    setWatching((prev) => {
      const next = new Set(prev);
      already ? next.delete(v.id) : next.add(v.id);
      return next;
    });
    showToast(already ? 'No longer tracking.' : 'Tracking. Movement shows on your deal flow.');
  }

  return (
    <Shell persona="INVESTOR" title="Explore" subtitle="Everything being built here">
      <div className="mb-7">
        <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-violet-600 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
          {watching.size > 0 ? `${watching.size} tracked` : 'Nothing tracked yet'}
        </p>
        <h1 className="font-editorial italic text-[32px] text-trust-fg leading-tight max-w-3xl">
          Look through everything, not only what matched you.
        </h1>
        <p className="text-[15px] text-ink-700 mt-3 max-w-2xl leading-relaxed">
          Deal flow ranks ventures against your thesis. This does not rank anything: it is
          every venture on the platform, for when you want to look rather than be shown.
          Track anything worth following and its movement appears on your deal flow.
        </p>
      </div>

      {/* ONE ROW OF CONTROLS, all of which take effect immediately. */}
      <div className="flex items-center gap-2.5 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[280px]">
          <SearchIcon size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-300" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && run()}
            placeholder={byMeaning ? 'Describe the kind of venture you want to back' : 'Search names and problems'}
            className="w-full pl-11 pr-4 py-2.5 rounded-full border border-surface-border bg-surface text-[14px] text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>

        <select
          value={domain}
          onChange={(e) => { setDomain(e.target.value); run({ domain: e.target.value }); }}
          className="text-[13px] px-4 py-2.5 rounded-full border border-surface-border bg-surface text-ink-900 focus:outline-none focus:border-violet-500 transition-colors"
        >
          <option value="">Any field</option>
          {DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>

        <select
          value={stage}
          onChange={(e) => { setStage(e.target.value); run({ stage: e.target.value }); }}
          className="text-[13px] px-4 py-2.5 rounded-full border border-surface-border bg-surface text-ink-900 focus:outline-none focus:border-violet-500 transition-colors"
        >
          <option value="">Any stage</option>
          {STAGES.map((st) => <option key={st} value={st}>{st}</option>)}
        </select>

        <button
          onClick={() => { setByMeaning(!byMeaning); if (query.trim()) run(); }}
          className={`flex items-center gap-1.5 text-[13px] font-medium px-4 py-2.5 rounded-full border transition-colors ${
            byMeaning ? 'bg-violet-500 text-white border-violet-500' : 'border-surface-border text-ink-700 hover:border-ink-300'
          }`}
        >
          <Sparkles size={13} /> By meaning
        </button>
      </div>

      <p className="text-[13px] text-ink-500 mb-6 max-w-2xl leading-relaxed">
        {byMeaning
          ? 'Describe what you are after and this finds ventures that mean the same thing rather than ones using the same words. Anything below a real level of relevance is left out instead of padding the page.'
          : 'Matches names and problems exactly. For a description of the kind of venture you want rather than its words, switch to by meaning.'}
      </p>

      {loading ? (
        <SkeletonPage cards={3} />
      ) : results.length === 0 ? (
        <EmptyState
          icon={SearchIcon}
          title={byMeaning ? 'Nothing here is about that.' : 'Nothing matches those filters.'}
          body={byMeaning
            ? 'Results below a real level of relevance are left out rather than padded, so an empty answer means the ventures are not here yet.'
            : 'Try a different field, or clear a filter.'}
        />
      ) : (
        <>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-[15px] font-semibold text-ink-900">
              {results.length} {results.length === 1 ? 'venture' : 'ventures'}
              {byMeaning && cutOff > 0 && (
                <span className="font-normal text-ink-500"> · {cutOff} less relevant left out</span>
              )}
            </h2>
            {!searched && <span className="text-[13px] text-ink-500">Everything on the platform</span>}
          </div>

          <div className="space-y-4">
            {results.map((v, i) => (
              <VentureRow
                key={v.id}
                v={v}
                index={i}
                watched={watching.has(v.id)}
                onToggle={toggleWatch}
                onMessage={message}
              />
            ))}
          </div>
        </>
      )}
    </Shell>
  );
}
