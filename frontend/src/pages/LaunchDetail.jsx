import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, ExternalLink, Sparkles, Megaphone, CornerDownRight, Send, Check, Pencil, Trash2, Camera, X } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import Avatar from '../components/Avatar.jsx';
import { useMyIdentity } from '../context/MyIdentityContext.jsx';
import {
  getLaunch, commentOnLaunch, markCommentHelpful,
  postLaunchUpdate, closeLaunch, askAboutLaunch, updateLaunch, deleteLaunch,
} from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';

/**
 * A launch, and the room that opens under it.
 *
 * THIS WAS A FEEDBACK FORM AND THAT WAS WRONG. Three fixed questions collected
 * tidy, aggregatable statements and could not produce the thing that actually
 * helps a founder: people arguing with each other. Two testers hitting the
 * same wall never found out. Nobody could ask "which browser?".
 *
 * So it is a conversation. Flat replies, like a circle thread, because nesting
 * makes a room tidy and kills its momentum.
 *
 * AND THE FOUNDER DOES NOT READ ALL OF IT. Forty messages is a job. They ask
 * the assistant, which has read every one. The room renders first and the
 * assistant is asked afterwards, so a rate limit costs an answer and never
 * the page.
 */

const STATE_LABEL = {
  CONCEPT: 'Nothing to click yet, this is the idea written down',
  INTERFACE: 'Clickable screens, nothing behind them yet',
  PROTOTYPE: 'Partly working, expect rough edges',
  LIVE: 'Live and usable',
};

function ago(iso) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'yesterday' : `${d}d ago`;
}

