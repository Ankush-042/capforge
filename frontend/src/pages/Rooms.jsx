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

export default function Rooms() {
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
          {rooms.length === 0 ? 'Nothing yet' : `${rooms.length} ${rooms.length === 1 ? 'room' : 'rooms'}`}
        </p>
        <h1 className="font-editorial italic text-[32px] text-trust-fg leading-tight max-w-3xl">
          Everything else here asks you to commit. This does not.
        </h1>
        <p className="text-[15px] text-ink-700 mt-3 max-w-2xl leading-relaxed">
          Somewhere to say what you are actually stuck on, to people in the same field. Founders, contributors and investors in the same room, because the person who can answer you is usually on the other side of the table.
        </p>
      </div>

      {rooms.length === 0 ? (
        <div className="bg-surface rounded-xl border border-surface-border shadow-card py-16 text-center">
          <MessageSquare size={22} className="text-ink-300 mx-auto mb-3" />
          <p className="text-[15px] text-ink-700 mb-1">No rooms yet.</p>
          <p className="text-[13px] text-ink-500 max-w-sm mx-auto">
            Rooms appear for a field once a few people are actually in it. Pick the fields you care about and yours will show up.
          </p>
        </div>
      ) : (
        <>
          {yours.length > 0 && (
            <div className="mb-8">
              <h2 className="text-[15px] font-semibold text-ink-900 mb-3">Your fields</h2>
              <div className="grid grid-cols-2 gap-4">
                {yours.map((r, i) => <RoomCard key={r.room} r={r} index={i} highlight />)}
              </div>
            </div>
          )}
          {rest.length > 0 && (
            <div>
              <h2 className="text-[15px] font-semibold text-ink-900 mb-3">
                {yours.length > 0 ? 'Everywhere else' : 'All rooms'}
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
        to={`/app/rooms/${encodeURIComponent(r.room)}`}
        className={`group block rounded-xl border shadow-card p-6 transition-all duration-200 hover:shadow-elevated hover:-translate-y-0.5 ${
          highlight ? 'bg-surface border-violet-500/40 hover:border-violet-500/60' : 'bg-surface border-surface-border hover:border-violet-500/40'
        }`}
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <p className="text-[16px] font-semibold text-ink-950 capitalize">{r.room}</p>
          <ArrowUpRight size={15} className="text-ink-300 group-hover:text-violet-600 transition-colors shrink-0" />
        </div>
        <p className="text-[13px] text-ink-500">
          {r.posts === 0 ? 'Nothing said yet' : `${r.posts} ${r.posts === 1 ? 'post' : 'posts'}`}
          {r.last_post_at && ` · last ${ago(r.last_post_at)}`}
        </p>
        {/* Who was around, not how many are members. A room feels alive when
            somebody else was here today. */}
        <p className="text-[12.5px] text-ink-300 mt-1.5">
          {r.recently_around > 0
            ? `${r.recently_around} ${r.recently_around === 1 ? 'person' : 'people'} here in the last couple of days`
            : `${r.people} in this field`}
        </p>
      </Link>
    </motion.div>
  );
}
