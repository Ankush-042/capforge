import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Scale } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { rankCandidates, sendConnection } from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';

export default function CandidateComparison() {
  const [searchParams] = useSearchParams();
  const gapId = searchParams.get('gap');
  const startupId = searchParams.get('startup');
  const showToast = useToast();
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState([]);

  useEffect(() => {
    async function load() {
      if (!gapId) { setLoading(false); return; }
      const { ok, data } = await rankCandidates(gapId);
      if (ok && data.success) setCandidates(data.recommendations);
      setLoading(false);
    }
    load();
  }, [gapId]);

  async function handleConnect(c) {
    const { ok, data } = await sendConnection({ receiverId: c.target_user_id, startupId, sourceGapId: gapId });
    if (ok && data.success) showToast('Connection request sent.');
    else showToast(data.error === 'DUPLICATE_PENDING_REQUEST' ? 'Already sent.' : 'Could not send request.', 'error');
  }

  if (loading) return <Shell title="Compare candidates"><div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" /></div></Shell>;

  return (
    <Shell title="Compare candidates" subtitle="Real ranked results">
      <PageHeader icon={Scale} iconBg="bg-blue-50" iconColor="text-blue-500" title="Compare candidates" subtitle="Real ranked results" />
      {candidates.length === 0 ? (
        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-12 text-center">
          <p className="text-[15px] text-ink-500">No candidates ranked yet for this gap.</p>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-surface-border shadow-card overflow-hidden">
          <table className="w-full text-[15px]">
            <thead><tr className="border-b border-surface-border">
              <th className="text-left px-6 py-4 text-[13px] font-medium text-ink-500">Candidate</th>
              <th className="text-left px-6 py-4 text-[13px] font-medium text-ink-500">Match</th>
              <th className="text-left px-6 py-4 text-[13px] font-medium text-ink-500">Skill fit</th>
              <th className="text-left px-6 py-4 text-[13px] font-medium text-ink-500">Domain fit</th>
              <th className="text-left px-6 py-4 text-[13px] font-medium text-ink-500">Stage fit</th>
              <th className="text-left px-6 py-4 text-[13px] font-medium text-ink-500">Experience</th>
              <th></th>
            </tr></thead>
            <tbody>
              {candidates.map((c) => (
                <tr key={c.id} className="border-b border-surface-border last:border-0 hover:bg-surface-muted/50">
                  <td className="px-6 py-4 font-medium text-ink-900">{c.candidate_headline}</td>
                  <td className="px-6 py-4 text-violet-600 font-medium">{Math.round(c.score * 100)}%</td>
                  <td className="px-6 py-4 text-ink-700">{Math.round((c.score_breakdown?.skillFit || 0) * 100)}%</td>
                  <td className="px-6 py-4 text-ink-700">{Math.round((c.score_breakdown?.domainFit || 0) * 100)}%</td>
                  <td className="px-6 py-4 text-ink-700">{Math.round((c.score_breakdown?.stageFit || 0) * 100)}%</td>
                  <td className="px-6 py-4 text-ink-700">{Math.round((c.score_breakdown?.experienceFit || 0) * 100)}%</td>
                  <td className="px-6 py-4"><button onClick={() => handleConnect(c)} className="text-xs bg-violet-50 text-violet-700 px-3 py-1.5 rounded-lg font-medium hover:bg-violet-100 transition-colors">Connect</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}
