import React, { useState, useEffect } from 'react';
import Wordmark from '../components/Wordmark.jsx';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { listRooms, createRoom } from '../services/startups.js';

/**
 * Choosing which circle to walk into.
 *
 * Previously a grid of cards inside the standard Shell, which meant it looked
 * like every other list in the product and gave no hint that the thing behind
 * it was different. Entering a circle then felt like a jarring page swap.
 *
 * This shares the circle's own language: same dark ground, same grain, same
 * editorial type. The list previews the place rather than describing it, so
 * walking in is continuous.
 *
 * Rows rather than cards. A card grid implies a catalogue of equivalent
 * things; a list of rows with real scale implies doors along a corridor, which
 * is closer to what these are.
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

function Grain() {
  return (
    <svg className="pointer-events-none fixed inset-0 w-full h-full opacity-[0.16] mix-blend-overlay" aria-hidden="true">
      <filter id="circlesGrain">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#circlesGrain)" />
    </svg>
  );
}

function Row({ r, index }) {
  const alive = r.recently_around > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.045, 0.3), ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        to={`/app/circles/${encodeURIComponent(r.room)}`}
        className="group flex items-center gap-6 py-7 border-b border-white/[0.06] transition-colors hover:border-white/[0.14]"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h3
              className="font-display text-white capitalize transition-transform duration-300 group-hover:translate-x-1"
              style={{ fontSize: 'clamp(1.5rem, 2.6vw, 2.05rem)', letterSpacing: '-0.028em', fontWeight: 600, lineHeight: 1.1 }}
            >
              {r.room}
            </h3>
            {r.yours && (
              <span className="text-[10.5px] tracking-[0.14em] uppercase font-medium" style={{ color: '#B79CFF' }}>
                yours
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 mt-2.5 flex-wrap">
            <span className="text-[13.5px] text-white/35">
              {r.posts === 0 ? 'nothing said yet' : `${r.posts} ${r.posts === 1 ? 'post' : 'posts'}`}
              {r.last_post_at && ` · last ${ago(r.last_post_at)}`}
            </span>

            {alive && (
              <span className="flex items-center gap-2 text-[13px]" style={{ color: '#5FD3A0' }}>
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ backgroundColor: '#5FD3A0' }} />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: '#5FD3A0' }} />
                </span>
                {r.recently_around} here recently
              </span>
            )}
          </div>
        </div>

        <span className="text-[13px] text-white/20 tabular-nums shrink-0 hidden sm:block">
          {r.people} in this field
        </span>

        <ArrowUpRight
          size={20}
          className="text-white/15 group-hover:text-white/70 shrink-0 transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
        />
      </Link>
    </motion.div>
  );
}

export default function Circles() {
  const navigate = useNavigate();
  const [opening, setOpening] = useState(false);
  const [newRoom, setNewRoom] = useState('');
  const [creating, setCreating] = useState(false);

  // Creating one that already exists is not an error: they land in the room
  // they wanted rather than being told off for it.
  async function open() {
    const label = newRoom.trim();
    if (label.length < 2 || creating) return;
    setCreating(true);
    const { ok, data } = await createRoom(label);
    setCreating(false);
    if (!ok || !data.success) return;
    navigate(`/app/circles/${encodeURIComponent(data.room)}`);
  }

  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    listRooms().then(({ ok, data }) => {
      if (ok && data.success) setRooms(data.rooms);
      setLoading(false);
    });
  }, []);

  const yours = rooms.filter((r) => r.yours);
  const rest = rooms.filter((r) => !r.yours);

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: '#0E0C14' }}>
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 70% 55% at 8% -5%, rgba(109,40,217,0.42) 0%, transparent 58%),' +
            'radial-gradient(ellipse 60% 50% at 95% 8%, rgba(31,93,82,0.34) 0%, transparent 55%)',
        }}
      />
      <Grain />

      <div className="relative max-w-[880px] mx-auto px-8 pb-28">
        <div className="pt-10 pb-12">
          <Link to="/app" className="inline-flex items-center gap-2 text-[13px] text-white/30 hover:text-white/75 transition-colors">
            <ArrowLeft size={14} /> Back to <Wordmark size={13.5} className="ml-0.5 text-current" />
          </Link>
        </div>

        {/* Says what this place is for in a sentence, because the whole point
            is that it works differently from everywhere else in the product. */}
        <div className="pb-14">
          <h1
            className="font-display text-white"
            style={{ fontSize: 'clamp(2.75rem, 6vw, 4.25rem)', lineHeight: 1.02, letterSpacing: '-0.038em', fontWeight: 600 }}
          >
            Everywhere else asks
            <br />
            you to commit.
          </h1>
          <p className="text-[17px] text-white/40 mt-6 max-w-lg leading-relaxed">
            Here you can just talk. Founders, people building, and investors in the same
            place, because whoever can answer you is usually on the other side of the table.
          </p>

          {/* A room opens by itself once two people here share a field, and
              until now that was the only way one could exist — so a field
              nobody had picked yet had nowhere to talk even when somebody
              wanted to start it. Anybody can open one now. */}
          <div className="flex items-center gap-5 mt-8">
            <button
              onClick={() => setOpening(true)}
              className="bg-white hover:bg-white/90 text-ink-950 px-5 py-2.5 rounded-full text-[14px] font-medium transition-colors"
            >
              Open a circle
            </button>
            <span className="text-[13px] text-white/35">
              Rooms also appear on their own once two people here share a field.
            </span>
          </div>

          {opening && (
            <div className="mt-6 max-w-md">
              <input
                autoFocus
                value={newRoom}
                onChange={(e) => setNewRoom(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && open()}
                placeholder="What is it about? agritech, hardware, design..."
                /* EXPLICIT COLOURS, NOT AN OPACITY CLASS. This was bg-white/8,
                   which is not a step on Tailwind's opacity scale, so it
                   compiled to nothing: the input kept the browser's default
                   white background while the text stayed white. Whatever was
                   typed was invisible. Inline styles cannot fail this way. */
                className="w-full px-5 py-3 rounded-full text-[14px] focus:outline-none transition-colors"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.10)',
                  border: '1px solid rgba(255,255,255,0.22)',
                  color: '#FFFFFF',
                }}
              />
              <div className="flex items-center gap-4 mt-3">
                <button
                  onClick={open}
                  disabled={newRoom.trim().length < 2 || creating}
                  className="bg-white/90 hover:bg-white disabled:opacity-40 text-ink-950 px-4 py-2 rounded-full text-[13px] font-medium transition-colors"
                >
                  {creating ? 'Opening' : 'Open it'}
                </button>
                <button onClick={() => { setOpening(false); setNewRoom(''); }} className="text-[13px] text-white/40 hover:text-white transition-colors">
                  Never mind
                </button>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-7 h-7 rounded-full border-2 border-white/8 animate-spin" style={{ borderTopColor: '#B79CFF' }} />
          </div>
        ) : rooms.length === 0 ? (
          <div className="py-20 max-w-md">
            <p className="text-[22px] text-white/80 leading-snug mb-3" style={{ letterSpacing: '-0.02em' }}>
              No circles yet.
            </p>
            <p className="text-[15.5px] text-white/35 leading-relaxed">
              One appears for a field once a few people are genuinely in it. Pick the fields
              you care about on your profile and yours will show up here.
            </p>
          </div>
        ) : (
          <>
            {yours.length > 0 && (
              <div className="mb-16">
                <p className="text-[11px] tracking-[0.16em] uppercase text-white/25 mb-2">Your fields</p>
                <div className="border-t border-white/[0.06]">
                  {yours.map((r, i) => <Row key={r.room} r={r} index={i} />)}
                </div>
              </div>
            )}

            {rest.length > 0 && (
              <div>
                <p className="text-[11px] tracking-[0.16em] uppercase text-white/25 mb-2">
                  {yours.length > 0 ? 'Everywhere else' : 'All circles'}
                </p>
                <div className="border-t border-white/[0.06]">
                  {rest.map((r, i) => <Row key={r.room} r={r} index={i} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
