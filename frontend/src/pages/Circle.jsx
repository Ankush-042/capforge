import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ArrowUp, Sparkles, Trash2, CornerDownRight, MessageSquare } from 'lucide-react';
import Avatar from '../components/Avatar.jsx';
import { getRoom, postToRoom, toggleHelped, deleteRoomPost, startConversation, getMyProfile } from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';

/**
 * A circle.
 *
 * THIRD VERSION. The first two failed the same way: they treated the
 * conversation as content sitting inside a container, so it read as a comment
 * section no matter how the container was styled. Darkening a card does not
 * make it a place.
 *
 * This one drops the Shell entirely and takes the whole viewport. There is no
 * card, no panel, no bordered box around anything. The words and the faces ARE
 * the interface, and the chrome is almost absent: a thin rail of metadata on
 * the left, the conversation running down the middle, nothing else competing.
 *
 * Texture rather than a flat wash. Real grain over the gradient, because a
 * plain radial gradient is the single most recognisable LLM-default dark
 * surface and reads as cheap at any size.
 *
 * Type does the work. The post text is 17px with generous leading, larger than
 * anything else in the product, because reading what someone actually said is
 * the entire point of the screen.
 */

function ago(iso) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

const ROLE = {
  FOUNDER: { label: 'founder', color: '#B79CFF' },
  CONTRIBUTOR: { label: 'building', color: '#7FB5FF' },
  INVESTOR: { label: 'investor', color: '#5FD3A0' },
};

/** Real grain. A flat radial gradient is the default dark surface everyone
 *  ships and it looks it; noise is what makes a dark screen feel like a
 *  material rather than a fill. */
function Grain() {
  return (
    <svg className="pointer-events-none fixed inset-0 w-full h-full opacity-[0.16] mix-blend-overlay" aria-hidden="true">
      <filter id="circleGrain">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#circleGrain)" />
    </svg>
  );
}

