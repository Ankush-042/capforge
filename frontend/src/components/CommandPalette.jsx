import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const COMMANDS = [
  { label: 'Go to Dashboard', path: '/app' },
  { label: 'View Gaps', path: '/app/gaps' },
  { label: 'View Team', path: '/app/team' },
  { label: 'View Readiness', path: '/app/readiness' },
  { label: 'Search', path: '/app/search' },
  { label: 'Notifications', path: '/app/notifications' },
  { label: 'Settings', path: '/app/settings' },
];

/**
 * Global command palette (⌘K / Ctrl+K), controlled from Shell so there's
 * exactly one keyboard listener regardless of how many screens are mounted.
 */
export default function CommandPalette({ open, onClose }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) { setQuery(''); setTimeout(() => inputRef.current?.focus(), 10); }
  }, [open]);

  useEffect(() => {
    function handleKeyDown(e) { if (e.key === 'Escape') onClose(); }
    if (open) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const filtered = COMMANDS.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 bg-ink-950/30 z-50 flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="bg-surface rounded-xl border border-surface-border shadow-elevated w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-surface-border">
          <span className="text-ink-300">⌕</span>
          <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-[15px] text-ink-900 placeholder:text-ink-300 focus:outline-none" />
          <kbd className="text-xs text-ink-300 border border-surface-border rounded px-1.5 py-0.5">Esc</kbd>
        </div>
        <div className="max-h-72 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="text-[13px] text-ink-500 px-3 py-4 text-center">No matching commands.</p>
          ) : filtered.map((c) => (
            <button key={c.path} onClick={() => { navigate(c.path); onClose(); }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-[15px] text-ink-700 hover:bg-surface-muted transition-colors">
              {c.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
