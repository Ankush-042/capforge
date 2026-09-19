import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Send, MessageSquare, Sparkles, Trash2, CornerDownRight } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import Avatar from '../components/Avatar.jsx';
import { getRoom, postToRoom, toggleHelped, deleteRoomPost, startConversation, getMyProfile } from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';

/**
 * A room.
 *
 * DELIBERATELY UNLIKE THE REST OF THE PRODUCT. Every other screen in CapForge
 * is a light canvas where you are being measured: readiness, fit, standing,
 * scores. This one is dark, dense and fast, and it should be obvious within a
 * second of landing that nothing here is being assessed.
 *
 * Flat and chronological. No threads, because threads make a room tidy and
 * kill its momentum. No ranking, no upvotes, no karma: the moment posts
 * compete, people write for the room instead of saying what they mean, and the
 * only thing this is for is people being honest about decisions they are in
 * the middle of.
 *
 * ONE REACTION, and it means "this helped" rather than "this is popular". It
 * tells whoever answered that it landed. That is signal for the author, not a
 * scoreboard for the room.
 *
 * And you can message anyone directly. A room where you cannot reach the one
 * person who said something useful is a noticeboard, not a community.
 */

function ago(iso) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

const ROLE_TINT = {
  FOUNDER: '#C4B5FD',
  CONTRIBUTOR: '#93C5FD',
  INVESTOR: '#86EFAC',
};

