import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ExternalLink, Check, X, HelpCircle, User, AlertTriangle, Pencil } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import { getSchemes, updateSchemeFacts } from '../services/startups.js';
import { useActiveStartup } from '../context/ActiveStartupContext.jsx';
import { useToast } from '../components/Toast.jsx';

/**
 * Which government schemes this venture actually qualifies for.
 *
 * India has a large non-dilutive funding system that almost nobody using a
 * platform like this knows about. The Seed Fund Scheme alone is a ₹945 crore
 * corpus giving up to ₹20 lakh as a grant, and DPIIT recognition, which is
 * free and issued in days, is the prerequisite for most of it.
 *
 * EVERY LINE ON THIS PAGE IS A PUBLISHED CRITERION with a source and a date.
 * Nothing is inferred and nothing says "you are eligible", because a
 * committee decides that. It says which criteria are satisfied, which are
 * not, and which a person has to judge. A founder will act on this, so the
 * distinction between "blocked" and "we cannot tell" is shown rather than
 * flattened.
 */

const STATE_ICON = {
  MET: { Icon: Check, color: '#1F5D52', bg: '#EAF7F0', label: 'Met' },
  NOT_MET: { Icon: X, color: '#E15C4D', bg: '#FDEBE9', label: 'Not met' },
  UNKNOWN: { Icon: HelpCircle, color: '#C58A00', bg: '#FFF6E0', label: 'We cannot check' },
  HUMAN: { Icon: User, color: '#6E7079', bg: '#F3F3F6', label: 'A person decides' },
};

const VERDICT = {
  CLEAR: { label: 'Nothing rules you out', color: '#1F5D52', accent: '#3FB081' },
  INCOMPLETE: { label: 'Missing information', color: '#C58A00', accent: '#D9A441' },
  BLOCKED: { label: 'Closed for now', color: '#E15C4D', accent: '#E15C4D' },
};

const ENTITY_OPTIONS = [
  ['NOT_INCORPORATED', 'Not incorporated yet'],
  ['PRIVATE_LIMITED', 'Private Limited Company'],
  ['LLP', 'Limited Liability Partnership'],
  ['REGISTERED_PARTNERSHIP', 'Registered Partnership Firm'],
  ['COOPERATIVE_SOCIETY', 'Cooperative Society'],
  ['SOLE_PROPRIETORSHIP', 'Sole Proprietorship'],
];

const FIELD = 'w-full px-4 py-3 rounded-lg border border-surface-border bg-surface-muted text-[15px] text-ink-900 focus:outline-none focus:border-violet-500 focus:bg-surface transition-colors';

