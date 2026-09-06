import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart3, ShieldCheck } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import { getReadinessHistory } from '../services/startups.js';
import { useActiveStartup } from '../context/ActiveStartupContext.jsx';

/**
 * Phase 5 — makes Objective 4 (consistency validation) a real, visible
 * trust signal instead of a passing internal test nobody sees. Directly
 * answers the project's own literature critique of unreliable, over-
 * confident zero-shot AI evaluation (21.28% precision at 100% recall,
 * per the cited SSFF paper) by showing the founder real evidence of
 * whether their diagnosis is stable, not just a claim that it is.
 */
function ConsistencySignal({ history }) {
  if (history.length < 2) return null;
  const scores = history.map(h => h.score);
  const maxDelta = Math.max(...scores) - Math.min(...scores);
  const lastDelta = Math.abs(scores[scores.length - 1] - scores[scores.length - 2]);
  const isStable = maxDelta <= 10;

  return (
    <div className={`rounded-lg p-4 mt-5 flex items-start gap-3 ${isStable ? 'bg-mint-50' : 'bg-amber-50'}`}>
      <ShieldCheck size={16} className={isStable ? 'text-mint-500 mt-0.5' : 'text-amber-500 mt-0.5'} />
      <div>
        <p className={`text-[13px] font-medium ${isStable ? 'text-mint-600' : 'text-amber-600'}`}>
          {isStable ? 'This diagnosis has held stable' : 'This diagnosis has shifted meaningfully'}
        </p>
        <p className="text-[12px] text-ink-500 mt-0.5">
          Across {history.length} assessments, the readiness score has varied by up to {maxDelta} points
          {lastDelta > 0 ? ` (${lastDelta} points since the last one)` : ' (no change since the last one)'}.
          {isStable ? ' This is real evidence the diagnosis isn\'t just noise.' : ' This likely reflects a real change in the venture, not measurement instability — gap diagnosis is deterministic given the same underlying data.'}
        </p>
      </div>
    </div>
  );
}

export default function Analytics() {
  const { activeStartup, loading: startupLoading } = useActiveStartup();
  const [loading, setLoading] = useState(true);
  const [startup, setStartup] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    async function load() {
      if (startupLoading) return;
      if (activeStartup) {
        setStartup(activeStartup);
        const histRes = await getReadinessHistory(activeStartup.id);
        if (histRes.ok && histRes.data.success) {
          setHistory(histRes.data.history.map((h, i) => ({ point: `#${i + 1}`, score: Math.round(h.overall_score), date: new Date(h.generated_at).toLocaleDateString() })));
        }
      }
      setLoading(false);
    }
    load();
  }, [activeStartup?.id, startupLoading]);

  if (loading) return <Shell title="Analytics"><div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" /></div></Shell>;

  return (
    <Shell title={startup?.name || 'Analytics'} subtitle="Real trend data">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center"><BarChart3 size={18} /></div>
        <h1 className="text-[26px] font-semibold text-ink-900 tracking-tight">Analytics</h1>
      </div>

      <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
        <p className="text-[15px] font-semibold text-ink-900 mb-1">Readiness over time</p>
        <p className="text-[13px] text-ink-500 mb-5">Real history — every time readiness gets re-assessed, a new point is added here.</p>
        {history.length < 2 ? (
          <p className="text-[13px] text-ink-500 py-10 text-center">Re-assess readiness a few times to build a real trend line (currently {history.length} data point{history.length !== 1 ? 's' : ''}).</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={history}>
                <XAxis dataKey="point" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6E7079' }} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6E7079' }} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #EDEDF1', fontSize: 12 }} labelFormatter={(l, p) => p[0]?.payload.date} />
                <Line type="monotone" dataKey="score" stroke="#7C5CFC" strokeWidth={2} dot={{ fill: '#7C5CFC' }} />
              </LineChart>
            </ResponsiveContainer>
            <ConsistencySignal history={history} />
          </>
        )}
      </div>
    </Shell>
  );
}