function Post({ p, meId, onHelped, onReply, onMessage, onDelete, isReply }) {
  const tint = ROLE_TINT[p.primary_role] || '#A1A1AA';
  const mine = p.author_id === meId;

  return (
    <div className={isReply ? 'pl-11 mt-3' : ''}>
      <div className="flex items-start gap-3">
        <Avatar name={p.display_name} src={p.profile_image} size={isReply ? 26 : 32} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-[13.5px] font-medium text-white/90">{p.display_name}</span>
            {/* Which side of the table they are on. A contributor's most
                valuable answer usually comes from a founder, and knowing which
                is which changes how you read it. */}
            <span className="text-[11px]" style={{ color: tint }}>
              {String(p.primary_role || '').toLowerCase()}
            </span>
            <span className="text-[11px] text-white/25">{ago(p.created_at)}</span>
          </div>

          <p className="text-[14.5px] text-white/80 leading-[1.6] mt-1 whitespace-pre-wrap break-words">{p.body}</p>

          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={() => onHelped(p)}
              className={`flex items-center gap-1.5 text-[12px] transition-colors ${
                p.you_helped ? 'text-mint-500' : 'text-white/30 hover:text-white/60'
              }`}
            >
              <Sparkles size={12} />
              {p.helped > 0 ? `${p.helped} found this useful` : 'This helped'}
            </button>

            {!isReply && (
              <button onClick={() => onReply(p)} className="flex items-center gap-1.5 text-[12px] text-white/30 hover:text-white/60 transition-colors">
                <CornerDownRight size={12} /> Reply
              </button>
            )}

            {!mine && (
              <button onClick={() => onMessage(p)} className="flex items-center gap-1.5 text-[12px] text-white/30 hover:text-white/60 transition-colors">
                <MessageSquare size={12} /> Message them
              </button>
            )}

            {mine && (
              <button onClick={() => onDelete(p)} className="flex items-center gap-1.5 text-[12px] text-white/20 hover:text-signal-critical transition-colors ml-auto">
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Room() {
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
  useEffect(() => { load().then(() => setLoading(false)); }, [room]);

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
    // Optimistic: a reaction that waits on a round trip feels broken.
    const flip = (x) => x.id === p.id
      ? { ...x, you_helped: !x.you_helped, helped: x.helped + (x.you_helped ? -1 : 1) }
      : x;
    setData({
      ...data,
      posts: data.posts.map((x) => ({ ...flip(x), replies: (x.replies || []).map(flip) })),
    });
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

  if (loading) {
    return (
      <Shell title={room}>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" />
        </div>
      </Shell>
    );
  }

  const posts = data?.posts || [];
  const around = data?.around || [];
  const unanswered = data?.unanswered || [];

  return (
    <Shell title={room} subtitle="Nothing here is being assessed">
      <Link to="/app/rooms" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition-colors mb-5">
        <ArrowLeft size={15} /> All rooms
      </Link>

      {/* DARK, DENSE, FAST. The rest of this product is a light canvas where
          you are being measured. Landing here should feel different within a
          second. */}
      <div className="relative overflow-hidden rounded-xl bg-ink-950">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 12% 8%, #7C5CFC 0%, transparent 45%), radial-gradient(circle at 88% 92%, #1F5D52 0%, transparent 45%)' }} />

        <div className="relative">
          <div className="flex items-center justify-between gap-4 px-7 py-5 border-b border-white/10">
            <div>
              <p className="font-display text-[19px] font-semibold text-white capitalize">{room}</p>
              <p className="text-[12.5px] text-white/40 mt-0.5">
                {around.length > 0
                  ? `${around.length} ${around.length === 1 ? 'person has' : 'people have'} been here recently`
                  : 'Quiet right now'}
              </p>
            </div>
            {around.length > 0 && (
              <div className="flex items-center -space-x-2 shrink-0">
                {around.slice(0, 6).map((a, i) => (
                  <div key={i} className="ring-2 ring-ink-950 rounded-full">
                    <Avatar name={a.display_name} src={a.profile_image} size={26} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Asking into silence is what kills a room, so the people who could
              answer should see what is sitting unanswered. */}
          {unanswered.length > 0 && (
            <div className="px-7 py-3 border-b border-white/10 bg-white/[0.03]">
              <p className="text-[12px] text-white/50">
                {unanswered.length === 1 ? 'One question here has no answer yet.' : `${unanswered.length} questions here have no answer yet.`}
              </p>
            </div>
          )}

          <div className="px-7 py-6 space-y-7 min-h-[280px] max-h-[600px] overflow-y-auto">
            {posts.length === 0 ? (
              <div className="py-14 text-center">
                <p className="text-[15px] text-white/70 mb-1.5">Nobody has said anything yet.</p>
                <p className="text-[13.5px] text-white/35 max-w-sm mx-auto leading-relaxed">
                  Someone has to go first. It does not have to be polished, and it does not have to be a question.
                </p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {posts.map((p) => (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
                    <Post p={p} meId={meId} onHelped={handleHelped} onReply={(x) => { setReplyTo(x); boxRef.current?.focus(); }} onMessage={handleMessage} onDelete={handleDelete} />
                    {(p.replies || []).map((r) => (
                      <Post key={r.id} p={r} meId={meId} onHelped={handleHelped} onReply={() => {}} onMessage={handleMessage} onDelete={handleDelete} isReply />
                    ))}
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          <div className="px-7 py-4 border-t border-white/10">
            {replyTo && (
              <div className="flex items-center justify-between gap-3 mb-2.5">
                <p className="text-[12px] text-white/40 truncate">
                  Replying to {replyTo.display_name}
                </p>
                <button onClick={() => setReplyTo(null)} className="text-[12px] text-white/30 hover:text-white/60 transition-colors shrink-0">Cancel</button>
              </div>
            )}
            <div className="flex items-end gap-3">
              <textarea
                ref={boxRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
                rows={2}
                /* Not "Start a discussion". A box that asks for a discussion
                   gets performances; a box that asks what is on your mind gets
                   the truth. */
                placeholder={replyTo ? 'Say something back…' : "What's actually on your mind?"}
                className="flex-1 bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-[14.5px] text-white/90 placeholder:text-white/25 focus:outline-none focus:border-violet-500/60 transition-colors resize-none leading-relaxed"
              />
              <button
                onClick={submit}
                disabled={posting || !draft.trim()}
                className="bg-white hover:bg-white/90 text-ink-950 w-11 h-11 rounded-full flex items-center justify-center transition-colors disabled:opacity-25 shrink-0 mb-0.5"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
