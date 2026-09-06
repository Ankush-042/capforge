import React, { useState, useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import Badge from '../components/charts/Badge.jsx';
import { getRisks } from '../services/startups.js';
import { useActiveStartup } from '../context/ActiveStartupContext.jsx';

export default function RiskPage() {
  const { activeStartup, loading: startupLoading } = useActiveStartup();
  const [loading, setLoading] = useState(true);
  const [startup, setStartup] = useState(null);
  const [risks, setRisks] = useState([]);

  useEffect(() => {
    async function load() {
      if (startupLoading) return;
      if (activeStartup) {
        setStartup(activeStartup);
        const risksRes = await getRisks(activeStartup.id);
        if (risksRes.ok && risksRes.data.success) setRisks(risksRes.data.risks);
      }
      setLoading(false);
    }
    load();
  }, [activeStartup?.id, startupLoading]);

  if (loading) return <Shell title="Risk"><div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" /></div></Shell>;

  return (
    <Shell title={startup?.name || 'Risk'} subtitle="Risk overview">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center"><ShieldAlert size={18} /></div>
        <div>
          <h1 className="text-[26px] font-semibold text-ink-900 tracking-tight">Risk overview</h1>
          <p className="text-sm text-ink-500 mt-1">{risks.length} risk{risks.length !== 1 ? 's' : ''} identified</p>
        </div>
      </div>
      {risks.length === 0 ? (
        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-12 text-center">
          <p className="text-[15px] text-ink-500">No risks flagged, or run an assessment on the Readiness page first.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {risks.map((r, i) => (
            <div key={r.id} className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-ink-300 text-sm font-mono">{String(i + 1).padStart(2, '0')}</span>
                  <p className="text-[15px] font-semibold text-ink-900">{r.title}</p>
                </div>
                <Badge label={`${r.category} · ${r.severity}`} priority={r.severity} />
              </div>
              <p className="text-[15px] text-ink-700 mb-3 pl-8">{r.description}</p>
              {r.suggested_action && <p className="text-[13px] text-violet-600 pl-8">→ {r.suggested_action}</p>}
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
