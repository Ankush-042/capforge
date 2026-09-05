import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart3 } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import { getMyStartups, getReadinessHistory } from '../services/startups.js';

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [startup, setStartup] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    async function load() {
      const { ok, data } = await getMyStartups();
      if (ok && data.success && data.startups.length > 0) {
        setStartup(data.startups[0]);
        const histRes = await getReadinessHistory(data.startups[0].id);
        if (histRes.ok && histRes.data.success) {
          setHistory(histRes.data.history.map((h, i) => ({ point: `#${i + 1}`, score: Math.round(h.overall_score), date: new Date(h.generated_at).toLocaleDateString() })));
        }
      }
      setLoading(false);
    }
    load();
  }, []);

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
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={history}>
              <XAxis dataKey="point" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6E7079' }} />
              <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6E7079' }} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #EDEDF1', fontSize: 12 }} labelFormatter={(l, p) => p[0]?.payload.date} />
              <Line type="monotone" dataKey="score" stroke="#7C5CFC" strokeWidth={2} dot={{ fill: '#7C5CFC' }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </Shell>
  );
}
