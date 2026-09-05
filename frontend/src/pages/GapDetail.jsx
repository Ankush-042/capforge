import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Target } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import Badge from '../components/charts/Badge.jsx';
import AvatarRow from '../components/charts/AvatarRow.jsx';
import { getGaps, rankCandidates, sendConnection } from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';

export default function GapDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const startupId = searchParams.get('startup');
  const showToast = useToast();

  const [loading, setLoading] = useState(true);
  const [ranking, setRanking] = useState(false);
  const [gap, setGap] = useState(null);
  const [candidates, setCandidates] = useState([]);

  useEffect(() => {
    async function load() {
      if (!startupId) { setLoading(false); return; }
      const { ok, data } = await getGaps(startupId);
      if (ok && data.success) {
        const found = data.gaps.find((g) => g.id === id);
        setGap(found);
      }
      setLoading(false);
    }
    load();
  }, [id, startupId]);

  async function handleRank() {
    setRanking(true);
    const { ok, data } = await rankCandidates(id);
    setRanking(false);
    if (!ok || !data.success) {
      showToast(data.detail || data.error || data.note || 'Ranking failed — no eligible contributors yet.', 'error');
      setCandidates([]);
      return;
    }
    if (data.recommendations.length === 0) {
      showToast(data.note || 'No eligible contributors found for this gap yet.', 'error');
    }
    setCandidates(data.recommendations);
  }

  async function handleConnect(candidate) {
    const { ok, data } = await sendConnection({ receiverId: candidate.target_user_id, startupId, sourceGapId: id, message: `Would love to have you help with ${gap.role}` });
    if (ok && data.success) showToast(`Connection request sent to ${candidate.candidate_headline || 'candidate'}.`);
    else showToast(data.error === 'DUPLICATE_PENDING_REQUEST' ? 'Already sent a request.' : data.error === 'ALREADY_ON_TEAM' ? 'Already on your team.' : 'Could not send request.', 'error');
  }

  if (loading) return <Shell title="Gap detail"><div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" /></div></Shell>;
  if (!gap) return <Shell title="Gap detail"><div className="bg-surface rounded-xl border border-surface-border shadow-card p-12 text-center"><p className="text-[15px] text-ink-500">Gap not found.</p></div></Shell>;

  return (
    <Shell title={gap.role} subtitle="Gap detail">
      <div className="mb-6">
        <p className="text-xs text-ink-500 mb-1">Gap</p>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center"><Target size={18} /></div>
          <h1 className="text-[26px] font-semibold text-ink-900 tracking-tight">{gap.role}</h1>
          <Badge label={gap.priority_level} priority={gap.priority_level} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
          <p className="text-[15px] font-semibold text-ink-900 mb-4">Why this matters</p>
          <p className="text-[15px] text-ink-700 leading-relaxed mb-5">{gap.reason}</p>
          <div className="pt-4 border-t border-surface-border">
            <p className="text-[13px] font-medium text-ink-500 mb-2">Required skills</p>
            <div className="flex flex-wrap gap-2">
              {(gap.required_skills || []).map((s) => <span key={s} className="text-xs px-2.5 py-1 rounded-md bg-violet-50 text-violet-700">{s}</span>)}
            </div>
          </div>
        </div>

        <div className="col-span-2 bg-surface rounded-xl border border-surface-border shadow-card p-7">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[15px] font-semibold text-ink-900">Recommended candidates</p>
            <div className="flex gap-2">
              {candidates.length > 0 && (
                <Link to={`/app/gaps/${id}/compare?gap=${id}&startup=${startupId}`} className="text-xs border border-surface-border text-ink-500 px-3 py-1.5 rounded-lg font-medium hover:bg-surface-muted transition-colors">Compare all</Link>
              )}
              <button onClick={handleRank} disabled={ranking} className="text-xs bg-ink-900 hover:bg-ink-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50">
                {ranking ? 'Ranking…' : 'Rank real candidates'}
              </button>
            </div>
          </div>
          {candidates.length === 0 ? (
            <p className="text-[13px] text-ink-500 py-10 text-center">Click "Rank real candidates" to score the actual contributor pool against this gap.</p>
          ) : candidates.map((c) => (
            <div key={c.id} className="border-b border-surface-border last:border-0 pb-5 mb-5 last:pb-0 last:mb-0">
              <AvatarRow initial={(c.candidate_headline || '?')[0]} name={c.candidate_headline || 'Candidate'} subtitle={`Rank #${c.rank}`}
                trailing={
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-violet-600">{Math.round(c.score * 100)}%</span>
                    <button onClick={() => handleConnect(c)} className="text-xs bg-violet-50 text-violet-700 px-3 py-1.5 rounded-lg font-medium hover:bg-violet-100 transition-colors">Connect</button>
                  </div>
                } />
              <div className="mt-3 pl-12 space-y-1">
                {(c.explanation?.strengths || []).map((s) => <p key={s} className="text-[13px] text-mint-500 flex gap-1.5"><span>✓</span>{s}</p>)}
                {(c.explanation?.limitations || []).map((s) => <p key={s} className="text-[13px] text-amber-500 flex gap-1.5"><span>△</span>{s}</p>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}