function SchemeCard({ s, index }) {
  const [open, setOpen] = useState(s.verdict !== 'CLEAR' ? false : true);
  const v = VERDICT[s.verdict];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.25) }}
      className="relative overflow-hidden bg-surface rounded-xl border border-surface-border shadow-card"
    >
      <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: v.accent }} />

      <div className="p-6 pl-7">
        <div className="flex items-start justify-between gap-5 mb-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-[16.5px] font-semibold text-ink-950">{s.name}</h3>
              {s.isGateway && (
                <span className="text-[11px] font-medium text-violet-700 bg-violet-50 px-2 py-0.5 rounded">
                  unlocks the others
                </span>
              )}
            </div>
            <p className="text-[12.5px] text-ink-500 mt-0.5">{s.authority}</p>
          </div>
          <span className="text-[12.5px] font-medium shrink-0" style={{ color: v.color }}>{v.label}</span>
        </div>

        <p className="text-[14.5px] text-ink-800 leading-relaxed">{s.oneLine}</p>
        <p className="text-[13px] text-ink-500 mt-2 leading-relaxed">{s.verdictLine}</p>

        {s.deadline?.passed && (
          <p className="flex items-start gap-2 text-[13px] text-amber-700 mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>
              The application window we checked closed on{' '}
              {new Date(s.deadline.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}.
              {' '}{s.deadline.note}
            </span>
          </p>
        )}

        <button
          onClick={() => setOpen(!open)}
          className="text-[13px] font-medium text-violet-700 hover:text-violet-600 transition-colors mt-4"
        >
          {open ? 'Hide the criteria' : `Show all ${s.criteria.length} criteria`}
        </button>

        {open && (
          <div className="mt-4 pt-4 border-t border-surface-border">
            {/* The arithmetic, in the same spirit as the readiness breakdown:
                every line is a published rule and says which it is. */}
            <div className="space-y-3.5">
              {s.criteria.map((c, i) => {
                const st = STATE_ICON[c.state];
                return (
                  <div key={i} className="flex items-start gap-3">
                    <span className="rounded-full p-1 shrink-0 mt-0.5" style={{ backgroundColor: st.bg }}>
                      <st.Icon size={12} style={{ color: st.color }} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13.5px] text-ink-900 leading-snug">{c.label}</p>
                      <p className="text-[12.5px] text-ink-600 leading-relaxed mt-0.5">{c.detail}</p>
                      {c.note && <p className="text-[12px] text-ink-300 leading-relaxed mt-0.5">{c.note}</p>}
                    </div>
                  </div>
                );
              })}
            </div>

            {s.howItWorks && (
              <p className="text-[13px] text-ink-700 leading-relaxed mt-5 pt-4 border-t border-surface-border">
                {s.howItWorks}
              </p>
            )}

            <p className="text-[13px] text-ink-700 leading-relaxed mt-4">{s.worth}</p>

            <div className="flex items-center justify-between gap-4 mt-5 pt-4 border-t border-surface-border">
              <a href={s.applyAt} target="_blank" rel="noopener noreferrer"
                 className="flex items-center gap-1.5 text-[13.5px] font-medium text-violet-700 hover:text-violet-600 transition-colors">
                Apply or read more <ExternalLink size={13} />
              </a>
              {/* Dated and linked, because schemes change and this page does
                  not know when they do. */}
              <a href={s.source} target="_blank" rel="noopener noreferrer"
                 className="text-[12px] text-ink-300 hover:text-ink-700 transition-colors">
                Checked {new Date(s.verifiedOn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </a>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function Schemes() {
  const { activeStartup } = useActiveStartup();
  const showToast = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!activeStartup?.id) { setLoading(false); return; }
    const { ok, data: d } = await getSchemes(activeStartup.id);
    if (ok && d.success) setData(d);
    setLoading(false);
  }
  useEffect(() => { load(); }, [activeStartup?.id]);

  function startEditing() {
    setDraft({
      entityType: data.venture.entityType || '',
      incorporationDate: data.venture.incorporationDate ? String(data.venture.incorporationDate).slice(0, 10) : '',
      priorGovtFundingLakhs: data.venture.priorGovtFundingLakhs ?? '',
      dpiitRecognized: Boolean(data.venture.dpiitRecognized),
    });
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    const { ok } = await updateSchemeFacts(activeStartup.id, draft);
    setSaving(false);
    if (!ok) { showToast('Could not save that.', 'error'); return; }
    setEditing(false);
    await load();
  }

  if (loading) {
    return (
      <Shell persona="FOUNDER" title="Government schemes">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" />
        </div>
      </Shell>
    );
  }

  if (!data) {
    return (
      <Shell persona="FOUNDER" title="Government schemes">
        <div className="bg-surface rounded-xl border border-surface-border shadow-card py-16 text-center">
          <p className="text-[15px] text-ink-700">No venture selected.</p>
        </div>
      </Shell>
    );
  }

  const open = data.schemes.filter((s) => s.verdict === 'CLEAR').length;

  return (
    <Shell persona="FOUNDER" title="Government schemes" subtitle="Money that does not cost you equity">
      <div className="mb-7">
        <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-violet-600 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
          {open === 0 ? `${data.schemes.length} checked` : `${open} of ${data.schemes.length} open to you`}
        </p>
        <h1 className="font-editorial italic text-[32px] text-trust-fg leading-tight max-w-3xl">
          {data.headline
            || (open > 0
              ? `Nothing rules ${data.venture.name} out of ${open} of these.`
              : 'Every one of these is closed to you right now, and each says why.')}
        </h1>
        <p className="text-[15px] text-ink-700 mt-3 max-w-2xl leading-relaxed">
          Checked against the published criteria of each scheme. Every line below is a rule somebody
          wrote down, with a link to where it came from. Nothing here says you are eligible, because
          that is decided by people reading your application.
        </p>
      </div>

      {/* The facts the checks turn on. Missing ones produce "we cannot check",
          never a wrong verdict, so the page asks for them plainly. */}
      <div className="bg-surface rounded-xl border border-surface-border shadow-card p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[15px] font-semibold text-ink-950 mb-1">What these checks are based on</p>
            {data.missingFacts.length > 0 ? (
              <p className="text-[13.5px] text-ink-700 leading-relaxed">
                {data.missingFacts.length === 1
                  ? `One thing is missing: ${data.missingFacts[0]}. Until it is filled in, some criteria cannot be checked at all.`
                  : `${data.missingFacts.length} things are missing: ${data.missingFacts.join(', ')}. Until they are filled in, some criteria cannot be checked at all.`}
              </p>
            ) : (
              <p className="text-[13.5px] text-ink-700">Everything these checks need is filled in.</p>
            )}
          </div>
          {!editing && (
            <button onClick={startEditing}
              className="flex items-center gap-1.5 text-[13px] font-medium text-violet-700 hover:text-violet-600 transition-colors shrink-0">
              <Pencil size={13} /> {data.missingFacts.length > 0 ? 'Fill them in' : 'Change them'}
            </button>
          )}
        </div>

        {editing && draft && (
          <div className="mt-5 pt-5 border-t border-surface-border space-y-4">
            <div>
              <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">Entity type</label>
              <select value={draft.entityType} onChange={(e) => setDraft({ ...draft, entityType: e.target.value })} className={FIELD}>
                <option value="">Not sure yet</option>
                {ENTITY_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">Incorporation date</label>
              <input type="date" value={draft.incorporationDate}
                onChange={(e) => setDraft({ ...draft, incorporationDate: e.target.value })} className={FIELD} />
              <p className="text-[12px] text-ink-500 mt-1.5">
                From the Certificate of Incorporation, not when work on the idea started. The Seed Fund window is two years from this date.
              </p>
            </div>

            <div>
              <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">Government funding already received</label>
              <input type="number" min="0" step="0.5" value={draft.priorGovtFundingLakhs}
                onChange={(e) => setDraft({ ...draft, priorGovtFundingLakhs: e.target.value })}
                placeholder="0" className={FIELD} />
              <p className="text-[12px] text-ink-500 mt-1.5">
                In lakhs, across all central and state schemes. More than ₹10 lakh closes the Seed Fund Scheme.
              </p>
            </div>

            <div>
              <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">DPIIT recognition</label>
              <div className="flex gap-2">
                {[[true, 'Recognised'], [false, 'Not yet']].map(([val, label]) => (
                  <button key={String(val)} type="button"
                    onClick={() => setDraft({ ...draft, dpiitRecognized: val })}
                    className={`flex-1 text-[13.5px] px-4 py-2.5 rounded-lg border transition-colors ${
                      draft.dpiitRecognized === val ? 'bg-ink-900 text-white border-ink-900' : 'border-surface-border text-ink-700 hover:border-ink-300'
                    }`}>{label}</button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4 pt-1">
              <button onClick={save} disabled={saving}
                className="bg-ink-900 hover:bg-ink-700 text-white px-5 py-2.5 rounded-full text-[14px] font-medium transition-colors disabled:opacity-50">
                {saving ? 'Saving…' : 'Save and re-check'}
              </button>
              <button onClick={() => setEditing(false)} className="text-[13.5px] text-ink-500 hover:text-ink-900 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {data.schemes.map((s, i) => <SchemeCard key={s.id} s={s} index={i} />)}
      </div>

      <p className="text-[12.5px] text-ink-500 leading-relaxed mt-6 max-w-2xl">
        These criteria were checked on{' '}
        {new Date(data.verifiedOn).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}.
        Schemes change and application windows close, so confirm the current position on the official
        portal before applying. Every scheme above links to its source.
      </p>
    </Shell>
  );
}
