import React, { useState, useEffect } from 'react';
import { Gauge, RefreshCw } from 'lucide-react';
import { RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import Shell from '../components/Shell.jsx';
import { getReadiness, assessReadinessRisk } from '../services/startups.js';
import { useActiveStartup } from '../context/ActiveStartupContext.jsx';
import { useToast } from '../components/Toast.jsx';

const DIM_COLORS = { team_composition: '#7C5CFC', market_positioning: '#4C86F9', product_readiness: '#3FB081', funding_readiness: '#F0A84E' };
const dimLabel = (k) => k.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');

export default function Readiness() {
  const { activeStartup, loading: startupLoading } = useActiveStartup();
  const [loading, setLoading] = useState(true);
  const [assessing, setAssessing] = useState(false);
  const [startup, setStartup] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const showToast = useToast();

  async function loadReadiness(startupId) {
    const { ok, data } = await getReadiness(startupId);
    if (ok && data.success) setReadiness(data.readiness);
  }

  useEffect(() => {
    async function load() {
      if (startupLoading) return;
      if (activeStartup) {
        setStartup(activeStartup);
        await loadReadiness(activeStartup.id);
      }
      setLoading(false);
    }
    load();
  }, [activeStartup?.id, startupLoading]);

  async function handleAssess() {
    if (!startup) { showToast('No startup found — complete onboarding first.', 'error'); return; }
    setAssessing(true);
    const { ok, data } = await assessReadinessRisk(startup.id);
    if (!ok || !data.success) { showToast(data.detail || data.error || 'Assessment failed — try again.', 'error'); setAssessing(false); return; }
    await loadReadiness(startup.id);
    setAssessing(false);
    showToast('Readiness assessment updated.');
  }

  if (loading) return <Shell title="Readiness"><div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" /></div></Shell>;

  return (
    <Shell title={startup?.name || 'Readiness'} subtitle="Readiness">
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center"><Gauge size={18} /></div>
          <div>
            <h1 className="text-[26px] font-semibold text-ink-900 tracking-tight">Readiness</h1>
            <p className="text-sm text-ink-500 mt-1">Based on currently available information — not a guarantee of success.</p>
          </div>
        </div>
        <button onClick={handleAssess} disabled={assessing || !startup}
          className="flex items-center gap-2 text-sm bg-ink-900 hover:bg-ink-700 text-white px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50">
          <RefreshCw size={14} className={assessing ? 'animate-spin' : ''} />{assessing ? 'Assessing…' : 'Re-assess'}
        </button>
      </div>

      {!readiness ? (
        <div className="bg-white rounded-xl border border-surface-border shadow-card p-12 text-center">
          <p className="text-[15px] text-ink-500 mb-4">No readiness assessment yet.</p>
          <button onClick={handleAssess} className="text-sm bg-violet-50 text-violet-700 px-4 py-2.5 rounded-lg font-medium hover:bg-violet-100 transition-colors">Run assessment</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-6 mb-6">
            {/* Real circular gauge instead of a bare number in a huge empty box */}
            <div className="bg-white rounded-xl border border-surface-border shadow-card p-7 flex flex-col items-center justify-center">
              <div className="relative w-[160px] h-[160px]">
                <RadialBarChart width={160} height={160} innerRadius="72%" outerRadius="100%" barSize={12} data={[{ value: readiness.overall_score, fill: '#7C5CFC' }]} startAngle={90} endAngle={-270}>
                  <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                  <RadialBar background={{ fill: '#F1EEFE' }} dataKey="value" cornerRadius={8} />
                </RadialBarChart>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-4xl font-bold text-violet-600">{Math.round(readiness.overall_score)}</p>
                </div>
              </div>
              <p className="text-[13px] text-ink-500 mt-2">Overall readiness</p>
            </div>

            {/* Real per-dimension bars with the actual justification text, not just a donut legend */}
            <div className="col-span-2 bg-white rounded-xl border border-surface-border shadow-card p-7">
              <p className="text-[15px] font-semibold text-ink-900 mb-4">By dimension</p>
              <div className="space-y-4">
                {Object.entries(readiness.dimensions).map(([key, value]) => (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[13px] font-medium text-ink-700">{dimLabel(key)}</span>
                      <span className="text-[13px] font-semibold text-ink-900">{Math.round(value * 100)}%</span>
                    </div>
                    <div className="h-2 bg-surface-muted rounded-full overflow-hidden mb-1.5">
                      <div className="h-full rounded-full" style={{ width: `${value * 100}%`, backgroundColor: DIM_COLORS[key] || '#7C5CFC' }} />
                    </div>
                    <p className="text-[12px] text-ink-500">{readiness.dimension_justifications?.[key]}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {readiness.critical_issues?.length > 0 && (
            <div className="bg-white rounded-xl border border-surface-border shadow-card p-7">
              <p className="text-[15px] font-semibold text-ink-900 mb-4">Critical issues</p>
              <div className="space-y-3">
                {readiness.critical_issues.map((a) => (
                  <div key={a} className="flex items-center gap-3 text-[15px] text-ink-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-signal-critical" />{a}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Shell>
  );
}
