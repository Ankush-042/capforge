import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Send, Sparkles, Trash2, CornerDownRight, MessageSquare } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import Avatar from '../components/Avatar.jsx';
import { getRoom, postToRoom, toggleHelped, deleteRoomPost, startConversation, getMyProfile } from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';

/**
 * A circle.
 *
 * FIRST VERSION WAS WRONG AND THIS IS THE REWRITE. It was a dark panel dropped
 * into a light page, which read as a widget bolted on rather than a place you
 * had arrived. Everything was cramped into one box with the same visual weight
 * as a dashboard card, the posts were tight and grey, and the whole thing felt
 * like a comment section.
 *
 * What changed:
 * - It takes the FULL PAGE. You leave the measured part of the product and
 *   land somewhere else. A place has edges; a widget does not.
 * - The composer is at the TOP and always visible. Burying it under the feed
 *   makes reading the default and posting an effort, which is backwards for
 *   a room whose whole problem is that nobody goes first.
 * - Posts breathe. Generous spacing, larger text, real hierarchy between what
 *   someone said and the metadata around it. The words are the content; the
 *   chrome should get out of the way.
 * - Warmer, not just darker. The first version was near-black and clinical.
 *   This has depth and a little colour in it, so it reads as a room with the
 *   lights low rather than a terminal.
 */

function ago(iso) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

const ROLE = {
  FOUNDER: { label: 'founder', color: '#C4B5FD' },
  CONTRIBUTOR: { label: 'building', color: '#93C5FD' },
  INVESTOR: { label: 'investor', color: '#86EFAC' },
};

