import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { MessageSquare, Sparkles, Building2 } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ConversationThread from './ConversationThread.jsx';
import Avatar from '../components/Avatar.jsx';
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
          <Avatar name={c.other_display_name} src={c.other_avatar} size={44} />

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


/**
 * One conversation in the list. Everything the card carried is here — the
 * person, their last line, the venture it concerns, whether it is waiting on
 * you — in a shape that belongs in a column rather than a grid.
 */
function ConversationRow({ c, active }) {
  const unread = parseInt(c.unread_count) || 0;

  return (
    <Link
      to={`/app/inbox/${c.id}`}
      className={`block px-5 py-4 border-l-2 transition-colors ${
        active
          ? 'bg-violet-50/60 border-l-violet-500'
          : unread > 0
            ? 'border-l-violet-500/40 hover:bg-surface-muted'
            : 'border-l-transparent hover:bg-surface-muted'
      }`}
    >
      <div className="flex items-start gap-3">
        <Avatar name={c.other_display_name} src={c.other_avatar} size={34} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className={`text-[13.5px] truncate ${unread > 0 ? 'font-semibold text-ink-950' : 'font-medium text-ink-900'}`}>
              {c.other_display_name || 'Someone'}
            </p>
            <span className="text-[11px] text-ink-300 shrink-0 tabular-nums">{timeAgo(c.last_message_at)}</span>
          </div>

          <p className={`text-[12.5px] leading-snug line-clamp-2 mt-0.5 ${unread > 0 ? 'text-ink-800' : 'text-ink-500'}`}>
            {c.last_message || 'No messages yet.'}
          </p>

          <div className="flex items-center gap-2 mt-1.5">
            {(c.startup_name || c.spark_id) && (
              <span className="flex items-center gap-1 text-[11px] text-ink-300 truncate">
                {c.spark_id
                  ? <><Sparkles size={10} className="text-violet-500 shrink-0" /> an idea</>
                  : <><Building2 size={10} className="shrink-0" /> {c.startup_name}</>}
              </span>
            )}
            {unread > 0 && (
              <span className="ml-auto min-w-[17px] h-[17px] px-1.5 rounded-full bg-violet-500 text-white text-[10px] font-semibold flex items-center justify-center tabular-nums shrink-0">
                {unread}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function Inbox() {
  const { id: selectedId } = useParams();
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
      {/* TWO PANES, which is the actual fix.
          This was a two-column grid of cards that navigated away to a separate
          page for every conversation, so reading one meant losing the others
          and going back to reach the next. That is not how anybody reads
          messages. The list stays on the left and the conversation opens on
          the right, so moving between eight threads costs eight clicks and no
          navigation at all.

          Nothing about a conversation row changed: the card content was
          already right, carrying the person, the last line, the venture it
          concerns and whether it is waiting on you. */}
      {conversations.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="Nobody to talk to yet."
          body="Conversations start when you reach out to someone, or when somebody decides they want in on what you are building."
        />
      ) : (
        <div className="grid grid-cols-[340px_1fr] gap-6 items-start" style={{ minHeight: 'calc(100vh - 210px)' }}>

          {/* THE LIST */}
          <div className="bg-surface rounded-xl border border-surface-border shadow-card overflow-hidden flex flex-col"
               style={{ maxHeight: 'calc(100vh - 210px)' }}>
            <div className="px-5 py-3.5 border-b border-surface-border shrink-0">
              <p className="text-[10.5px] font-semibold tracking-[0.12em] uppercase text-ink-300">
                {waiting.length > 0 ? `${waiting.length} waiting on you` : 'All caught up'}
              </p>
            </div>

            <div className="overflow-y-auto flex-1">
              {waiting.length > 0 && (
                <>
                  <p className="px-5 pt-4 pb-2 text-[11px] font-semibold tracking-[0.1em] uppercase text-violet-600">
                    Waiting on you
                  </p>
                  {waiting.map((c) => (
                    <ConversationRow key={c.id} c={c} active={c.id === selectedId} />
                  ))}
                </>
              )}

              {rest.length > 0 && (
                <>
                  {waiting.length > 0 && (
                    <p className="px-5 pt-5 pb-2 text-[11px] font-semibold tracking-[0.1em] uppercase text-ink-300">
                      Everything else
                    </p>
                  )}
                  {rest.map((c) => (
                    <ConversationRow key={c.id} c={c} active={c.id === selectedId} />
                  ))}
                </>
              )}
            </div>
          </div>

          {/* THE CONVERSATION */}
          <div className="bg-surface rounded-xl border border-surface-border shadow-card px-7 py-6"
               style={{ minHeight: 'calc(100vh - 210px)' }}>
            {selectedId ? (
              <ConversationThread key={selectedId} conversationId={selectedId} embedded />
            ) : (
              <div className="flex flex-col items-center justify-center text-center h-full py-24">
                <MessageSquare size={22} className="text-ink-300 mb-3" />
                <p className="text-[15px] text-ink-700 mb-1">
                  {waiting.length > 0 ? 'Start with whoever is waiting.' : 'Pick a conversation.'}
                </p>
                <p className="text-[13px] text-ink-500 max-w-xs leading-relaxed">
                  This is where teams actually form. Nothing gets built without these.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </Shell>
  );
}
