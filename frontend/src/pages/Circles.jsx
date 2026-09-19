import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowUpRight, MessageSquare } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import { listRooms } from '../services/startups.js';

/**
 * The rooms that exist.
 *
 * Derived from the domains actually in use, not a hardcoded list, so a venture
 * in a field nobody anticipated gets a room automatically.
 *
 * Ordered by yours first, then by what is alive. A room nobody has posted in
 * sits below one that is moving, because the honest signal of a room is
 * whether anything is happening in it.
 */

function ago(iso) {
  if (!iso) return null;
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'yesterday' : `${d}d ago`;
}

export default function Circles() {
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    listRooms().then(({ ok, data }) => {
      if (ok && data.success) setRooms(data.rooms);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <Shell title="Rooms">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" />
        </div>
      </Shell>
    );
  }

  const yours = rooms.filter((r) => r.yours);
  const rest = rooms.filter((r) => !r.yours);

  return (
    <Shell title="Rooms" subtitle="People in your field, talking">
      <div className="mb-7">
        <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-violet-600 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
          {rooms.length === 0 ? 'Nothing yet' : `${rooms.length} ${rooms.length === 1 ? 'circle' : 'circles'}`}
        </p>
        <h1 className="font-editorial italic text-[32px] text-trust-fg leading-tight max-w-3xl">
          Everywhere else asks you to commit. Here you can just talk.
        </h1>
        <p className="text-[15px] text-ink-700 mt-3 max-w-2xl leading-relaxed">
          People in the same field, working through the same things. Founders, contributors and investors together, because the person who can answer you is usually on the other side of the table.
        </p>
      </div>

      {rooms.length === 0 ? (
        <div className="bg-surface rounded-xl border border-surface-border shadow-card py-16 text-center">
          <MessageSquare size={22} className="text-ink-300 mx-auto mb-3" />
          <p className="text-[15px] text-ink-700 mb-1">No circles yet.</p>
          <p className="text-[13px] text-ink-500 max-w-sm mx-auto">
            A circle appears once a few people are genuinely in that field. Pick the fields you care about and yours will show up.
          </p>
        </div>
      ) : (
        <>
          {yours.length > 0 && (
            <div className="mb-8">
              <h2 className="text-[15px] font-semibold text-ink-900 mb-3">Yours</h2>
              <div className="grid grid-cols-2 gap-4">
                {yours.map((r, i) => <RoomCard key={r.room} r={r} index={i} highlight />)}
              </div>
            </div>
          )}
          {rest.length > 0 && (
            <div>
              <h2 className="text-[15px] font-semibold text-ink-900 mb-3">
                {yours.length > 0 ? 'Everywhere else' : 'All circles'}
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {rest.map((r, i) => <RoomCard key={r.room} r={r} index={i} />)}
              </div>
            </div>
          )}
        </>
      )}
    </Shell>
  );
}

function RoomCard({ r, index, highlight }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.25) }}
    >
      <Link
        to={`/app/circles/${encodeURIComponent(r.room)}`}
        className="group relative block rounded-2xl overflow-hidden p-6 transition-all duration-200 hover:-translate-y-0.5"
        style={{ backgroundColor: '#14121C' }}
      >
        {/* The card previews where you are going: same depth, same warmth as
            the circle itself, so entering one feels continuous rather than
            like a page swap. */}
        <div
          className="absolute inset-0 opacity-[0.5] group-hover:opacity-[0.7] transition-opacity pointer-events-none"
          style={{ backgroundImage: highlight
            ? 'radial-gradient(ellipse 90% 70% at 0% 0%, #6D28D9 0%, transparent 62%), radial-gradient(ellipse 70% 60% at 100% 100%, #1F5D52 0%, transparent 62%)'
            : 'radial-gradient(ellipse 90% 70% at 0% 0%, #3E3A52 0%, transparent 62%)' }}
        />
        <div className="relative">
          <div className="flex items-start justify-between gap-3 mb-2.5">
            <p className="text-[18px] font-semibold text-white capitalize leading-tight">{r.room}</p>
            <ArrowUpRight size={16} className="text-white/25 group-hover:text-white/70 transition-colors shrink-0 mt-0.5" />
          </div>

          <p className="text-[13.5px] text-white/45">
            {r.posts === 0 ? 'Nothing said yet' : `${r.posts} ${r.posts === 1 ? 'post' : 'posts'}`}
            {r.last_post_at && ` · last ${ago(r.last_post_at)}`}
          </p>

          {/* Who was around, not how many are members. A place feels alive
              when somebody else was here today. */}
          <p className="text-[12.5px] mt-1.5" style={{ color: r.recently_around > 0 ? '#3FB081' : 'rgba(255,255,255,0.25)' }}>
            {r.recently_around > 0
              ? `${r.recently_around} here recently`
              : `${r.people} in this field`}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}
