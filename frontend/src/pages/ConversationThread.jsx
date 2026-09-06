import React, { useState, useEffect, useRef } from 'react';
import { useMyPersona } from '../hooks/useMyPersona.js';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import { getConversationMessages, sendMessage, getMyProfile } from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';

export default function ConversationThread() {
  const persona = useMyPersona();
  const { id } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [myUserId, setMyUserId] = useState(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  async function load() {
    const [meRes, msgRes] = await Promise.all([getMyProfile(), getConversationMessages(id)]);
    if (meRes.ok && meRes.data.success) setMyUserId(meRes.data.profile.user_id);
    if (msgRes.ok && msgRes.data.success) setMessages(msgRes.data.messages);
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

  if (loading) return <Shell persona={persona} title="Conversation"><div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" /></div></Shell>;

  return (
    <Shell persona={persona} title="Conversation">
      <button onClick={() => navigate('/app/inbox')} className="flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 mb-4 transition-colors">
        <ArrowLeft size={14} /> Back to inbox
      </button>
      <div className="bg-white rounded-xl border border-surface-border shadow-card flex flex-col h-[560px]">
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
    </Shell>
  );
}
