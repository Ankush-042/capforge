import React, { useState, useEffect } from 'react';
import { Eye, X, Check } from 'lucide-react';
import { getWatchState, setWatchStatus, removeFromWatchlist } from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';

/**
 * Watch a venture, or record why you passed on it.
 *
 * The pass note is the part that matters. An investor looking at the same
 * venture six months later needs to remember what put them off, and that
 * reasoning is worth far more than the bare fact of a pass. So passing asks
 * for it once, rather than silently recording a decision with no context.
 *
 * Optimistic, because a button that waits on a round trip before changing
 * feels broken. Reverted if the write actually fails.
 */
export default function WatchControls({ startupId, compact }) {
  const showToast = useToast();
  const [state, setState] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!startupId) return;
    getWatchState(startupId).then(({ ok, data }) => {
      if (ok && data.success) setState(data.state);
      setLoaded(true);
    });
  }, [startupId]);

  async function watch() {
    const before = state;
    setState({ status: 'WATCHING' });
    const { ok } = await setWatchStatus(startupId, 'WATCHING');
    if (!ok) { setState(before); showToast('Could not save that.', 'error'); }
    else showToast('Watching. You will see when it moves.');
  }

  async function pass() {
    const before = state;
    setState({ status: 'PASSED', note: note.trim() || null });
    setAsking(false);
    const { ok } = await setWatchStatus(startupId, 'PASSED', note.trim() || null);
    setNote('');
    if (!ok) { setState(before); showToast('Could not save that.', 'error'); }
    else showToast('Noted. Your reasoning is kept.');
  }

  async function clear() {
    const before = state;
    setState(null);
    const { ok } = await removeFromWatchlist(startupId);
    if (!ok) { setState(before); showToast('Could not remove that.', 'error'); }
  }

  if (!startupId || !loaded) return null;

  if (asking) {
    return (
      <div className="w-full bg-surface-muted rounded-lg p-4 mt-3">
        <p className="text-[13px] font-medium text-ink-900 mb-1">Why are you passing?</p>
        <p className="text-[12.5px] text-ink-500 mb-2.5">
          For you, not the founder. They never see this.
        </p>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && pass()}
          placeholder="Too early, no technical founder…"
          autoFocus
          className="w-full px-3.5 py-2.5 rounded-lg border border-surface-border bg-surface text-[13.5px] text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-violet-500 transition-colors mb-2.5"
        />
        <div className="flex items-center gap-2">
          <button onClick={pass} className="text-[13px] font-medium bg-ink-900 hover:bg-ink-700 text-white px-4 py-2 rounded-full transition-colors">
            Save
          </button>
          <button onClick={() => { setAsking(false); setNote(''); }} className="text-[13px] text-ink-500 hover:text-ink-900 transition-colors">
            Cancel
          </button>
          <button onClick={pass} className="text-[13px] text-ink-300 hover:text-ink-700 transition-colors ml-auto">
            Skip the note
          </button>
        </div>
      </div>
    );
  }

  if (state?.status === 'WATCHING') {
    return (
      <button onClick={clear} className={`flex items-center gap-1.5 font-medium text-mint-500 hover:text-ink-700 transition-colors ${compact ? 'text-[12.5px]' : 'text-[13px]'}`}>
        <Check size={13} /> Watching
      </button>
    );
  }

  if (state?.status === 'PASSED') {
    return (
      <button onClick={clear} className={`flex items-center gap-1.5 text-ink-300 hover:text-ink-700 transition-colors ${compact ? 'text-[12.5px]' : 'text-[13px]'}`}>
        <X size={13} /> Passed
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button onClick={watch} className={`flex items-center gap-1.5 font-medium text-ink-500 hover:text-violet-700 transition-colors ${compact ? 'text-[12.5px]' : 'text-[13px]'}`}>
        <Eye size={13} /> Watch
      </button>
      <button onClick={() => setAsking(true)} className={`flex items-center gap-1.5 text-ink-300 hover:text-ink-700 transition-colors ${compact ? 'text-[12.5px]' : 'text-[13px]'}`}>
        <X size={13} /> Pass
      </button>
    </div>
  );
}
