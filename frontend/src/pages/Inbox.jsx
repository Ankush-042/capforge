import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { MessageSquare, Sparkles, Building2 } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import { useMyPersona } from '../hooks/useMyPersona.js';
import { getMyConversations } from '../services/startups.js';

/**
 * Everyone you are talking to.
 *
 * This was a list of rows: an avatar, a name, a truncated last message. It
 * gave no sense of which conversations were alive, which were waiting on
 * you, or what any of them were about. Every row looked identical, so the
 * one where someone is waiting for an answer sat level with a dead thread
 * from a week ago.
 *
 * Conversations here are how a company gets built, so the ones needing a
 * reply come first and say so.
 */

const AVATAR_TONES = [
  { bg: '#EED8FF', fg: '#6D28D9' },
  { bg: '#D1EAFE', fg: '#1677E8' },
  { bg: '#EAF7F0', fg: '#1F5D52' },
  { bg: '#FFE8DA', fg: '#E84C32' },
];

function timeAgo(iso) {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function ConversationCard({ c, index }) {
  const tone = AVATAR_TONES[index % AVATAR_TONES.length];
  const unread = parseInt(c.unread_count) || 0;
  const when = timeAgo(c.last_message_at);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.25), ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        to={`/app/inbox/${c.id}`}
        className={`group relative block overflow-hidden rounded-xl border shadow-card p-5 transition-all duration-200 hover:shadow-elevated hover:-translate-y-0.5 ${
          unread > 0 ? 'bg-surface border-violet-500/40' : 'bg-surface border-surface-border hover:border-violet-500/40'
        }`}
      >
        {unread > 0 && <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-violet-600" />}

        <div className="flex items-start gap-3.5">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center text-[15px] font-semibold shrink-0"
            style={{ backgroundColor: tone.bg, color: tone.fg }}
          >
            {(c.other_display_name || '?').charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3 mb-0.5">
              <p className={`text-[15px] truncate ${unread > 0 ? 'font-semibold text-ink-950' : 'font-medium text-ink-900'}`}>
                {c.other_display_name || 'Someone'}
              </p>
              <div className="flex items-center gap-2 shrink-0">
                {when && <span className="text-[11.5px] text-ink-300">{when}</span>}
                {unread > 0 && (
                  <span className="text-[11px] font-semibold bg-violet-600 text-white rounded-full min-w-[18px] h-[18px] px-1.5 flex items-center justify-center">
                    {unread}
                  </span>
                )}
              </div>
            </div>

            {c.other_headline && (
              <p className="text-[12.5px] text-ink-500 truncate mb-1.5">{c.other_headline}</p>
            )}

            <p className={`text-[13.5px] leading-snug line-clamp-2 ${unread > 0 ? 'text-ink-900' : 'text-ink-700'}`}>
              {c.last_message || 'No messages yet. Say something.'}
            </p>

            {/* What this conversation is ABOUT. Without it a thread is just a
                name, and a founder talking to eight people cannot tell which
                venture or which role any of them concerns. */}
            {(c.startup_name || c.spark_id) && (
              <div className="flex items-center gap-1.5 mt-2.5">
                {c.spark_id ? (
                  <>
                    <Sparkles size={11} className="text-violet-500 shrink-0" />
                    <span className="text-[11.5px] text-violet-700 truncate">About an idea they shared</span>
                  </>
                ) : (
                  <>
                    <Building2 size={11} className="text-ink-300 shrink-0" />
                    <span className="text-[11.5px] text-ink-500 truncate">{c.startup_name}</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function Inbox() {
  const { persona, displayName } = useMyPersona();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    getMyConversations().then(({ ok, data }) => {
      if (ok && data.success) setConversations(data.conversations);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <Shell persona={persona} displayName={displayName} title="Messages">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" />
        </div>
      </Shell>
    );
  }

  const waiting = conversations.filter((c) => (parseInt(c.unread_count) || 0) > 0);
  const rest = conversations.filter((c) => (parseInt(c.unread_count) || 0) === 0);

  return (
    <Shell persona={persona} displayName={displayName} title="Messages" subtitle={
      conversations.length === 0 ? 'Nobody yet' : `${conversations.length} conversation${conversations.length === 1 ? '' : 's'}`
    }>
      <div className="mb-7">
        <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-violet-600 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
          {waiting.length > 0 ? `${waiting.length} waiting on you` : conversations.length > 0 ? 'All caught up' : 'Nothing yet'}
        </p>
        <h1 className="font-editorial italic text-[32px] text-trust-fg leading-tight max-w-3xl">
          {conversations.length === 0
            ? 'No conversations yet.'
            : waiting.length > 0
              ? `${waiting.length === 1 ? 'Someone is' : `${waiting.length} people are`} waiting to hear back.`
              : 'You are up to date.'}
        </h1>
        <p className="text-[15px] text-ink-700 mt-3 max-w-2xl leading-relaxed">
          {conversations.length === 0
            ? 'Every company on here started as two people talking. Reach out to someone and this fills up.'
            : 'This is where teams actually form. Nothing gets built without these.'}
        </p>
      </div>

      {conversations.length === 0 ? (
        <div className="bg-surface rounded-xl border border-surface-border shadow-card py-16 text-center">
          <MessageSquare size={24} className="text-ink-300 mx-auto mb-4" />
          <p className="text-[15px] text-ink-700 mb-1">Nobody to talk to yet.</p>
          <p className="text-[13px] text-ink-500 max-w-sm mx-auto">
            Conversations start when you reach out to someone, or when someone decides they want in on what you are building.
          </p>
        </div>
      ) : (
        <>
          {waiting.length > 0 && (
            <div className="mb-8">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-[15px] font-semibold text-ink-900">Waiting on you</h2>
                <span className="text-[13px] text-ink-500">Answer these first</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {waiting.map((c, i) => <ConversationCard key={c.id} c={c} index={i} />)}
              </div>
            </div>
          )}

          {rest.length > 0 && (
            <div>
              {waiting.length > 0 && (
                <div className="flex items-baseline justify-between mb-3">
                  <h2 className="text-[15px] font-semibold text-ink-900">Everything else</h2>
                  <span className="text-[13px] text-ink-500">Most recent first</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                {rest.map((c, i) => <ConversationCard key={c.id} c={c} index={i} />)}
              </div>
            </div>
          )}
        </>
      )}
    </Shell>
  );
}
