import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Target, RefreshCw } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import Badge from '../components/charts/Badge.jsx';
import { getMyStartups, getGaps, diagnoseGaps } from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';

function GapRow({ gap, startupId }) {
  return (
    <Link to={`/app/gaps/${gap.id}?startup=${startupId}`} className="flex items-center justify-between py-4 px-1 border-b border-surface-border last:border-0 hover:bg-surface-muted/50 -mx-1 rounded-lg transition-colors">
      <div className="min-w-0">
        <p className="text-[15px] font-medium text-ink-900">{gap.role}</p>
        <p className="text-[13px] text-ink-500 mt-0.5 max-w-md truncate">{gap.reason}</p>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <div className="w-24">
          <div className="h-1.5 bg-surface-muted rounded-full overflow-hidden">
            <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${gap.coverage * 100}%` }} />
          </div>
          <p className="text-[11px] text-ink-300 mt-1">{Math.round(gap.coverage * 100)}% covered</p>
        </div>
        {gap.seeking_type === 'CO_FOUNDER' && <Badge label="Co-founder search" priority="CO_FOUNDER" />}
        <Badge label={gap.priority_level} priority={gap.priority_level} />
      </div>
    </Link>
  );
}

export default function GapDashboard() {
  const [loading, setLoading] = useState(true);
  const [diagnosing, setDiagnosing] = useState(false);
  const [startup, setStartup] = useState(null);
  const [gaps, setGaps] = useState([]);

  async function loadGaps(startupId) {
    const { ok, data } = await getGaps(startupId);
    if (ok && data.success) setGaps(data.gaps);
  }

  useEffect(() => {
    async function load() {
      const { ok, data } = await getMyStartups();
      if (ok && data.success && data.startups.length > 0) {
        setStartup(data.startups[0]);
        await loadGaps(data.startups[0].id);
      }
      setLoading(false);
    }
    load();
  }, []);

  const showToast = useToast();

  async function handleDiagnose() {
    if (!startup) {
      showToast('No startup found — complete onboarding first.', 'error');
      return;
    }
    setDiagnosing(true);
    const { ok, data } = await diagnoseGaps(startup.id);
    if (!ok || !data.success) {
      showToast(data.detail || data.error || 'Diagnosis failed — try again.', 'error');
      setDiagnosing(false);
      return;
    }
    await loadGaps(startup.id);
    setDiagnosing(false);
    showToast('Gap diagnosis updated.');
  }

  if (loading) return <Shell title="Gaps"><div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" /></div></Shell>;

  const criticalCount = gaps.filter((g) => g.priority_level === 'CRITICAL').length;

  return (
    <Shell title={startup?.name || 'Gaps'} subtitle="Gap diagnosis">
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center"><Target size={18} /></div>
          <div>
            <h1 className="text-[26px] font-semibold text-ink-900 tracking-tight">Gap diagnosis</h1>
            <p className="text-sm text-ink-500 mt-1">What this venture needs, ranked by priority.</p>
          </div>
        </div>
        <button onClick={handleDiagnose} disabled={diagnosing || !startup}
          className="flex items-center gap-2 text-sm bg-ink-900 hover:bg-ink-700 text-white px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50">
          <RefreshCw size={14} className={diagnosing ? 'animate-spin' : ''} />
          {diagnosing ? 'Diagnosing…' : 'Re-run diagnosis'}
        </button>
      </div>

      <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
        {gaps.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-[15px] text-ink-500 mb-4">No gaps diagnosed yet.</p>
            <button onClick={handleDiagnose} className="text-sm bg-violet-50 text-violet-700 px-4 py-2.5 rounded-lg font-medium hover:bg-violet-100 transition-colors">Run diagnosis</button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2 pb-2">
              <span className="text-[13px] text-ink-500">{gaps.length} role{gaps.length !== 1 ? 's' : ''} assessed</span>
              {criticalCount > 0 && <span className="text-[13px] text-signal-critical font-medium">{criticalCount} critical</span>}
            </div>
            {gaps.map((g) => <GapRow key={g.id} gap={g} startupId={startup.id} />)}
          </>
        )}
      </div>
    </Shell>
  );
}
