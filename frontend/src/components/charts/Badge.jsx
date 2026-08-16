import React from 'react';

const PRIORITY_STYLE = {
  CRITICAL: { bg: '#FDEEF0', fg: '#E15C4D' },
  HIGH: { bg: '#FEF3E8', fg: '#F0A84E' },
  MEDIUM: { bg: '#FFF9E8', fg: '#C5A93A' },
  LOW: { bg: '#EAF7F0', fg: '#3FB081' },
};

/** Reusable priority/status pill — Attio-style small action/status badge. */
export default function Badge({ label, priority }) {
  const style = PRIORITY_STYLE[priority] || PRIORITY_STYLE.LOW;
  return (
    <span className="text-xs font-medium px-2 py-1 rounded-md" style={{ backgroundColor: style.bg, color: style.fg }}>
      {label}
    </span>
  );
}
