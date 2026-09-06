import React, { useState, useEffect } from 'react';
import { Eye } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import VentureSummaryCard from '../components/VentureSummaryCard.jsx';
import { getVentureSummary } from '../services/startups.js';
import { useActiveStartup } from '../context/ActiveStartupContext.jsx';

/**
 * Operationalizes "investable" as a real, founder-facing concept
 * (Phase 3 / vision statement) — not just a word on a slide. Shows the
 * founder EXACTLY the same artifact an investor sees when looking at
 * their venture, using the identical component.
 */
export default function Investability() {
  const { activeStartup, loading: startupLoading } = useActiveStartup();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    async function load() {
      if (startupLoading) return;
      if (activeStartup) {
        const res = await getVentureSummary(activeStartup.id);
        if (res.ok && res.data.success) setSummary(res.data.summary);
      }
      setLoading(false);
    }
    load();
  }, [activeStartup?.id, startupLoading]);

  if (loading) return <Shell title="Investability"><div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" /></div></Shell>;

  return (
    <Shell title="Investability" subtitle="What an investor sees">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center"><Eye size={18} /></div>
        <div>
          <h1 className="text-[26px] font-semibold text-ink-900 tracking-tight">Investability</h1>
          <p className="text-sm text-ink-500 mt-1">The exact summary an investor would see if they discovered your venture.</p>
        </div>
      </div>
      {!summary ? (
        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-12 text-center">
          <p className="text-[15px] text-ink-500">No startup found — complete Onboarding first.</p>
        </div>
      ) : (
        <VentureSummaryCard summary={summary} />
      )}
    </Shell>
  );
}
