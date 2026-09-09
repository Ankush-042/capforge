import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Eye } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import { savePitchContent } from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';
import { useActiveStartup } from '../context/ActiveStartupContext.jsx';

/**
 * The founder editing their own pitch.
 *
 * Every field here is optional and overrides an auto-derived one. A founder
 * who never opens this page still has a working pitch built from their real
 * structured data. This is for the founder who wants their own framing,
 * which matters: the auto-derived version is accurate but it is not
 * necessarily how they would say it.
 *
 * The one field with no auto-derived equivalent is the ask, because nothing
 * in the platform knows what someone is raising or why.
 */
export default function PitchEditor() {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();
  const { activeStartup, loading: startupLoading } = useActiveStartup();
  const targetId = routeId || activeStartup?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [derived, setDerived] = useState({});
  const [form, setForm] = useState({ headline: '', theAsk: '', problemOverride: '', solutionOverride: '', closing: '' });

  useEffect(() => {
    async function load() {
      if (!routeId && startupLoading) return;
      if (!targetId) { setLoading(false); return; }
      try {
        const token = localStorage.getItem('capforge_token');
        const res = await fetch(`/api/pitch/${targetId}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data.success) {
          setDerived({ name: data.pitch.name, problem: data.pitch.problem, solution: data.pitch.solution });
          setForm({
            headline: data.pitch.headline || '',
            theAsk: data.pitch.the_ask || '',
            problemOverride: '',
            solutionOverride: '',
            closing: data.pitch.closing || '',
          });
        }
      } catch (err) {
        console.error('Pitch editor load failed:', err);
      }
      setLoading(false);
    }
    load();
  }, [targetId, startupLoading, routeId]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function handleSave() {
    if (saving || !targetId) return;
    setSaving(true);
    const { ok, data } = await savePitchContent(targetId, form);
    setSaving(false);
    if (ok && data.success) { showToast('Your pitch is updated.'); navigate(`/app/pitch/${targetId}`); }
    else showToast(data.error === 'FORBIDDEN' ? 'This is not your venture.' : 'Could not save.', 'error');
  }

  if (loading) return <Shell title="Edit pitch"><div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" /></div></Shell>;
  if (!targetId) return <Shell title="Edit pitch"><p className="text-[15px] text-ink-500">You do not have a venture yet.</p></Shell>;

  return (
    <Shell title="Edit your pitch" subtitle="Your words, not the machine's">
      <Link to={`/app/pitch/${targetId}`} className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition-colors mb-6">
        <ArrowLeft size={15} /> Back to pitch
      </Link>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="max-w-2xl">
        <div className="relative overflow-hidden rounded-2xl bg-ink-950 p-7 mb-6">
          <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle at 20% 40%, #7C5CFC 0%, transparent 55%), radial-gradient(circle at 80% 60%, #1F5D52 0%, transparent 55%)' }} />
          <div className="relative">
            <h2 className="font-display text-[24px] font-semibold text-white leading-tight mb-2">
              Everything here is <span className="italic font-normal text-mint-500">optional.</span>
            </h2>
            <p className="text-[14px] text-white/60 leading-relaxed">
              Your pitch already works using your venture's real data. Fill anything in here only where you want your own words instead.
            </p>
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-surface-border shadow-card p-7 space-y-6">
          <div>
            <label className="block text-[13px] font-semibold text-ink-900 mb-1.5">Opening line</label>
            <p className="text-[13px] text-ink-500 mb-2.5">Currently shows: <span className="text-ink-700">{derived.name}</span></p>
            <input value={form.headline} onChange={set('headline')} placeholder="Leave blank to keep your venture name"
              className="w-full bg-surface-muted border border-surface-border rounded-lg px-4 py-3 text-[15px] text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-violet-500 focus:bg-surface transition-colors" />
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-ink-900 mb-1.5">The ask</label>
            <p className="text-[13px] text-ink-500 mb-2.5">What you are raising and what it buys. Nothing auto-fills this, because nothing here knows it.</p>
            <textarea value={form.theAsk} onChange={set('theAsk')} rows={4}
              placeholder="We are raising to get from pilot to twenty clinics, which needs two engineers and a year of runway."
              className="w-full bg-surface-muted border border-surface-border rounded-lg px-4 py-3 text-[15px] text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-violet-500 focus:bg-surface transition-colors resize-none leading-relaxed" />
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-ink-900 mb-1.5">Your framing of the problem</label>
            <p className="text-[13px] text-ink-500 mb-2.5 line-clamp-2">Currently shows: <span className="text-ink-700">{derived.problem || 'not yet structured'}</span></p>
            <textarea value={form.problemOverride} onChange={set('problemOverride')} rows={3}
              placeholder="Leave blank to keep the version above"
              className="w-full bg-surface-muted border border-surface-border rounded-lg px-4 py-3 text-[15px] text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-violet-500 focus:bg-surface transition-colors resize-none leading-relaxed" />
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-ink-900 mb-1.5">Your framing of the solution</label>
            <p className="text-[13px] text-ink-500 mb-2.5 line-clamp-2">Currently shows: <span className="text-ink-700">{derived.solution || 'not yet structured'}</span></p>
            <textarea value={form.solutionOverride} onChange={set('solutionOverride')} rows={3}
              placeholder="Leave blank to keep the version above"
              className="w-full bg-surface-muted border border-surface-border rounded-lg px-4 py-3 text-[15px] text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-violet-500 focus:bg-surface transition-colors resize-none leading-relaxed" />
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-ink-900 mb-1.5">Closing words</label>
            <p className="text-[13px] text-ink-500 mb-2.5">The last thing an investor reads before they decide whether to reply.</p>
            <textarea value={form.closing} onChange={set('closing')} rows={3}
              placeholder="Write it the way you would say it to someone across a table."
              className="w-full bg-surface-muted border border-surface-border rounded-lg px-4 py-3 text-[15px] text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-violet-500 focus:bg-surface transition-colors resize-none leading-relaxed" />
          </div>

          <div className="pt-2 flex items-center gap-4">
            <button onClick={handleSave} disabled={saving}
              className="bg-ink-900 hover:bg-ink-700 disabled:opacity-40 text-white px-6 py-2.5 rounded-full font-medium text-[14px] transition-colors">
              {saving ? 'Saving…' : 'Save and preview'}
            </button>
            <Link to={`/app/pitch/${targetId}`} className="flex items-center gap-1.5 text-[13px] text-ink-500 hover:text-ink-900 transition-colors">
              <Eye size={14} /> See it as they will
            </Link>
          </div>
        </div>
      </motion.div>
    </Shell>
  );
}
