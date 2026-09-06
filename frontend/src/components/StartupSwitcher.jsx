import React, { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useActiveStartup } from '../context/ActiveStartupContext.jsx';

/**
 * Phase E — real switcher, only rendered when a founder actually has
 * more than one venture (the exact case that was previously broken).
 */
export default function StartupSwitcher() {
  const { startups, activeStartup, setActiveId, hasMultiple } = useActiveStartup();
  const [open, setOpen] = useState(false);

  if (!hasMultiple || !activeStartup) return null;

  return (
    <div className="relative mb-2">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-surface-muted hover:bg-surface-border transition-colors text-left">
        <span className="text-[13px] font-medium text-ink-900 truncate">{activeStartup.name}</span>
        <ChevronDown size={14} className="text-ink-500 shrink-0" />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-surface-border rounded-lg shadow-elevated z-10 py-1">
          {startups.map((s) => (
            <button key={s.id} onClick={() => { setActiveId(s.id); setOpen(false); window.location.reload(); }}
              className="w-full flex items-center justify-between px-3 py-2 text-[13px] text-left hover:bg-surface-muted transition-colors">
              <span className="truncate">{s.name}</span>
              {s.id === activeStartup.id && <Check size={14} className="text-violet-600 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
