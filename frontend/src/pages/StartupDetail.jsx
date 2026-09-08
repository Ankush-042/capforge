import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Building2, MessageCircle } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import PageHeader from '../components/PageHeader.jsx';
import VentureSummaryCard from '../components/VentureSummaryCard.jsx';
import { useMyPersona } from '../hooks/useMyPersona.js';
import { getStartup, getVentureSummary, startConversation, getMyProfile } from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';

export default function StartupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();
  const { persona, displayName } = useMyPersona();
  const [loading, setLoading] = useState(true);
  const [startup, setStartup] = useState(null);
  const [summary, setSummary] = useState(null);
  const [myUserId, setMyUserId] = useState(null);

  useEffect(() => {
    async function load() {
      const [startupRes, summaryRes] = await Promise.all([getStartup(id), getVentureSummary(id)]);
      if (startupRes.ok && startupRes.data.success) setStartup(startupRes.data.startup);
      if (summaryRes.ok && summaryRes.data.success) setSummary(summaryRes.data.summary);
      setLoading(false);
    }
    load();
  }, [id]);

  useEffect(() => {
    if (startup) {
      getMyProfile().then(({ ok, data }) => { if (ok && data.success) setMyUserId(data.profile.user_id); });
    }
  }, [startup]);

  // Real fix for a confirmed gap: there was no way for a contributor
  // OR investor to message a founder from this page at all — the
  // whole investor-connect flow was structurally missing entirely.
  // Reuses the exact same proven conversation mechanism already used
  // by founders and contributors elsewhere, rather than building a
  // separate, half-finished system.
  async function handleMessage() {
    const { ok, data } = await startConversation(startup.founder_id, { startupId: startup.id });
    if (ok && data.success) navigate(`/app/inbox/${data.conversation.id}`);
    else showToast(data.error || 'Could not start a conversation.', 'error');
  }

  if (loading) return <Shell persona={persona} displayName={displayName} title="Startup profile"><div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" /></div></Shell>;
  if (!startup) return <Shell persona={persona} displayName={displayName} title="Startup profile"><div className="bg-surface rounded-xl border border-surface-border shadow-card p-12 text-center"><p className="text-[15px] text-ink-500">This startup isn't discoverable, or doesn't exist.</p></div></Shell>;

  const isOwnStartup = myUserId && startup.founder_id === myUserId;

  return (
    <Shell persona={persona} displayName={displayName} title={startup.name} subtitle="Startup profile">
      <div className="flex items-start justify-between mb-1">
        <PageHeader icon={Building2} iconBg="bg-violet-50" iconColor="text-violet-600" title={startup.name} subtitle={`${(startup.domain || []).join(', ')} · ${startup.stage} stage · ${startup.visibility}`} />
        {!isOwnStartup && myUserId && (
          <button onClick={handleMessage} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shrink-0">
            <MessageCircle size={16} /> Message founder
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-surface rounded-xl border border-surface-border shadow-card p-7">
          {startup.founder_vision && (
            <div className="mb-6 bg-violet-50 rounded-lg p-5">
              <p className="text-[13px] font-medium text-violet-700 mb-1.5">The founder's vision — in their own words</p>
              <p className="text-[15px] text-ink-700 leading-relaxed italic">"{startup.founder_vision}"</p>
            </div>
          )}
          <p className="text-[15px] font-semibold text-ink-900 mb-2">Problem</p>
          <p className="text-[15px] text-ink-700 leading-relaxed mb-5">{startup.problem}</p>
          <p className="text-[15px] font-semibold text-ink-900 mb-2">Solution</p>
          <p className="text-[15px] text-ink-700 leading-relaxed">{startup.solution}</p>
        </div>

        {/* Same unified artifact a founder sees for their own venture — genuinely comparable across every startup. */}
        {summary && <VentureSummaryCard summary={summary} />}
      </div>
    </Shell>
  );
}