function Post({ p, meId, onHelped, onReply, onMessage, onDelete, isReply }) {
  const role = ROLE[p.primary_role] || { label: '', color: '#8A8A99' };
  const mine = p.author_id === meId;

  return (
    <div className={isReply ? 'mt-6 ml-14 pl-6 border-l border-white/[0.06]' : ''}>
      <div className="flex gap-4">
        <div className="shrink-0 pt-0.5">
          <Avatar name={p.display_name} src={p.profile_image} size={isReply ? 30 : 40} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5 flex-wrap mb-2">
            <span className="text-[14.5px] font-medium text-white">{p.display_name}</span>
            {role.label && (
              <span className="text-[11px] tracking-wide uppercase font-medium" style={{ color: role.color }}>
                {role.label}
              </span>
            )}
            <span className="text-[11.5px] text-white/20">{ago(p.created_at)}</span>
          </div>

          {/* The largest type in the product. Reading what someone said is the
              whole point of this screen, so nothing else outweighs it. */}
          <p
            className="text-white/90 whitespace-pre-wrap break-words"
            style={{
              fontSize: isReply ? '15.5px' : '17px',
              lineHeight: 1.72,
              letterSpacing: '-0.005em',
            }}
          >
            {p.body}
          </p>

          <div className="flex items-center gap-6 mt-3.5">
            <button
              onClick={() => onHelped(p)}
              className="group/h flex items-center gap-1.5 text-[12.5px] transition-colors"
              style={{ color: p.you_helped ? '#5FD3A0' : 'rgba(255,255,255,0.22)' }}
            >
              <Sparkles size={13} className="transition-transform group-hover/h:scale-110" />
              <span className="group-hover/h:text-white/60 transition-colors">
                {p.helped > 0 ? `${p.helped} found this useful` : 'This helped'}
              </span>
            </button>

            {!isReply && (
              <button onClick={() => onReply(p)} className="flex items-center gap-1.5 text-[12.5px] text-white/22 hover:text-white/60 transition-colors">
                <CornerDownRight size={13} /> Reply
              </button>
            )}

            {!mine && (
              <button onClick={() => onMessage(p)} className="flex items-center gap-1.5 text-[12.5px] text-white/22 hover:text-white/60 transition-colors">
                <MessageSquare size={13} /> Message
              </button>
            )}

            {mine && (
              <button onClick={() => onDelete(p)} className="text-white/12 hover:text-[#FF6B6B] transition-colors ml-auto">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Circle() {
  const { room } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [meId, setMeId] = useState(null);
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [posting, setPosting] = useState(false);
  const boxRef = useRef(null);

  async function load() {
    const { ok, data: d } = await getRoom(room);
    if (ok && d.success) setData(d);
  }

  useEffect(() => {
    getMyProfile().then(({ ok, data }) => { if (ok && data.success) setMeId(data.profile.user_id); });
  }, []);
  useEffect(() => { setLoading(true); load().then(() => setLoading(false)); }, [room]);

  // Grows with what is being written rather than sitting at a fixed height.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [draft]);

  async function submit() {
    const text = draft.trim();
    if (!text || posting) return;
    setPosting(true);
    const { ok, data: res } = await postToRoom(room, text, replyTo?.id);
    setPosting(false);
    if (!ok || !res?.success) { showToast('Could not post that.', 'error'); return; }
    setDraft('');
    setReplyTo(null);
    await load();
  }

  async function handleHelped(p) {
    const flip = (x) => x.id === p.id
      ? { ...x, you_helped: !x.you_helped, helped: x.helped + (x.you_helped ? -1 : 1) }
      : x;
    setData({ ...data, posts: data.posts.map((x) => ({ ...flip(x), replies: (x.replies || []).map(flip) })) });
    const { ok } = await toggleHelped(p.id);
    if (!ok) { showToast('Could not save that.', 'error'); await load(); }
  }

  async function handleMessage(p) {
    const { ok, data: res } = await startConversation(p.author_id, {});
    if (ok && res.success) navigate(`/app/inbox/${res.conversation.id}`);
    else showToast(res?.error || 'Could not start a conversation.', 'error');
  }

  async function handleDelete(p) {
    const before = data;
    setData({ ...data, posts: data.posts.filter((x) => x.id !== p.id) });
    const { ok } = await deleteRoomPost(p.id);
    if (!ok) { setData(before); showToast('Could not delete that.', 'error'); }
  }

  const posts = data?.posts || [];
  const around = data?.around || [];

  return (
    /* NO SHELL. Leaving the measured part of the product should be physical:
       the sidebar, the header, the light canvas all go away. */
    <div className="min-h-screen relative" style={{ backgroundColor: '#0E0C14' }}>
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 70% 55% at 8% -5%, rgba(109,40,217,0.42) 0%, transparent 58%),' +
            'radial-gradient(ellipse 60% 50% at 95% 8%, rgba(31,93,82,0.34) 0%, transparent 55%),' +
            'radial-gradient(ellipse 90% 40% at 50% 105%, rgba(109,40,217,0.14) 0%, transparent 60%)',
        }}
      />
      <Grain />

      <div className="relative max-w-[880px] mx-auto px-8 pb-40">
        <div className="pt-10 pb-8">
          <Link to="/app/circles" className="inline-flex items-center gap-2 text-[13px] text-white/30 hover:text-white/75 transition-colors">
            <ArrowLeft size={14} /> All circles
          </Link>
        </div>

        {/* Editorial masthead. Big, confident, two lines maximum. */}
        <div className="pb-10 border-b border-white/[0.07]">
          <h1
            className="font-display text-white capitalize"
            style={{ fontSize: 'clamp(2.75rem, 5.5vw, 4rem)', lineHeight: 1.02, letterSpacing: '-0.035em', fontWeight: 600 }}
          >
            {room}
          </h1>

          <div className="flex items-center gap-5 mt-5 flex-wrap">
            {around.length > 0 ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center -space-x-2">
                  {around.slice(0, 6).map((a, i) => (
                    <div key={i} className="rounded-full" style={{ boxShadow: '0 0 0 2px #0E0C14' }}>
                      <Avatar name={a.display_name} src={a.profile_image} size={26} />
                    </div>
                  ))}
                </div>
                <span className="flex items-center gap-2 text-[13px] text-white/40">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ backgroundColor: '#5FD3A0' }} />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: '#5FD3A0' }} />
                  </span>
                  here recently
                </span>
              </div>
            ) : (
              <span className="text-[13px] text-white/30">Quiet right now</span>
            )}

            <span className="text-[13px] text-white/25">
              {posts.length === 0 ? 'nothing said yet' : `${posts.length} ${posts.length === 1 ? 'thread' : 'threads'}`}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-28">
            <div className="w-7 h-7 rounded-full border-2 border-white/8 animate-spin" style={{ borderTopColor: '#B79CFF' }} />
          </div>
        ) : posts.length === 0 ? (
          <div className="py-28 max-w-md">
            <p className="text-[24px] text-white/80 leading-snug mb-4" style={{ letterSpacing: '-0.02em' }}>
              Nobody has said anything here yet.
            </p>
            <p className="text-[15.5px] text-white/35 leading-relaxed">
              It does not have to be polished and it does not have to be a question.
              What are you actually stuck on?
            </p>
          </div>
        ) : (
          <div className="pt-12">
            <AnimatePresence initial={false}>
              {posts.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.28, delay: Math.min(i * 0.035, 0.2) }}
                  className={i > 0 ? 'pt-11 mt-11 border-t border-white/[0.055]' : ''}
                >
                  <Post
                    p={p}
                    meId={meId}
                    onHelped={handleHelped}
                    onReply={(x) => { setReplyTo(x); boxRef.current?.focus(); }}
                    onMessage={handleMessage}
                    onDelete={handleDelete}
                  />
                  {(p.replies || []).map((r) => (
                    <Post key={r.id} p={r} meId={meId} onHelped={handleHelped} onReply={() => {}} onMessage={handleMessage} onDelete={handleDelete} isReply />
                  ))}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Docked to the bottom and always reachable. Posting should never
          require scrolling to find where to type. */}
      <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, #0E0C14 30%, rgba(14,12,20,0.92) 60%, transparent 100%)' }}
        />
        <div className="relative max-w-[880px] mx-auto px-8 pb-7 pt-10 pointer-events-auto">
          {replyTo && (
            <div className="flex items-center justify-between gap-3 mb-2.5 px-1">
              <p className="text-[12.5px] text-white/45 truncate">
                Replying to <span className="text-white/70">{replyTo.display_name}</span>
              </p>
              <button onClick={() => setReplyTo(null)} className="text-[12.5px] text-white/30 hover:text-white/70 transition-colors shrink-0">
                Cancel
              </button>
            </div>
          )}

          <div
            className="flex items-end gap-3 rounded-2xl px-5 py-3.5 transition-colors"
            style={{
              backgroundColor: 'rgba(255,255,255,0.055)',
              border: '1px solid rgba(255,255,255,0.09)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <textarea
              ref={boxRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
              rows={1}
              placeholder={replyTo ? 'Say something back' : "What's actually on your mind?"}
              className="flex-1 bg-transparent text-[16px] text-white/92 placeholder:text-white/25 focus:outline-none resize-none leading-relaxed py-1"
              style={{ maxHeight: 220 }}
            />
            <button
              onClick={submit}
              disabled={posting || !draft.trim()}
              className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-20"
              style={{ backgroundColor: draft.trim() ? '#FFFFFF' : 'rgba(255,255,255,0.12)' }}
            >
              <ArrowUp size={17} style={{ color: draft.trim() ? '#0E0C14' : 'rgba(255,255,255,0.5)' }} />
            </button>
          </div>

          <p className="text-[11.5px] text-white/18 mt-2.5 px-1">
            No scores, no ranking. Enter to post, shift-enter for a new line.
          </p>
        </div>
      </div>
    </div>
  );
}
