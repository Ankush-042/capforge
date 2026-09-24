import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, X, Plus } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import { createLaunch } from '../services/startups.js';
import { useActiveStartup } from '../context/ActiveStartupContext.jsx';
import { useToast } from '../components/Toast.jsx';

/**
 * Putting something up for people to try.
 *
 * DELIBERATELY ENCOURAGES POSTING BEFORE IT IS READY. That is the whole
 * mechanic: YC's partners push founders to launch internally long before they
 * are comfortable, because the feedback is worth more than the polish. A form
 * that implies you should wait until it is good produces nothing.
 *
 * Images are shrunk in the browser before they are sent, exactly as avatars
 * are, so what leaves the machine is already the final artifact.
 */

const FIELD = 'w-full px-4 py-3 rounded-lg border border-surface-border bg-surface-muted text-[15px] text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-violet-500 focus:bg-surface transition-colors';

const STATES = [
  ['CONCEPT', 'Just the idea written down', 'Nothing to click yet'],
  ['INTERFACE', 'Clickable screens', 'Nothing behind them yet'],
  ['PROTOTYPE', 'Partly working', 'Expect rough edges'],
  ['LIVE', 'Live and usable', 'People can really use it'],
];

const TARGET_PX = 1200;
const MAX_BYTES = 220 * 1024;

async function shrink(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, TARGET_PX / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  for (const q of [0.82, 0.7, 0.6, 0.5, 0.4]) {
    const url = canvas.toDataURL('image/jpeg', q);
    if ((url.length * 3) / 4 <= MAX_BYTES) return url;
  }
  return canvas.toDataURL('image/jpeg', 0.35);
}

export default function PostLaunch() {
  const navigate = useNavigate();
  const showToast = useToast();
  const { activeStartup } = useActiveStartup();
  const fileRef = useRef(null);

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [link, setLink] = useState('');
  const [state, setState] = useState('INTERFACE');
  const [images, setImages] = useState([]);
  const [questions, setQuestions] = useState(['']);
  const [saving, setSaving] = useState(false);

  async function addImage(e) {
    const files = [...(e.target.files || [])];
    e.target.value = '';
    for (const f of files.slice(0, 4 - images.length)) {
      if (!f.type.startsWith('image/')) continue;
      try {
        // Shrink first, THEN set state. The updater passed to setImages is not
        // async and cannot await inside it.
        const shrunk = await shrink(f);
        setImages((prev) => [...prev, shrunk]);
      } catch (err) {
        showToast('Could not read that image.', 'error');
      }
    }
  }

  async function submit() {
    if (!title.trim()) { showToast('Give it a name.', 'error'); return; }
    if (summary.trim().length < 30) { showToast('Say a bit more about what it is.', 'error'); return; }
    if (!activeStartup?.id) { showToast('No venture selected.', 'error'); return; }

    setSaving(true);
    const { ok, data } = await createLaunch(activeStartup.id, {
      title, summary, link, state, images,
      questions: questions.map((q) => q.trim()).filter(Boolean),
    });
    setSaving(false);
    if (!ok || !data?.success) {
      showToast(data?.error === 'IMAGE_TOO_LARGE' ? 'One of those images is too large.' : 'Could not post that.', 'error');
      return;
    }
    navigate(`/app/launches/${data.launch.id}`);
  }

  return (
    <Shell persona="FOUNDER" title="Put it up" subtitle="Ask people to try what you have built">
      <div className="max-w-2xl">
        <div className="mb-7">
          <h1 className="font-editorial italic text-[30px] text-trust-fg leading-tight">
            Put it up before you think it is ready.
          </h1>
          <p className="text-[15px] text-ink-700 mt-3 leading-relaxed">
            The point is finding out what people do with it, and that answer does not improve by waiting.
            A rough thing with eight honest reactions beats a polished one nobody has opened.
          </p>
        </div>

        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7 space-y-6">
          <div>
            <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">What is it called</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Adaptive maths practice for Class 9" className={FIELD} />
          </div>

          <div>
            <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">What should somebody expect</label>
            <textarea
              value={summary} onChange={(e) => setSummary(e.target.value)} rows={4}
              placeholder="What it does, who it is for, and what you want somebody to try."
              className={`${FIELD} resize-none leading-relaxed`}
            />
            <p className="text-[12px] text-ink-500 mt-1.5">{summary.trim().length} characters, 30 minimum</p>
          </div>

          <div>
            <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">Where can they try it</label>
            <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" className={FIELD} />
          </div>

          <div>
            {/* Said up front, so people give useful feedback rather than
                reporting that nothing saves. */}
            <label className="text-[13px] font-medium text-ink-700 mb-2 block">Be honest about what state it is in</label>
            <div className="grid grid-cols-2 gap-2">
              {STATES.map(([v, label, detail]) => (
                <button key={v} type="button" onClick={() => setState(v)}
                  className={`text-left px-4 py-3 rounded-lg border transition-colors ${
                    state === v ? 'border-violet-500 bg-violet-50' : 'border-surface-border hover:border-ink-300'
                  }`}>
                  <p className="text-[13.5px] font-medium text-ink-950">{label}</p>
                  <p className="text-[12px] text-ink-500 mt-0.5">{detail}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[13px] font-medium text-ink-700 mb-2 block">Screenshots, up to four</label>
            <div className="flex flex-wrap gap-2.5">
              {images.map((src, i) => (
                <div key={i} className="relative">
                  <img src={src} alt="" className="w-24 h-24 object-cover rounded-lg border border-surface-border" />
                  <button onClick={() => setImages(images.filter((_, j) => j !== i))}
                    className="absolute -top-1.5 -right-1.5 bg-ink-900 text-white rounded-full p-1 hover:bg-signal-critical transition-colors">
                    <X size={11} />
                  </button>
                </div>
              ))}
              {images.length < 4 && (
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="w-24 h-24 rounded-lg border border-dashed border-surface-border hover:border-violet-500 flex flex-col items-center justify-center gap-1 text-ink-300 hover:text-violet-600 transition-colors">
                  <Camera size={16} />
                  <span className="text-[11px]">Add</span>
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" multiple onChange={addImage} className="hidden" />
            </div>
          </div>

          <div>
            {/* Generic feedback is weak feedback. Asking for something
                specific is what turns vague praise into an answer. */}
            <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">Anything specific you want answered</label>
            <p className="text-[12px] text-ink-500 mb-2.5">Optional, and the most useful part. Up to three.</p>
            {questions.map((q, i) => (
              <input
                key={i} value={q}
                onChange={(e) => { const n = [...questions]; n[i] = e.target.value; setQuestions(n); }}
                placeholder={i === 0 ? 'Does the first screen make it obvious what this is for?' : 'Another question'}
                className={`${FIELD} mb-2`}
              />
            ))}
            {questions.length < 3 && (
              <button type="button" onClick={() => setQuestions([...questions, ''])}
                className="flex items-center gap-1.5 text-[13px] text-ink-500 hover:text-violet-700 transition-colors">
                <Plus size={13} /> Another question
              </button>
            )}
          </div>

          <button onClick={submit} disabled={saving}
            className="w-full bg-ink-900 hover:bg-ink-700 text-white py-3.5 rounded-full text-[15px] font-medium transition-colors disabled:opacity-50">
            {saving ? 'Putting it up…' : 'Put it up'}
          </button>
        </div>
      </div>
    </Shell>
  );
}
