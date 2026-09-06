import React, { useState, useEffect, useRef } from 'react';
import { useMyPersona } from '../hooks/useMyPersona.js';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Handshake, CheckCircle2 } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import { getConversationMessages, sendMessage, getMyProfile, confirmTeamFormation } from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';

/**
 * Phase D — the real mutual-confirm UI. This is the actual replacement
 * for instant accept/reject: both people in the conversation must
 * independently confirm before team-join propagation fires.
 */
export default function ConversationThread() {
  const persona = useMyPersona();
  const { id } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [myUserId, setMyUserId] = useState(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const bottomRef = useRef(null);

  async function load() {
    const [meRes, msgRes] = await Promise.all([getMyProfile(), getConversationMessages(id)]);
    if (meRes.ok && meRes.data.success) setMyUserId(meRes.data.profile.user_id);
    if (msgRes.ok && msgRes.data.success) { setMessages(msgRes.data.messages); setConversation(msgRes.data.conversation); }
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function handleSend() {
    if (!draft.trim()) return;
    setSending(true);
    const { ok, data } = await sendMessage(id, draft);
    setSending(false);
    if (ok && data.success) { setDraft(''); await load(); }
    else showToast(data.error || 'Could not send message.', 'error');
  }

  async function handleConfirm() {
    setConfirming(true);
    const { ok, data } = await confirmTeamFormation(id);
    setConfirming(false);
    if (!ok || !data.success) { showToast(data.detail || data.error || 'Could not confirm.', 'error'); return; }
    if (data.bothConfirmed) {
      showToast('Team formed! Gaps and readiness have been recalculated.');
    } else {
      showToast('You confirmed — waiting on the other person now.');
    }
    await load();
  }

  if (loading) return <Shell persona={persona} title="Conversation"><div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" /></div></Shell>;

  const myConfirmed = conversation?.myConfirmed || false;
  const canConfirm = conversation && conversation.startup_id && !conversation.team_formed_at;

  return (
    <Shell persona={persona} title="Conversation">
      <button onClick={() => navigate('/app/inbox')} className="flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 mb-4 transition-colors">
        <ArrowLeft size={14} /> Back to inbox
      </button>

      {conversation?.team_formed_at && (
        <div className="bg-mint-50 rounded-xl p-4 mb-4 flex items-center gap-3">
          <CheckCircle2 size={18} className="text-mint-500 shrink-0" />
          <p className="text-[14px] text-mint-600 font-medium">Team formed — this person has officially joined the venture. Gaps and readiness were recalculated automatically.</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-surface-border shadow-card flex flex-col h-[500px]">
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {messages.length === 0 ? (
            <p className="text-[13px] text-ink-500 text-center py-10">No messages yet — say hello and see where it goes.</p>
          ) : messages.map((m) => {
            const mine = m.sender_id === myUserId;
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] rounded-xl px-4 py-2.5 text-[14px] ${mine ? 'bg-violet-600 text-white' : 'bg-surface-muted text-ink-900'}`}>
                  {m.content}
                  <p className={`text-[10px] mt-1 ${mine ? 'text-violet-200' : 'text-ink-300'}`}>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
        <div className="border-t border-surface-border p-4 flex gap-2">
          <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message…" className="flex-1 px-4 py-2.5 rounded-lg border border-surface-border bg-surface-muted text-[14px] focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
          <button onClick={handleSend} disabled={sending || !draft.trim()} className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50">
            <Send size={16} />
          </button>
        </div>
      </div>

      {canConfirm && (
        <div className="bg-white rounded-xl border border-surface-border shadow-card p-6 mt-4 flex items-center justify-between">
          <div>
            <p className="text-[15px] font-semibold text-ink-900">Ready to form a team?</p>
            <p className="text-[13px] text-ink-500">Both sides need to confirm — this is a real decision, not a single click.</p>
          </div>
          <button onClick={handleConfirm} disabled={confirming || myConfirmed}
            className="flex items-center gap-2 bg-ink-900 hover:bg-ink-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
            <Handshake size={16} /> {myConfirmed ? "Waiting on the other person…" : confirming ? 'Confirming…' : "I'm in — let's form a team"}
          </button>
        </div>
      )}
    </Shell>
  );
}
