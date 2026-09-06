import React from 'react';

/**
 * Phase 8 — a real, consistent empty state instead of a bare line of
 * text sitting in a card. Small icon + message + optional action,
 * used everywhere the app currently just prints "No X yet."
 */
export default function EmptyState({ icon: Icon, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {Icon && <div className="w-11 h-11 rounded-full bg-surface-muted flex items-center justify-center mb-3"><Icon size={18} className="text-ink-300" /></div>}
      <p className="text-[15px] text-ink-500 max-w-xs">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
