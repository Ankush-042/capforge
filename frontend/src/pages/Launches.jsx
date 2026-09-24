import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowUpRight, Check, Plus } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import { useMyIdentity } from '../context/MyIdentityContext.jsx';
import Avatar from '../components/Avatar.jsx';
import { listLaunches } from '../services/startups.js';

/**
 * Things you can actually try.
 *
 * Until now a venture could hire, pitch or post an idea, but could not ask
 * anybody to USE what it built, so every founder went off-platform for their
 * first users while sitting inside a network of people who care about exactly
 * their field.
 *
 * The feed leads with what is unanswered rather than what is newest. A launch
 * with no feedback is the one that needs somebody, and burying it under three
 * popular ones is how a board like this dies.
 */

const STATE_LABEL = {
  CONCEPT: 'Nothing to click yet',
  INTERFACE: 'Clickable, nothing behind it',
  PROTOTYPE: 'Partly working',
  LIVE: 'Live and usable',
};
const STATE_TONE = {
  CONCEPT: '#8A8A99',
  INTERFACE: '#7C5CFC',
  PROTOTYPE: '#C58A00',
  LIVE: '#3FB081',
};

function ago(iso) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'yesterday' : `${d}d ago`;
}

function LaunchCard({ l, index }) {
  const tone = STATE_TONE[l.state] || '#8A8A99';
  const needsPeople = l.people_count === 0 && !l.closed_at;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.3), ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        to={`/app/launches/${l.id}`}
        className={`group block bg-surface rounded-xl border shadow-card overflow-hidden transition-all duration-200 hover:shadow-elevated hover:-translate-y-0.5 ${
          needsPeople ? 'border-violet-500/40' : 'border-surface-border'
        }`}
      >
        {l.cover && (
          <div className="h-40 bg-surface-muted overflow-hidden">
            <img src={l.cover} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="min-w-0">
              <p className="text-[16px] font-semibold text-ink-950 leading-snug">{l.title}</p>
              <p className="text-[12.5px] text-ink-500 mt-0.5">
                {l.startup_name} · {(l.domain || []).slice(0, 2).join(' · ')}
              </p>
            </div>
            <ArrowUpRight size={16} className="text-ink-300 group-hover:text-violet-600 transition-colors shrink-0 mt-0.5" />
          </div>

          <p className="text-[13.5px] text-ink-700 leading-relaxed line-clamp-2 mb-4">{l.summary}</p>

          <div className="flex items-center justify-between gap-3 pt-4 border-t border-surface-border">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar name={l.founder_name} src={l.founder_avatar} size={22} />
              <span className="text-[12.5px] text-ink-500 truncate">{l.founder_name}</span>
              <span className="text-[12px] text-ink-300 shrink-0">{ago(l.posted_at)}</span>
            </div>

            <span className="text-[11.5px] font-medium shrink-0" style={{ color: tone }}>
              {STATE_LABEL[l.state]}
            </span>
          </div>

          <div className="flex items-center gap-4 mt-3">
            {l.closed_at ? (
              <span className="text-[12.5px] text-ink-300">No longer collecting feedback</span>
            ) : needsPeople ? (
              <span className="text-[12.5px] font-medium text-violet-700">Nobody has tried this yet</span>
            ) : (
              <span className="text-[12.5px] text-ink-500">
                {l.people_count} {l.people_count === 1 ? 'person' : 'people'} talking
                {l.tried_count > 0 && `, ${l.tried_count} actually opened it`}
              </span>
            )}
            {l.you_joined && (
              <span className="flex items-center gap-1 text-[12.5px] text-mint-500 ml-auto">
                <Check size={12} /> You joined in
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function Launches() {
  const { persona } = useMyIdentity();
  const [loading, setLoading] = useState(true);
  const [launches, setLaunches] = useState([]);

  useEffect(() => {
    listLaunches().then(({ ok, data }) => {
      if (ok && data.success) setLaunches(data.launches);
      setLoading(false);
    });
  }, []);

  // Unanswered first. A launch nobody has tried is the one that needs
  // somebody, and recency ordering buries exactly those.
  const open = launches.filter((l) => !l.closed_at);
  const needsPeople = open.filter((l) => l.people_count === 0);
  const inProgress = open.filter((l) => l.people_count > 0);
  const closed = launches.filter((l) => l.closed_at);

  if (loading) {
    return (
      <Shell persona={persona} title="Try things">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" />
        </div>
      </Shell>
    );
  }

  return (
    <Shell persona={persona} title="Try things" subtitle="Real products, asking for honest reactions">
      <div className="mb-7">
        <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-violet-600 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
          {launches.length === 0 ? 'Nothing yet' : `${open.length} open`}
        </p>
        <h1 className="font-editorial italic text-[32px] text-trust-fg leading-tight max-w-3xl">
          {needsPeople.length > 0
            ? `${needsPeople.length} ${needsPeople.length === 1 ? 'venture is' : 'ventures are'} waiting for the first person to try ${needsPeople.length === 1 ? 'it' : 'them'}.`
            : launches.length === 0
              ? 'Nobody has put anything up yet.'
              : 'Everything here has somebody looking at it.'}
        </h1>
        <p className="text-[15px] text-ink-700 mt-3 max-w-2xl leading-relaxed">
          Open it, use it properly, and say what actually happened. What broke, what confused you,
          whether you would come back. That is worth more to a founder than encouragement.
        </p>

        {persona === 'FOUNDER' && (
          <Link
            to="/app/launches/new"
            className="inline-flex items-center gap-2 mt-5 bg-ink-900 hover:bg-ink-700 text-white px-5 py-2.5 rounded-full text-[14px] font-medium transition-colors"
          >
            <Plus size={15} /> Put something up
          </Link>
        )}
      </div>

      {launches.length === 0 ? (
        <div className="bg-surface rounded-xl border border-surface-border shadow-card py-16 text-center">
          <p className="text-[15px] text-ink-700 mb-1">Nothing has been put up yet.</p>
          <p className="text-[13px] text-ink-500 max-w-sm mx-auto">
            When a founder here has something to show, it appears on this page and you can try it.
          </p>
        </div>
      ) : (
        <>
          {needsPeople.length > 0 && (
            <div className="mb-9">
              <h2 className="text-[15px] font-semibold text-ink-900 mb-1">Nobody has tried these</h2>
              <p className="text-[13px] text-ink-500 mb-4">Being the first to open it and say what happened is the most useful you can be here.</p>
              <div className="grid grid-cols-2 gap-5">
                {needsPeople.map((l, i) => <LaunchCard key={l.id} l={l} index={i} />)}
              </div>
            </div>
          )}

          {inProgress.length > 0 && (
            <div className="mb-9">
              <h2 className="text-[15px] font-semibold text-ink-900 mb-4">Being talked about</h2>
              <div className="grid grid-cols-2 gap-5">
                {inProgress.map((l, i) => <LaunchCard key={l.id} l={l} index={i} />)}
              </div>
            </div>
          )}

          {closed.length > 0 && (
            <div>
              <h2 className="text-[15px] font-semibold text-ink-900 mb-4">Finished collecting</h2>
              <div className="grid grid-cols-2 gap-5">
                {closed.map((l, i) => <LaunchCard key={l.id} l={l} index={i} />)}
              </div>
            </div>
          )}
        </>
      )}
    </Shell>
  );
}
