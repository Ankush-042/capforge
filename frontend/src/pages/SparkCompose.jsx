import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import { createSpark } from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';

/**
 * The spark composer. Phase 2, The First Act.
 *
 * Deliberately conversational rather than a structured intake form. The whole
 * premise of a spark is that it exists BEFORE structure: no domain dropdown,
 * no stage selector, no required fields beyond the idea itself. Those things
 * get derived later, at formation, by the pipeline that already exists.
 */
export default function SparkCompose() {
  const navigate = useNavigate();
  const showToast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', theIdea: '', whyMe: '', lookingFor: '', tags: '' });

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const ideaLength = form.theIdea.trim().length;
  const canSubmit = form.title.trim().length > 0 && ideaLength >= 40;
  // Shows exactly what gets stored, so a mistyped list is visible before it
  // is saved rather than after.
  const parsedTags = form.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);

  async function handleSubmit() {
    if (!canSubmit || saving) return;
    setSaving(true);
    const { ok, data } = await createSpark({
      title: form.title,
      theIdea: form.theIdea,
      whyMe: form.whyMe,
      lookingFor: form.lookingFor,
      tags: parsedTags,
    });
    setSaving(false);
    if (ok && data.success) navigate(`/app/sparks/${data.spark.id}`);
    else showToast(data.error === 'IDEA_TOO_SHORT' ? 'Tell us a bit more about the idea.' : 'Could not share your idea.', 'error');
  }

  return (
    <Shell title="Share your idea">
      <Link to="/app/sparks" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition-colors mb-6">
        <ArrowLeft size={15} /> Back to sparks
      </Link>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="max-w-2xl">
        <div className="relative overflow-hidden rounded-xl bg-ink-950 p-8 mb-6">
          <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle at 20% 40%, #7C5CFC 0%, transparent 55%), radial-gradient(circle at 80% 60%, #1F5D52 0%, transparent 55%)' }} />
          <div className="relative">
            <h2 className="font-display text-[26px] font-semibold text-white leading-tight mb-2">
              Not a pitch. Just <span className="italic font-normal text-mint-500">the thing.</span>
            </h2>
            <p className="text-[15px] text-white/60 leading-relaxed">
              No business plan, no deck, no jargon. Write it the way you would explain it to a friend who already gets it.
            </p>
          </div>
        </div>

        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7 space-y-6">
          <div>
            <label className="block text-[13px] font-semibold text-ink-900 mb-2">What is it, in one line?</label>
            <input
              value={form.title}
              onChange={set('title')}
              placeholder="A way for small farms to predict crop disease before it spreads"
              className="w-full bg-surface-muted border border-surface-border rounded-lg px-4 py-3 text-[15px] text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-violet-500 focus:bg-surface transition-colors"
            />
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-ink-900 mb-2">The idea</label>
            <p className="text-[13px] text-ink-500 mb-2.5">What is the problem, and why does it bother you enough to build something about it?</p>
            <textarea
              value={form.theIdea}
              onChange={set('theIdea')}
              rows={6}
              placeholder="Write it properly. This is the part people will actually read."
              className="w-full bg-surface-muted border border-surface-border rounded-lg px-4 py-3 text-[15px] text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-violet-500 focus:bg-surface transition-colors resize-none leading-relaxed"
            />
            <p className={`text-[12px] mt-1.5 ${ideaLength >= 40 ? 'text-forest-600' : 'text-ink-300'}`}>
              {ideaLength < 40 ? `${40 - ideaLength} more characters` : 'Good to go'}
            </p>
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-ink-900 mb-2">Why you? <span className="font-normal text-ink-300">Optional</span></label>
            <textarea
              value={form.whyMe}
              onChange={set('whyMe')}
              rows={3}
              placeholder="What you have seen, built, or lived through that makes this yours to work on."
              className="w-full bg-surface-muted border border-surface-border rounded-lg px-4 py-3 text-[15px] text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-violet-500 focus:bg-surface transition-colors resize-none leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-ink-900 mb-2">Who are you hoping finds this? <span className="font-normal text-ink-300">Optional</span></label>
            <textarea
              value={form.lookingFor}
              onChange={set('lookingFor')}
              rows={3}
              placeholder="Not a job description. The kind of person you want in the room."
              className="w-full bg-surface-muted border border-surface-border rounded-lg px-4 py-3 text-[15px] text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-violet-500 focus:bg-surface transition-colors resize-none leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-ink-900 mb-2">Tags <span className="font-normal text-ink-300">Optional, comma separated</span></label>
            <input
              value={form.tags}
              onChange={set('tags')}
              placeholder="agriculture, machine learning, climate"
              className="w-full bg-surface-muted border border-surface-border rounded-lg px-4 py-3 text-[15px] text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-violet-500 focus:bg-surface transition-colors"
            />
            {parsedTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {parsedTags.map((t, i) => (
                  <span key={`${t}-${i}`} className="text-[11.5px] px-2 py-1 rounded-md bg-violet-50 text-violet-700">{t}</span>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center gap-4">
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || saving}
              className="group flex items-center gap-2 bg-ink-900 hover:bg-ink-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-full pl-6 pr-2 py-2.5 font-medium transition-colors"
            >
              {saving ? 'Sharing…' : 'Share it'}
              <span className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-white/15">
                <ArrowUpRight size={15} className="absolute transition-transform duration-500 ease-out group-hover:translate-x-8 group-hover:-translate-y-8" />
                <ArrowUpRight size={15} className="absolute -translate-x-8 translate-y-8 transition-transform duration-500 ease-out group-hover:translate-x-0 group-hover:translate-y-0" />
              </span>
            </button>
            <p className="text-[13px] text-ink-500">This goes out as written. Anyone can read it and say they want in.</p>
          </div>
        </div>
      </motion.div>
    </Shell>
  );
}
