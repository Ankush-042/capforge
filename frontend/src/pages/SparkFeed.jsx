import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Plus, Flame, ArrowUpRight } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import { listSparks } from '../services/startups.js';

function timeAgo(iso) {
  if (!iso) return null;
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return 'just now';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/**
 * The Spark Feed. Phase 2, The First Act.
 *
 * This is deliberately NOT the Opportunities screen. Opportunities ranks
 * candidates against diagnosed gaps at companies that already exist. This
 * shows raw ideas from people who have not started yet, ordered by recency
 * rather than by any matching score, because the whole point is vision-first
 * browsing: you read the idea and decide if you care, rather than being told
 * how well your skills overlap.
 */
export default function SparkFeed() {
  const [loading, setLoading] = useState(true);
  const [sparks, setSparks] = useState([]);

  useEffect(() => {
    async function load() {
      const { ok, data } = await listSparks();
      if (ok && data.success) setSparks(data.sparks);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <Shell title="Sparks"><div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" /></div></Shell>;
  }

  return (
    <Shell title="Sparks" subtitle="Ideas before they are companies">
      <div className="relative overflow-hidden rounded-xl bg-ink-950 p-8 mb-8">
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle at 15% 30%, #7C5CFC 0%, transparent 50%), radial-gradient(circle at 85% 70%, #1F5D52 0%, transparent 50%)' }} />
        <div className="relative flex items-start justify-between gap-6 flex-wrap">
          <div className="max-w-lg">
            <p className="flex items-center gap-2 text-xs font-medium tracking-[0.14em] uppercase text-mint-500 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-mint-500" />Before the company exists
            </p>
            <h2 className="font-display text-[26px] lg:text-[32px] font-semibold text-white leading-tight">
              Someone here is thinking about the same problem <span className="italic font-normal text-mint-500">you are.</span>
            </h2>
            <p className="text-[15px] text-white/60 mt-3 leading-relaxed">
              These are not job listings. They are raw ideas from people looking for someone to build with. Read them properly. If one lands, say so.
            </p>
          </div>
          <Link to="/app/sparks/new" className="group flex items-center gap-2 bg-white hover:bg-white/90 text-ink-950 rounded-full pl-5 pr-2 py-2 font-medium transition-colors shrink-0">
            Share your idea
            <span className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-ink-950/10">
              <Plus size={15} className="transition-transform duration-300 group-hover:rotate-90" />
            </span>
          </Link>
        </div>
      </div>

      {sparks.length === 0 ? (
        <div className="text-center py-20 bg-surface rounded-xl border border-surface-border shadow-card">
          <Flame size={32} className="mx-auto text-violet-500 mb-4" />
          <p className="text-lg font-semibold text-ink-900 mb-2">No sparks yet</p>
          <p className="text-[15px] text-ink-500 mb-6 max-w-sm mx-auto">Be the first. Share the thing you cannot stop thinking about, before it is polished.</p>
          <Link to="/app/sparks/new" className="inline-flex items-center gap-2 bg-ink-900 hover:bg-ink-700 text-white px-6 py-3 rounded-full font-medium transition-colors">
            Share your idea <ArrowUpRight size={15} />
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {sparks.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: Math.min(i * 0.06, 0.4), ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -5 }}
              className="group relative"
            >
              <Link to={`/app/sparks/${s.id}`} className="block h-full bg-surface rounded-xl border border-surface-border p-7 shadow-card hover:shadow-elevated hover:border-violet-500/40 transition-all duration-300">
                <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-xl bg-gradient-to-r from-violet-500 to-forest-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-medium tracking-wide uppercase text-violet-600 bg-violet-50 px-2.5 py-1 rounded-md">
                    {s.status === 'FORMING' ? 'Forming' : 'Open'}
                  </span>
                  {parseInt(s.resonance_count) > 0 && (
                    <span className="flex items-center gap-1.5 text-xs text-ink-500">
                      <Flame size={13} className="text-violet-500" />
                      {s.resonance_count} {parseInt(s.resonance_count) === 1 ? 'person wants in' : 'people want in'}
                    </span>
                  )}
                </div>
                <p className="font-display text-xl font-semibold text-ink-900 leading-snug mb-3">{s.title}</p>
                <p className="text-[15px] text-ink-700 leading-relaxed line-clamp-4">{s.the_idea}</p>
                {s.looking_for && (
                  <div className="mt-5 pt-4 border-t border-surface-border">
                    <p className="text-[11px] font-medium tracking-wide uppercase text-ink-300 mb-1.5">Looking for</p>
                    <p className="text-[14px] text-ink-700 line-clamp-2">{s.looking_for}</p>
                  </div>
                )}
                <div className="mt-5 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center text-[11px] font-semibold text-violet-700">
                    {s.author_name?.[0]?.toUpperCase()}
                  </div>
                  <span className="text-[13px] text-ink-500">{s.author_name}</span>
                  {timeAgo(s.created_at) && <span className="text-[12px] text-ink-300">· {timeAgo(s.created_at)}</span>}
                  {s.viewer_resonated && <span className="ml-auto text-[12px] font-medium text-forest-600">You are in on this</span>}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </Shell>
  );
}
