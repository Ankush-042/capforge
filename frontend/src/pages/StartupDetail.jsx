import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import PageHeader from '../components/PageHeader.jsx';
import VentureSummaryCard from '../components/VentureSummaryCard.jsx';
import { getStartup, getVentureSummary } from '../services/startups.js';

export default function StartupDetail() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [startup, setStartup] = useState(null);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    async function load() {
      const [startupRes, summaryRes] = await Promise.all([getStartup(id), getVentureSummary(id)]);
      if (startupRes.ok && startupRes.data.success) setStartup(startupRes.data.startup);
      if (summaryRes.ok && summaryRes.data.success) setSummary(summaryRes.data.summary);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return <Shell title="Startup profile"><div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" /></div></Shell>;
  if (!startup) return <Shell title="Startup profile"><div className="bg-surface rounded-xl border border-surface-border shadow-card p-12 text-center"><p className="text-[15px] text-ink-500">This startup isn't discoverable, or doesn't exist.</p></div></Shell>;

  return (
    <Shell title={startup.name} subtitle="Startup profile">
      <PageHeader icon={Building2} iconBg="bg-violet-50" iconColor="text-violet-600" title={startup.name} subtitle={`${(startup.domain || []).join(', ')} · ${startup.stage} stage · ${startup.visibility}`} />

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