function Message({ c, isFounder, founderId, onReply, onHelpful, isReply }) {
  const fromFounder = c.author_id === founderId;
  return (
    <div className={isReply ? 'ml-11 mt-4 pl-5 border-l-2 border-surface-border' : ''}>
      <div className="flex items-start gap-3">
        <Avatar name={c.display_name} src={c.profile_image} size={isReply ? 26 : 32} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[13.5px] font-medium text-ink-950">{c.display_name}</span>
            {fromFounder && (
              <span className="text-[11px] font-medium text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded">founder</span>
            )}
            {/* One fact that changes how every other word is read. */}
            {c.tried_it === true && (
              <span className="text-[11px] font-medium text-mint-500">opened it</span>
            )}
            {c.tried_it === false && (
              <span className="text-[11px] text-ink-300">has not opened it</span>
            )}
            <span className="text-[11.5px] text-ink-300">{ago(c.created_at)}</span>
          </div>

          <p className="text-[14.5px] text-ink-800 leading-[1.65] whitespace-pre-wrap break-words">{c.body}</p>

          <div className="flex items-center gap-4 mt-2">
            {!isReply && (
              <button onClick={() => onReply(c)} className="flex items-center gap-1.5 text-[12.5px] text-ink-300 hover:text-ink-700 transition-colors">
                <CornerDownRight size={12.5} /> Reply
              </button>
            )}
            {isFounder && (
              <button
                onClick={() => onHelpful(c)}
                className={`flex items-center gap-1.5 text-[12.5px] transition-colors ${
                  c.marked_helpful ? 'text-mint-500' : 'text-ink-300 hover:text-ink-700'
                }`}
              >
                <Sparkles size={12.5} /> {c.marked_helpful ? 'You found this useful' : 'Mark as useful'}
              </button>
            )}
            {!isFounder && c.marked_helpful && (
              <span className="flex items-center gap-1.5 text-[12px] text-mint-500">
                <Sparkles size={12} /> The founder found this useful
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LaunchDetail() {
  const { persona } = useMyIdentity();
  const { id } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();
  const boxRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const [draft, setDraft] = useState('');
  const [triedIt, setTriedIt] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [posting, setPosting] = useState(false);

  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState(null);
  const [updateText, setUpdateText] = useState('');

  // Editing. A founder pastes the wrong link or the wrong screenshots, and
  // without this their only way out is deleting the whole thing, which throws
  // away every message people have written underneath.
  const [editing, setEditing] = useState(false);
  const [draftEdit, setDraftEdit] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const editFileRef = useRef(null);

  async function load() {
    const { ok, data: d } = await getLaunch(id);
    if (ok && d.success) setData(d);
  }
  useEffect(() => { load().then(() => setLoading(false)); }, [id]);

  async function send() {
    const body = draft.trim();
    if (body.length < 3) return;
    setPosting(true);
    const { ok } = await commentOnLaunch(id, { body, parentId: replyTo?.id, triedIt });
    setPosting(false);
    if (!ok) { showToast('Could not post that.', 'error'); return; }
    setDraft(''); setReplyTo(null);
    await load();
  }

  async function handleHelpful(c) {
    const { ok } = await markCommentHelpful(c.id);
    if (!ok) { showToast('Could not save that.', 'error'); return; }
    await load();
  }

  async function ask(q) {
    const text = (q || question).trim();
    if (text.length < 3) return;
    setAsking(true); setAnswer(null);
    const { ok, data: r } = await askAboutLaunch(id, text);
    setAsking(false);
    if (!ok || !r?.success) { showToast('Could not ask that.', 'error'); return; }
    setAnswer({ ...r, question: text });
    setQuestion('');
  }

  function startEditing() {
    setDraftEdit({
      title: launch.title, summary: launch.summary, link: launch.link || '',
      state: launch.state, askingAbout: launch.asking_about || '',
      images: launch.images || [],
    });
    setEditing(true);
  }

  async function addEditImage(e) {
    const files = [...(e.target.files || [])];
    e.target.value = '';
    for (const f of files.slice(0, 4 - draftEdit.images.length)) {
      if (!f.type.startsWith('image/')) continue;
      try {
        const bitmap = await createImageBitmap(f);
        const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close?.();
        let url = canvas.toDataURL('image/jpeg', 0.82);
        for (const q of [0.7, 0.6, 0.5, 0.4]) {
          if ((url.length * 3) / 4 <= 220 * 1024) break;
          url = canvas.toDataURL('image/jpeg', q);
        }
        setDraftEdit((d) => ({ ...d, images: [...d.images, url] }));
      } catch (err) {
        showToast('Could not read that image.', 'error');
      }
    }
  }

  async function saveEdit() {
    if (!draftEdit.title.trim()) { showToast('It needs a name.', 'error'); return; }
    if (draftEdit.summary.trim().length < 30) { showToast('The description is too short.', 'error'); return; }
    setSavingEdit(true);
    const { ok, data: r } = await updateLaunch(id, draftEdit);
    setSavingEdit(false);
    if (!ok || !r?.success) {
      showToast(r?.error === 'IMAGE_TOO_LARGE' ? 'One of those images is too large.' : 'Could not save that.', 'error');
      return;
    }
    setEditing(false);
    showToast('Updated.');
    await load();
  }

  async function handleDelete() {
    const { ok } = await deleteLaunch(id);
    if (!ok) { showToast('Could not delete that.', 'error'); return; }
    navigate('/app/launches');
  }

  async function handleUpdate() {
    if (updateText.trim().length < 10) { showToast('Say what changed.', 'error'); return; }
    const { ok } = await postLaunchUpdate(id, updateText);
    if (!ok) { showToast('Could not post that.', 'error'); return; }
    setUpdateText('');
    showToast('Posted. Everyone in the discussion has been told.');
    await load();
  }

  async function handleClose() {
    const { ok } = await closeLaunch(id);
    if (!ok) { showToast('Could not do that.', 'error'); return; }
    await load();
  }

  if (loading) {
    return (
      <Shell persona={persona} title="Launch">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" />
        </div>
      </Shell>
    );
  }

  if (!data) {
    return (
      <Shell persona={persona} title="Launch">
        <div className="bg-surface rounded-xl border border-surface-border shadow-card py-16 text-center">
          <p className="text-[15px] text-ink-700 mb-1">This launch does not exist.</p>
          <Link to="/app/launches" className="text-[13px] text-violet-700 hover:text-violet-600 transition-colors">Back to the rest</Link>
        </div>
      </Shell>
    );
  }

  const { launch, thread, updates, isFounder, counts } = data;

  const SUGGESTED = [
    'What is the main thing stopping people?',
    'Did anyone say they would pay for this?',
    'What did the people who actually opened it say?',
  ];

  return (
    <Shell persona={persona} title={launch.title} subtitle={launch.startup_name}>
      <Link to="/app/launches" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition-colors mb-5">
        <ArrowLeft size={15} /> All launches
      </Link>

      <div className="grid grid-cols-[1fr_340px] gap-7 items-start">
        <div>
          {/* Fixing it after posting. Replaces the card rather than opening a
              separate page, so the founder sees what they are changing. */}
          {editing && draftEdit && (
            <div className="bg-surface rounded-xl border border-violet-500/40 shadow-card p-7 mb-6">
              <p className="text-[16px] font-semibold text-ink-950 mb-1">Fix this launch</p>
              <p className="text-[12.5px] text-ink-500 mb-5">
                Nothing said below is affected. Nobody is told it changed.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">Name</label>
                  <input value={draftEdit.title} onChange={(e) => setDraftEdit({ ...draftEdit, title: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-surface-border bg-surface-muted text-[15px] text-ink-900 focus:outline-none focus:border-violet-500 focus:bg-surface transition-colors" />
                </div>

                <div>
                  <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">Description</label>
                  <textarea value={draftEdit.summary} onChange={(e) => setDraftEdit({ ...draftEdit, summary: e.target.value })} rows={4}
                    className="w-full px-4 py-3 rounded-lg border border-surface-border bg-surface-muted text-[15px] text-ink-900 focus:outline-none focus:border-violet-500 focus:bg-surface transition-colors resize-none leading-relaxed" />
                  <p className="text-[12px] text-ink-500 mt-1.5">{draftEdit.summary.trim().length} characters, 30 minimum</p>
                </div>

                <div>
                  <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">Link</label>
                  <input value={draftEdit.link} onChange={(e) => setDraftEdit({ ...draftEdit, link: e.target.value })} placeholder="https://"
                    className="w-full px-4 py-3 rounded-lg border border-surface-border bg-surface-muted text-[15px] text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-violet-500 focus:bg-surface transition-colors" />
                </div>

                <div>
                  <label className="text-[13px] font-medium text-ink-700 mb-2 block">State it is in</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(STATE_LABEL).map(([v, label]) => (
                      <button key={v} type="button" onClick={() => setDraftEdit({ ...draftEdit, state: v })}
                        className={`text-left px-3.5 py-2.5 rounded-lg border text-[13px] transition-colors ${
                          draftEdit.state === v ? 'border-violet-500 bg-violet-50 text-ink-950' : 'border-surface-border text-ink-700 hover:border-ink-300'
                        }`}>{label}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[13px] font-medium text-ink-700 mb-2 block">Images</label>
                  <div className="flex flex-wrap gap-2.5">
                    {draftEdit.images.map((src, i) => (
                      <div key={i} className="relative">
                        <img src={src} alt="" className="w-24 h-24 object-cover rounded-lg border border-surface-border" />
                        <button onClick={() => setDraftEdit({ ...draftEdit, images: draftEdit.images.filter((_, j) => j !== i) })}
                          className="absolute -top-1.5 -right-1.5 bg-ink-900 text-white rounded-full p-1 hover:bg-signal-critical transition-colors">
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                    {draftEdit.images.length < 4 && (
                      <button type="button" onClick={() => editFileRef.current?.click()}
                        className="w-24 h-24 rounded-lg border border-dashed border-surface-border hover:border-violet-500 flex flex-col items-center justify-center gap-1 text-ink-300 hover:text-violet-600 transition-colors">
                        <Camera size={16} />
                        <span className="text-[11px]">Add</span>
                      </button>
                    )}
                    <input ref={editFileRef} type="file" accept="image/*" multiple onChange={addEditImage} className="hidden" />
                  </div>
                </div>

                <div>
                  <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">Focus</label>
                  <input value={draftEdit.askingAbout} onChange={(e) => setDraftEdit({ ...draftEdit, askingAbout: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-surface-border bg-surface-muted text-[15px] text-ink-900 focus:outline-none focus:border-violet-500 focus:bg-surface transition-colors" />
                </div>
              </div>

              <div className="flex items-center gap-4 mt-6">
                <button onClick={saveEdit} disabled={savingEdit}
                  className="bg-ink-900 hover:bg-ink-700 text-white px-5 py-2.5 rounded-full text-[14px] font-medium transition-colors disabled:opacity-50">
                  {savingEdit ? 'Saving…' : 'Save changes'}
                </button>
                <button onClick={() => setEditing(false)} className="text-[13.5px] text-ink-500 hover:text-ink-900 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* The thing itself. */}
          {!editing && (
          <div className="bg-surface rounded-xl border border-surface-border shadow-card overflow-hidden mb-6">
            {launch.images?.length > 0 && (
              <div className={`grid gap-1 ${launch.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {launch.images.map((src, i) => (
                  <img key={i} src={src} alt="" className="w-full object-cover" style={{ maxHeight: launch.images.length === 1 ? 400 : 230 }} />
                ))}
              </div>
            )}

            <div className="p-7">
              <div className="flex items-center gap-2.5 mb-4">
                <Avatar name={launch.founder_name} src={launch.founder_avatar} size={30} />
                <div>
                  <p className="text-[13.5px] font-medium text-ink-950">{launch.founder_name}</p>
                  <p className="text-[12px] text-ink-500">{launch.startup_name} · {ago(launch.posted_at)}</p>
                </div>
              </div>

              <p className="text-[15.5px] text-ink-800 leading-relaxed whitespace-pre-wrap">{launch.summary}</p>

              <p className="text-[13px] text-ink-500 mt-4 pt-4 border-t border-surface-border">
                {STATE_LABEL[launch.state]}
              </p>

              {launch.asking_about && (
                <div className="mt-4 bg-violet-50 border border-violet-500/20 rounded-lg p-4">
                  <p className="text-[12px] font-medium text-violet-700 mb-0.5">What would help most</p>
                  <p className="text-[13.5px] text-ink-800 leading-relaxed">{launch.asking_about}</p>
                </div>
              )}

              {launch.link && (
                <a
                  href={launch.link} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-5 bg-ink-900 hover:bg-ink-700 text-white px-5 py-3 rounded-full text-[14.5px] font-medium transition-colors"
                >
                  Open it and have a look <ExternalLink size={15} />
                </a>
              )}
            </div>
          </div>
          )}

          {updates.length > 0 && (
            <div className="bg-surface rounded-xl border border-surface-border shadow-card p-6 mb-6">
              <p className="flex items-center gap-2 text-[13px] font-semibold text-ink-900 mb-3">
                <Megaphone size={14} className="text-violet-600" /> What has changed since
              </p>
              <div className="space-y-3">
                {updates.map((u) => (
                  <div key={u.id} className="pl-3 border-l-2 border-violet-500/30">
                    <p className="text-[13.5px] text-ink-700 leading-relaxed">{u.body}</p>
                    <p className="text-[11.5px] text-ink-300 mt-0.5">{ago(u.created_at)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Say something. At the top, because reading should not be the
              default and posting an effort. */}
          {!launch.closed_at && (
            <div className="bg-surface rounded-xl border border-surface-border shadow-card p-6 mb-6">
              {replyTo && (
                <div className="flex items-center justify-between gap-3 mb-2.5">
                  <p className="text-[12.5px] text-ink-500 truncate">Replying to {replyTo.display_name}</p>
                  <button onClick={() => setReplyTo(null)} className="text-[12.5px] text-ink-300 hover:text-ink-700 transition-colors shrink-0">Cancel</button>
                </div>
              )}

              <textarea
                ref={boxRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(); }}
                rows={3}
                placeholder={replyTo ? 'Say something back…' : 'What happened when you opened it?'}
                className="w-full px-4 py-3 rounded-lg border border-surface-border bg-surface-muted text-[14.5px] text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-violet-500 focus:bg-surface transition-colors resize-none leading-relaxed"
              />

              <div className="flex items-center justify-between gap-3 mt-3">
                {!replyTo && !isFounder ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[12.5px] text-ink-500">Did you open it?</span>
                    {[[true, 'Yes'], [false, 'Not yet']].map(([v, label]) => (
                      <button
                        key={String(v)} onClick={() => setTriedIt(triedIt === v ? null : v)}
                        className={`text-[12.5px] px-2.5 py-1 rounded-full border transition-colors ${
                          triedIt === v ? 'bg-ink-900 text-white border-ink-900' : 'border-surface-border text-ink-500 hover:border-ink-300'
                        }`}
                      >{label}</button>
                    ))}
                  </div>
                ) : <span />}

                <button
                  onClick={send} disabled={posting || draft.trim().length < 3}
                  className="flex items-center gap-1.5 bg-ink-900 hover:bg-ink-700 text-white px-4 py-2 rounded-full text-[13.5px] font-medium transition-colors disabled:opacity-30"
                >
                  {posting ? 'Posting…' : 'Post'} <Send size={13} />
                </button>
              </div>
            </div>
          )}

          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-[15px] font-semibold text-ink-900">
              {counts.comments === 0 ? 'Nobody has said anything yet' : `${counts.comments} ${counts.comments === 1 ? 'message' : 'messages'}`}
            </h2>
            {counts.people > 0 && (
              <span className="text-[13px] text-ink-500">
                {counts.people} {counts.people === 1 ? 'person' : 'people'}
                {counts.tried > 0 && `, ${counts.tried} opened it`}
              </span>
            )}
          </div>

          {counts.comments === 0 ? (
            <div className="bg-surface rounded-xl border border-surface-border shadow-card py-14 text-center">
              <p className="text-[15px] text-ink-700 mb-1">Nothing said here yet.</p>
              <p className="text-[13px] text-ink-500 max-w-sm mx-auto">
                Open it, use it properly, and say what actually happened. Being first is the most useful you can be.
              </p>
            </div>
          ) : (
            <div className="space-y-7">
              {thread.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.2) }}
                  className={`bg-surface rounded-xl border border-surface-border shadow-card p-6 ${c.marked_helpful ? 'border-mint-500/40' : ''}`}
                >
                  <Message c={c} isFounder={isFounder} founderId={launch.founder_id}
                           onReply={(x) => { setReplyTo(x); boxRef.current?.focus(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                           onHelpful={handleHelpful} />
                  {(c.replies || []).map((r) => (
                    <Message key={r.id} c={r} isFounder={isFounder} founderId={launch.founder_id}
                             onReply={() => {}} onHelpful={handleHelpful} isReply />
                  ))}
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Right: the founder asks rather than reads. */}
        <div className="sticky top-6 space-y-5">
          {isFounder ? (
            <>
              <div className="bg-surface rounded-xl border border-surface-border shadow-card p-6">
                <p className="text-[15px] font-semibold text-ink-950 mb-1">Ask about this</p>
                <p className="text-[12.5px] text-ink-500 mb-4">
                  It has read everything said here. Only you see this.
                </p>

                {counts.comments === 0 ? (
                  <p className="text-[13.5px] text-ink-500 leading-relaxed">Nothing to read yet.</p>
                ) : (
                  <>
                    <div className="flex gap-2 mb-3">
                      <input
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && ask()}
                        placeholder="What is stopping people?"
                        className="flex-1 px-3.5 py-2.5 rounded-lg border border-surface-border bg-surface-muted text-[13.5px] text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-violet-500 focus:bg-surface transition-colors"
                      />
                      <button onClick={() => ask()} disabled={asking}
                        className="bg-ink-900 hover:bg-ink-700 text-white px-3.5 rounded-lg transition-colors disabled:opacity-40">
                        <Send size={14} />
                      </button>
                    </div>

                    {!answer && !asking && (
                      <div className="space-y-1.5">
                        {SUGGESTED.map((q) => (
                          <button key={q} onClick={() => ask(q)}
                            className="block text-left text-[12.5px] text-ink-500 hover:text-violet-700 transition-colors leading-snug">
                            {q}
                          </button>
                        ))}
                      </div>
                    )}

                    {asking && (
                      <div className="flex items-center gap-2 text-[13px] text-ink-500">
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" />
                        Reading what people said…
                      </div>
                    )}

                    {answer && (
                      <div className="pt-3 border-t border-surface-border">
                        <p className="text-[12px] text-ink-500 mb-1.5">{answer.question}</p>
                        {answer.degraded ? (
                          <>
                            <p className="text-[13px] text-amber-700 leading-relaxed mb-2">{answer.note}</p>
                            <p className="text-[13.5px] text-ink-800">
                              {answer.facts.comments} messages from {answer.facts.people} people, {answer.facts.tried} of whom opened it.
                            </p>
                          </>
                        ) : (
                          <p className="text-[13.5px] text-ink-800 leading-relaxed whitespace-pre-wrap">{answer.answer}</p>
                        )}
                        <button onClick={() => setAnswer(null)} className="text-[12.5px] text-ink-300 hover:text-ink-700 transition-colors mt-2.5">
                          Ask something else
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="bg-surface rounded-xl border border-surface-border shadow-card p-6">
                <p className="text-[15px] font-semibold text-ink-950 mb-1">Tell them what changed</p>
                <p className="text-[12.5px] text-ink-500 mb-4">
                  Everyone in the discussion gets told. Somebody who raised a problem hears that you fixed it.
                </p>
                <textarea
                  value={updateText} onChange={(e) => setUpdateText(e.target.value)} rows={3}
                  placeholder="Fixed the signup step three of you got stuck on."
                  className="w-full px-3.5 py-3 rounded-lg border border-surface-border bg-surface-muted text-[13.5px] text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-violet-500 focus:bg-surface transition-colors resize-none mb-3"
                />
                <button onClick={handleUpdate} className="w-full bg-ink-900 hover:bg-ink-700 text-white py-2.5 rounded-full text-[13.5px] font-medium transition-colors">
                  Post the update
                </button>
              </div>

              <div className="bg-surface rounded-xl border border-surface-border shadow-card p-6">
                <p className="text-[15px] font-semibold text-ink-950 mb-4">This launch</p>

                <button onClick={startEditing} disabled={editing}
                  className="flex items-center gap-2 w-full text-left text-[13.5px] text-ink-700 hover:text-violet-700 transition-colors mb-3 disabled:opacity-40">
                  <Pencil size={13.5} /> Fix the name, link or images
                </button>

                <button onClick={handleClose}
                  className="flex items-center gap-2 w-full text-left text-[13.5px] text-ink-700 hover:text-violet-700 transition-colors mb-4">
                  <Check size={13.5} /> {launch.closed_at ? 'Open it back up' : 'Stop collecting feedback'}
                </button>

                {/* Deleting takes the whole discussion with it, so it says how
                    much is at stake rather than asking "are you sure?". A
                    founder fixing a typo should not silently destroy eleven
                    people's written feedback, and closing is usually what they
                    actually want. */}
                <div className="pt-4 border-t border-surface-border">
                  {!confirmDelete ? (
                    <button onClick={() => setConfirmDelete(true)}
                      className="flex items-center gap-2 text-[13.5px] text-ink-300 hover:text-signal-critical transition-colors">
                      <Trash2 size={13.5} /> Delete this launch
                    </button>
                  ) : (
                    <div>
                      <p className="text-[13px] text-ink-800 leading-relaxed mb-1">
                        This removes the launch{counts.comments > 0 ? ` and all ${counts.comments} ${counts.comments === 1 ? 'message' : 'messages'} under it` : ''}. It cannot be undone.
                      </p>
                      {counts.comments > 0 && (
                        <p className="text-[12.5px] text-ink-500 leading-relaxed mb-3">
                          If you only want to stop new feedback, close it instead and everything written stays.
                        </p>
                      )}
                      <div className="flex items-center gap-3">
                        <button onClick={handleDelete}
                          className="text-[13px] font-medium bg-signal-critical hover:opacity-90 text-white px-4 py-2 rounded-full transition-opacity">
                          Delete it
                        </button>
                        <button onClick={() => setConfirmDelete(false)} className="text-[13px] text-ink-500 hover:text-ink-900 transition-colors">
                          Keep it
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-surface rounded-xl border border-surface-border shadow-card p-6">
              <p className="text-[15px] font-semibold text-ink-950 mb-2">What actually helps</p>
              <p className="text-[13.5px] text-ink-700 leading-relaxed mb-3">
                Open it, use it like you would if it were yours, and say exactly where you got stuck.
              </p>
              <p className="text-[13px] text-ink-500 leading-relaxed">
                "I did not understand what this was for" is worth more than "looks good". So is disagreeing
                with somebody else here.
              </p>
              {launch.closed_at && (
                <p className="flex items-center gap-1.5 text-[13px] text-ink-500 mt-4 pt-4 border-t border-surface-border">
                  <Check size={13} /> This founder has stopped collecting feedback.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
