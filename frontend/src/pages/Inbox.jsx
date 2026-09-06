import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import PageHeader from '../components/PageHeader.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { getMyConversations } from '../services/startups.js';

/**
 * Phase B — the real inbox. This is the actual place two matched
 * people talk before deciding to work together — previously there was
 * nowhere for this to happen at all.
 */
export default function Inbox() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    getMyConversations().then(({ ok, data }) => {
      if (ok && data.success) setConversations(data.conversations);
      setLoading(false);
    });
  }, []);

  if (loading) return <Shell title="Inbox"><div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" /></div></Shell>;

  return (
    <Shell title="Inbox">
      <PageHeader icon={MessageCircle} iconBg="bg-violet-50" iconColor="text-violet-600" title="Conversations" />
      {conversations.length === 0 ? (
        <div className="bg-white rounded-xl border border-surface-border shadow-card">
          <EmptyState icon={MessageCircle} message="No conversations yet. Express interest in a match to start one." />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-surface-border shadow-card">
          {conversations.map((c) => (
            <button key={c.id} onClick={() => navigate(`/app/inbox/${c.id}`)}
              className="hover-lift w-full text-left flex items-center gap-4 p-5 border-b border-surface-border last:border-0 hover:bg-surface-muted/50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-sm font-medium text-white shrink-0">
                {(c.other_display_name || '?')[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-[15px] font-medium text-ink-900">{c.other_display_name}</p>
                  {c.unread_count > 0 && <span className="text-[11px] bg-violet-600 text-white rounded-full px-1.5 py-0.5 font-medium">{c.unread_count}</span>}
                </div>
                <p className="text-[13px] text-ink-500 truncate">{c.last_message || 'No messages yet — say hello.'}</p>
                {c.startup_name && <p className="text-[11px] text-ink-300 mt-0.5">Re: {c.startup_name}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </Shell>
  );
}
