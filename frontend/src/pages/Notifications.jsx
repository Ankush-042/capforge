import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Bell, MessageSquare, Sparkles, Building2, Users, Check } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import { useMyPersona } from '../hooks/useMyPersona.js';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../services/startups.js';

/**
 * What happened while you were away.
 *
 * Every notification looked identical: a dot, a title, a message, a
 * timestamp. Nothing distinguished someone wanting to build with you from a
 * background analysis finishing, and clicking most of them went nowhere.
 *
 * CONFIRMED BUG, fixed here: the click handler only knew 'conversation' and
 * 'connection'. The SPARK and STARTUP notifications added later, which
 * include the most important event on the platform, someone resonating with
 * your idea, were dead ends. Verified by grepping every referenceType the
 * backend actually creates.
 */

const KIND = {
  SPARK: { icon: Sparkles, fg: '#6845F0', bg: '#F1EEFE' },
  STARTUP: { icon: Building2, fg: '#1F5D52', bg: '#EAF7F0' },
  conversation: { icon: MessageSquare, fg: '#1677E8', bg: '#D1EAFE' },
  connection: { icon: Users, fg: '#E84C32', bg: '#FFE8DA' },
};

function kindOf(n) {
  return KIND[n.reference_type] || { icon: Bell, fg: '#6E7079', bg: '#F4F4F7' };
}

function timeAgo(iso) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function Notifications() {
  const { persona, displayName } = useMyPersona();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  async function load() {
    const { ok, data } = await getNotifications();
    if (ok && data.success) setItems(data.notifications);
  }

  useEffect(() => { load().then(() => setLoading(false)); }, []);

  async function markAllRead() {
    await markAllNotificationsRead();
    await load();
  }

  async function handleClick(n) {
    if (!n.is_read) { await markNotificationRead(n.id); await load(); }

    // Every reference type the backend actually creates, verified by grep:
    // SPARK, STARTUP, conversation, connection. The first two were added
    // with the spark flow and had no handler, so the single most important
    // notification on the platform, someone wanting to build your idea with
    // you, did nothing when clicked.
    switch (n.reference_type) {
      case 'conversation':
        navigate(`/app/inbox/${n.reference_id}`);
        break;
      case 'SPARK':
        navigate(`/app/sparks/${n.reference_id}`);
        break;
      case 'STARTUP':
        navigate(`/app/startups/${n.reference_id}`);
        break;
      case 'connection':
        navigate('/app/inbox');
        break;
      default:
        break;
    }
  }

  if (loading) {
    return (
      <Shell persona={persona} displayName={displayName} title="Notifications">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" />
        </div>
      </Shell>
    );
  }

  const unread = items.filter((n) => !n.is_read);
  const read = items.filter((n) => n.is_read);

  function Row({ n, index }) {
    const kind = kindOf(n);
    const Icon = kind.icon;
    return (
      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, delay: Math.min(index * 0.03, 0.25) }}
        onClick={() => handleClick(n)}
        className={`w-full text-left flex items-start gap-4 rounded-xl border shadow-card p-5 transition-all duration-200 hover:shadow-elevated hover:-translate-y-0.5 ${
          n.is_read ? 'bg-surface border-surface-border' : 'bg-surface border-violet-500/40'
        }`}
      >
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: kind.bg, color: kind.fg }}>
          <Icon size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className={`text-[14.5px] leading-snug ${n.is_read ? 'font-medium text-ink-900' : 'font-semibold text-ink-950'}`}>
              {n.title}
            </p>
            <span className="text-[11.5px] text-ink-300 shrink-0">{timeAgo(n.created_at)}</span>
          </div>
          {n.message && <p className="text-[13.5px] text-ink-700 mt-1 leading-relaxed">{n.message}</p>}
        </div>
      </motion.button>
    );
  }

  return (
    <Shell persona={persona} displayName={displayName} title="Notifications" subtitle={
      unread.length > 0 ? `${unread.length} unread` : 'All caught up'
    }>
      <div className="mb-7 flex items-start justify-between gap-6">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-violet-600 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
            {items.length === 0 ? 'Nothing yet' : unread.length > 0 ? `${unread.length} new` : 'All caught up'}
          </p>
          <h1 className="font-editorial italic text-[32px] text-trust-fg leading-tight">
            {items.length === 0
              ? 'Nothing has happened yet.'
              : unread.length > 0
                ? `${unread.length === 1 ? 'One thing' : `${unread.length} things`} happened while you were away.`
                : 'You are up to date.'}
          </h1>
        </div>
        {unread.length > 0 && (
          <button
            onClick={markAllRead}
            className="shrink-0 flex items-center gap-1.5 text-[13px] font-medium text-ink-500 hover:text-violet-700 transition-colors"
          >
            <Check size={14} /> Mark all read
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="bg-surface rounded-xl border border-surface-border shadow-card py-16 text-center">
          <Bell size={22} className="text-ink-300 mx-auto mb-3" />
          <p className="text-[15px] text-ink-700 mb-1">Nothing yet.</p>
          <p className="text-[13px] text-ink-500 max-w-sm mx-auto">
            You will hear when someone wants in on your idea, when a conversation moves, or when an analysis finishes.
          </p>
        </div>
      ) : (
        <>
          {unread.length > 0 && (
            <div className="mb-8">
              <h2 className="text-[15px] font-semibold text-ink-900 mb-3">New</h2>
              <div className="space-y-3">
                {unread.map((n, i) => <Row key={n.id} n={n} index={i} />)}
              </div>
            </div>
          )}
          {read.length > 0 && (
            <div>
              {unread.length > 0 && <h2 className="text-[15px] font-semibold text-ink-900 mb-3">Earlier</h2>}
              <div className="space-y-3">
                {read.slice(0, 30).map((n, i) => <Row key={n.id} n={n} index={i} />)}
              </div>
            </div>
          )}
        </>
      )}
    </Shell>
  );
}