function Post({ p, meId, onHelped, onReply, onMessage, onDelete, isReply }) {
  const role = ROLE[p.primary_role] || { label: '', color: '#A1A1AA' };
  const mine = p.author_id === meId;

  return (
    <div className={isReply ? 'ml-12 mt-5 pl-5 border-l border-white/[0.07]' : ''}>
      <div className="flex items-start gap-3.5">
        <Avatar name={p.display_name} src={p.profile_image} size={isReply ? 28 : 36} />

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2.5 flex-wrap mb-1.5">
            <span className="text-[14px] font-medium text-white/95">{p.display_name}</span>
            {role.label && (
              <span className="text-[11.5px] px-2 py-0.5 rounded-full" style={{ color: role.color, backgroundColor: `${role.color}14` }}>
                {role.label}
              </span>
            )}
            <span className="text-[11.5px] text-white/25">{ago(p.created_at)}</span>
          </div>

          {/* The words are the content. Bigger, lighter, with room to breathe. */}
          <p className={`text-white/[0.82] leading-[1.7] whitespace-pre-wrap break-words ${isReply ? 'text-[14.5px]' : 'text-[15.5px]'}`}>
            {p.body}
          </p>

          <div className="flex items-center gap-5 mt-3">
            <button
              onClick={() => onHelped(p)}
              className={`flex items-center gap-1.5 text-[12.5px] transition-colors ${
                p.you_helped ? 'text-mint-500' : 'text-white/25 hover:text-white/60'
              }`}
            >
              <Sparkles size={12.5} />
              {p.helped > 0 ? `${p.helped} found this useful` : 'This helped'}
            </button>

            {!isReply && (
              <button onClick={() => onReply(p)} className="flex items-center gap-1.5 text-[12.5px] text-white/25 hover:text-white/60 transition-colors">
                <CornerDownRight size={12.5} /> Reply
              </button>
            )}

            {!mine && (
              <button onClick={() => onMessage(p)} className="flex items-center gap-1.5 text-[12.5px] text-white/25 hover:text-white/60 transition-colors">
                <MessageSquare size={12.5} /> Message
              </button>
            )}

            {mine && (
              <button onClick={() => onDelete(p)} className="text-white/15 hover:text-signal-critical transition-colors ml-auto">
                <Trash2 size={12.5} />
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
    <Shell title={room} subtitle="Nothing here is being measured">
      {/* FULL PAGE, not a panel. You have left the part of the product that
          assesses you. A place has edges; a widget does not. */}
      <div className="relative overflow-hidden rounded-2xl" style={{ backgroundColor: '#14121C' }}>
        <div
          className="absolute inset-0 opacity-[0.55] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(ellipse 80% 50% at 10% -10%, #6D28D9 0%, transparent 60%), radial-gradient(ellipse 70% 60% at 100% 100%, #1F5D52 0%, transparent 60%)' }}
        />

        <div className="relative px-9 py-8">
          <Link to="/app/circles" className="inline-flex items-center gap-1.5 text-[13px] text-white/35 hover:text-white/70 transition-colors mb-6">
            <ArrowLeft size={14} /> All circles
          </Link>

          <div className="flex items-end justify-between gap-6 mb-8">
            <div>
              <h1 className="font-display text-[34px] font-semibold text-white capitalize leading-tight">{room}</h1>
              <p className="text-[14px] text-white/40 mt-1.5">
                {around.length > 0
                  ? `${around.length} ${around.length === 1 ? 'person has' : 'people have'} been here recently`
                  : 'Quiet right now. Someone has to go first.'}
              </p>
            </div>
            {around.length > 0 && (
              <div className="flex items-center -space-x-2.5 shrink-0">
                {around.slice(0, 7).map((a, i) => (
                  <div key={i} className="rounded-full" style={{ boxShadow: '0 0 0 2.5px #14121C' }}>
                    <Avatar name={a.display_name} src={a.profile_image} size={30} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* COMPOSER AT THE TOP, always visible. Burying it under the feed
              makes reading the default and posting an effort, which is exactly
              backwards for a place whose whole problem is nobody going first. */}
          <div className="mb-9">
            {replyTo && (
              <div className="flex items-center justify-between gap-3 mb-2.5 px-1">
                <p className="text-[12.5px] text-white/45 truncate">Replying to {replyTo.display_name}</p>
                <button onClick={() => setReplyTo(null)} className="text-[12.5px] text-white/30 hover:text-white/70 transition-colors shrink-0">Cancel</button>
              </div>
            )}
            <div className="rounded-xl border border-white/[0.09] focus-within:border-violet-400/40 transition-colors" style={{ backgroundColor: 'rgba(255,255,255,0.035)' }}>
              <textarea
                ref={boxRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
                rows={3}
                placeholder={replyTo ? 'Say something back…' : "What's actually on your mind?"}
                className="w-full bg-transparent px-5 pt-4 pb-2 text-[15.5px] text-white/90 placeholder:text-white/25 focus:outline-none resize-none leading-relaxed"
              />
              <div className="flex items-center justify-between px-5 pb-3.5">
                <p className="text-[11.5px] text-white/20">
                  No scores here. Nobody is ranking this.
                </p>
                <button
                  onClick={submit}
                  disabled={posting || !draft.trim()}
                  className="flex items-center gap-2 bg-white hover:bg-white/90 text-ink-950 px-4 py-2 rounded-full text-[13.5px] font-medium transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  {posting ? 'Posting…' : 'Post'} <Send size={13} />
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-7 h-7 rounded-full border-2 border-white/10 border-t-violet-400 animate-spin" />
            </div>
          ) : posts.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-[17px] text-white/65 mb-2">Nothing said here yet.</p>
              <p className="text-[14px] text-white/30 max-w-sm mx-auto leading-relaxed">
                It does not have to be polished and it does not have to be a question. What are you actually stuck on?
              </p>
            </div>
          ) : (
            <div className="space-y-9">
              <AnimatePresence initial={false}>
                {posts.map((p) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <Post p={p} meId={meId} onHelped={handleHelped} onReply={(x) => { setReplyTo(x); boxRef.current?.focus(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} onMessage={handleMessage} onDelete={handleDelete} />
                    {(p.replies || []).map((r) => (
                      <Post key={r.id} p={r} meId={meId} onHelped={handleHelped} onReply={() => {}} onMessage={handleMessage} onDelete={handleDelete} isReply />
                    ))}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
