import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Send, Handshake, Check, Presentation, Sparkles, Building2 } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import { useMyPersona } from '../hooks/useMyPersona.js';
import { getConversationMessages, sendMessage, getMyProfile, confirmTeamFormation, sendPitch } from '../services/startups.js';
import { useActiveStartup } from '../context/ActiveStartupContext.jsx';
import { useToast } from '../components/Toast.jsx';

/**
 * Where two people decide to build something.
 *
 * The thread worked, but it read like any chat window: a fixed 500px box of
 * bubbles with the most consequential action on the whole platform, forming
 * a team, sitting below it in a plain card that looked like a form.
 *
 * That decision is the point of this product. It gets weight here, it says
 * what actually happens when both people commit, and it shows honestly
 * whether you are waiting on them or they are waiting on you.
 */

function dayLabel(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yest.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' });
}

export default function ConversationThread() {
  const { persona, displayName } = useMyPersona();
  const { id } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();
  const { activeStartup } = useActiveStartup();

  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [myUserId, setMyUserId] = useState(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pitchSending, setPitchSending] = useState(false);
  const bottomRef = useRef(null);

  async function load() {
    const [meRes, msgRes] = await Promise.all([getMyProfile(), getConversationMessages(id)]);
    if (meRes.ok && meRes.data.success) setMyUserId(meRes.data.profile.user_id);
    if (msgRes.ok && msgRes.data.success) {
      setMessages(msgRes.data.messages);
      setConversation(msgRes.data.conversation);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function handleSend() {
    if (!draft.trim() || sending) return;
    setSending(true);
    const { ok, data } = await sendMessage(id, draft);
    setSending(false);
    if (ok && data.success) { setDraft(''); await load(); }
    else showToast(data.error || 'Could not send that.', 'error');
  }

  async function handleConfirm() {
    setConfirming(true);
    const { ok, data } = await confirmTeamFormation(id);
    setConfirming(false);
    if (!ok || !data.success) { showToast(data.detail || data.error || 'Could not confirm.', 'error'); return; }
    showToast(data.bothConfirmed
      ? 'It is real. They are on the team, and your readiness has been recalculated.'
      : 'You are in. Waiting on them now.');
    await load();
  }

  async function handleSendPitch() {
    if (!activeStartup?.id || pitchSending) return;
    setPitchSending(true);
    const { ok, data } = await sendPitch(activeStartup.id, id, draft.trim() || null);
    setPitchSending(false);
    if (ok && data.success) { setDraft(''); await load(); }
    else showToast(data?.error || 'Could not send your pitch.', 'error');
  }

  if (loading) {
    return (
      <Shell persona={persona} displayName={displayName} title="Conversation">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" />
        </div>
      </Shell>
    );
  }

  const other = conversation?.other_display_name || 'them';
  const formed = !!conversation?.team_formed_at;
  const myConfirmed = conversation?.myConfirmed || false;
  const canConfirm = conversation && conversation.startup_id && !formed;

  return (
    <Shell
      persona={persona}
      displayName={displayName}
      title={other}
      subtitle={conversation?.other_headline || 'Conversation'}
    >
      <button onClick={() => navigate('/app/inbox')} className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 mb-5 transition-colors">
        <ArrowLeft size={15} /> Back to messages
      </button>

      {/* WHAT THIS IS ABOUT. A thread with no context is just a name. */}
      {(conversation?.startup_name || conversation?.spark_id) && !formed && (
        <div className="flex items-center gap-2 mb-4 text-[13px] text-ink-500">
          {conversation.spark_id
            ? <><Sparkles size={13} className="text-violet-500" /> About an idea that was shared</>
            : <><Building2 size={13} className="text-ink-300" /> About {conversation.startup_name}</>}
        </div>
      )}

      {formed && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-xl bg-ink-950 p-6 mb-5"
        >
          <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, #1F5D52 0%, transparent 55%), radial-gradient(circle at 80% 70%, #7C5CFC 0%, transparent 55%)' }} />
          <div className="relative flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-mint-500/20 flex items-center justify-center shrink-0">
              <Check size={17} className="text-mint-500" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-white">You are building this together.</p>
              <p className="text-[13px] text-white/60 mt-0.5">
                {other} is on the team. Roles and readiness were recalculated automatically.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      <div className="bg-surface rounded-xl border border-surface-border shadow-card flex flex-col h-[540px] overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-8">
              <p className="text-[15px] text-ink-700 mb-1">Nothing said yet.</p>
              <p className="text-[13px] text-ink-500 max-w-xs">
                Tell {other} what you are thinking. Most teams here started with one honest message.
              </p>
            </div>
          ) : messages.map((m, i) => {
            const mine = m.sender_id === myUserId;
            const prev = messages[i - 1];
            const showDay = !prev || dayLabel(prev.created_at) !== dayLabel(m.created_at);
            const time = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <React.Fragment key={m.id}>
                {showDay && (
                  <div className="flex items-center gap-3 my-5 first:mt-0">
                    <div className="flex-1 h-px bg-surface-border" />
                    <span className="text-[11px] font-medium text-ink-300 uppercase tracking-wide">{dayLabel(m.created_at)}</span>
                    <div className="flex-1 h-px bg-surface-border" />
                  </div>
                )}

                {m.message_type === 'PITCH' && m.pitch_startup_id ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex mb-3 ${mine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="max-w-[82%] relative overflow-hidden rounded-2xl bg-ink-950 p-6">
                      <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, #7C5CFC 0%, transparent 55%), radial-gradient(circle at 80% 70%, #1F5D52 0%, transparent 55%)' }} />
                      <div className="relative">
                        <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] uppercase text-mint-500 mb-3">
                          <span className="w-1.5 h-1.5 rounded-full bg-mint-500" />
                          {mine ? 'You sent your pitch' : 'They sent you their pitch'}
                        </p>
                        <p className="text-[15px] text-white/85 leading-relaxed mb-5">{m.content}</p>
                        <Link
                          to={`/app/pitch/${m.pitch_startup_id}`}
                          className="inline-flex items-center gap-2 bg-white hover:bg-white/90 text-ink-950 px-5 py-2.5 rounded-full text-[14px] font-medium transition-colors"
                        >
                          <Presentation size={15} /> {mine ? 'See what they see' : 'Hear the pitch'}
                        </Link>
                        <p className="text-[10.5px] text-white/30 mt-4">{time}</p>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22 }}
                    className={`flex mb-2 ${mine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                      mine
                        ? 'bg-violet-600 text-white rounded-br-md'
                        : 'bg-surface-muted text-ink-900 rounded-bl-md'
                    }`}>
                      <p className="text-[14.5px] leading-relaxed whitespace-pre-wrap">{m.content}</p>
                      <p className={`text-[10.5px] mt-1 ${mine ? 'text-white/50' : 'text-ink-300'}`}>{time}</p>
                    </div>
                  </motion.div>
                )}
              </React.Fragment>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {persona === 'FOUNDER' && activeStartup?.id && !formed && (
          <div className="border-t border-surface-border px-5 py-2.5">
            <button
              onClick={handleSendPitch}
              disabled={pitchSending}
              className="flex items-center gap-2 text-[13px] font-medium text-violet-700 hover:text-violet-600 transition-colors disabled:opacity-50"
            >
              <Presentation size={14} />
              {pitchSending ? 'Sending…' : `Pitch ${activeStartup.name} to ${other}`}
            </button>
          </div>
        )}

        <div className="border-t border-surface-border p-4 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={`Message ${other}…`}
            className="flex-1 px-4 py-2.5 rounded-full border border-surface-border bg-surface-muted text-[14.5px] text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-violet-500 focus:bg-surface transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={sending || !draft.trim()}
            className="bg-violet-600 hover:bg-violet-700 text-white w-11 h-11 rounded-full flex items-center justify-center transition-colors disabled:opacity-40 shrink-0"
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      {/* THE DECISION. This is the most consequential action on the platform
          and it was a plain card that looked like a form. It now says what
          actually happens, and shows honestly who is waiting on whom. */}
      {canConfirm && (
        <div className="relative overflow-hidden rounded-xl bg-ink-950 p-7 mt-5">
          <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle at 15% 25%, #7C5CFC 0%, transparent 55%), radial-gradient(circle at 85% 75%, #1F5D52 0%, transparent 55%)' }} />
          <div className="relative flex items-center justify-between gap-8 flex-wrap">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-mint-500 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-mint-500" />
                {myConfirmed ? 'Waiting on them' : 'When you are both ready'}
              </p>
              <p className="font-display text-[22px] font-semibold text-white leading-snug mb-2">
                {myConfirmed ? `You are in. ${other} has not confirmed yet.` : `Build this with ${other}?`}
              </p>
              <p className="text-[14px] text-white/60 leading-relaxed max-w-lg">
                {myConfirmed
                  ? 'Nothing changes until they confirm too. Neither of you can commit the other.'
                  : 'Both of you have to say yes. When you do, they join the team for real and the venture is reassessed with them on it.'}
              </p>
            </div>
            <button
              onClick={handleConfirm}
              disabled={confirming || myConfirmed}
              className="shrink-0 flex items-center gap-2 bg-white hover:bg-white/90 text-ink-950 px-6 py-3 rounded-full text-[14px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Handshake size={16} />
              {myConfirmed ? 'Waiting on them' : confirming ? 'Confirming…' : "I'm in"}
            </button>
          </div>
        </div>
      )}
    </Shell>
  );
}
