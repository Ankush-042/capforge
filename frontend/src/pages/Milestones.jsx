import React, { useState, useEffect } from 'react';
import { ListChecks, Sparkles } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import { getMyStartups, getMilestones, generateMilestones, updateMilestone } from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';

export default function Milestones() {
  const showToast = useToast();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [startup, setStartup] = useState(null);
  const [milestones, setMilestones] = useState([]);

  async function loadMilestones(startupId) {
    const { ok, data } = await getMilestones(startupId);
    if (ok && data.success) setMilestones(data.milestones);
  }

  useEffect(() => {
    async function load() {
      const { ok, data } = await getMyStartups();
      if (ok && data.success && data.startups.length > 0) {
        setStartup(data.startups[0]);
        await loadMilestones(data.startups[0].id);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleGenerate() {
    if (!startup) { showToast('No startup found.', 'error'); return; }
    setGenerating(true);
    const { ok, data } = await generateMilestones(startup.id);
    setGenerating(false);
    if (!ok || !data.success) { showToast(data.detail || data.error || 'Could not generate milestones.', 'error'); return; }
    await loadMilestones(startup.id);
    showToast('Milestones generated.');
  }

  async function toggleStatus(m) {
    const nextStatus = m.status === 'COMPLETED' ? 'ACCEPTED' : 'COMPLETED';
    const { ok, data } = await updateMilestone(m.id, { status: nextStatus });
    if (ok && data.success) setMilestones(milestones.map((x) => (x.id === m.id ? data.milestone : x)));
    else showToast('Could not update milestone.', 'error');
  }

  if (loading) return <Shell title="Milestones"><div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" /></div></Shell>;

  return (
    <Shell title={startup?.name || 'Milestones'} subtitle="Milestones">
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center"><ListChecks size={18} /></div>
          <div>
            <h1 className="text-[26px] font-semibold text-ink-900 tracking-tight">Milestones</h1>
            <p className="text-sm text-ink-500 mt-1">AI-suggested — edit, accept, or complete each one.</p>
          </div>
        </div>
        <button onClick={handleGenerate} disabled={generating || !startup}
          className="flex items-center gap-2 text-sm bg-ink-900 hover:bg-ink-700 text-white px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50">
          <Sparkles size={14} />{generating ? 'Generating…' : 'Generate with AI'}
        </button>
      </div>

      <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
        {milestones.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-[15px] text-ink-500 mb-4">No milestones yet.</p>
            <button onClick={handleGenerate} className="text-sm bg-violet-50 text-violet-700 px-4 py-2.5 rounded-lg font-medium hover:bg-violet-100 transition-colors">Generate with AI</button>
          </div>
        ) : milestones.map((m) => (
          <div key={m.id} className="flex gap-4 py-4 border-b border-surface-border last:border-0">
            <div className={`w-7 h-7 rounded-full text-sm font-medium flex items-center justify-center shrink-0 ${m.status === 'COMPLETED' ? 'bg-mint-50 text-mint-500' : 'bg-violet-50 text-violet-600'}`}>
              {m.status === 'COMPLETED' ? '✓' : m.sequence_order}
            </div>
            <div className="flex-1">
              <p className={`text-[15px] font-medium ${m.status === 'COMPLETED' ? 'text-ink-500 line-through' : 'text-ink-900'}`}>{m.title}</p>
              <p className="text-[13px] text-ink-500 mt-0.5">{m.description}</p>
              <span className="text-[11px] text-ink-300 mt-1 inline-block">{m.source === 'AI' ? 'AI suggested' : 'Edited by you'}</span>
            </div>
            <button onClick={() => toggleStatus(m)} className="text-xs px-3 py-1.5 rounded-lg border border-surface-border text-ink-500 hover:bg-surface-muted transition-colors self-start shrink-0">
              {m.status === 'COMPLETED' ? 'Reopen' : 'Complete'}
            </button>
          </div>
        ))}
      </div>
    </Shell>
  );
}
