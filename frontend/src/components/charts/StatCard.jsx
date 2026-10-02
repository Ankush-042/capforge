import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Reusable pastel-solid stat card — the LOCKED KPI card treatment from
 * Sprint 17 round 3. Every screen's top-row metrics should use this,
 * not a re-implementation.
 */
export default function StatCard({ label, value, sub, icon, bg, fg, onClick, to }) {
  // A card with a number on it looks like a door, so it should open. When
  // neither onClick nor to is given it renders exactly as before, so nothing
  // that already uses this changes.
  const interactive = Boolean(onClick || to);
  const Tag = to ? Link : onClick ? 'button' : 'div';
  const props = to ? { to } : onClick ? { onClick, type: 'button' } : {};

  return (
    <Tag
      {...props}
      className={`rounded-xl p-6 min-h-[132px] shadow-card flex flex-col justify-between w-full text-left ${
        interactive ? 'transition-transform duration-150 hover:-translate-y-0.5 cursor-pointer' : ''
      }`}
      style={{ backgroundColor: bg }}
    >
      <div className="flex items-start justify-between">
        <p className="text-[15px] font-medium" style={{ color: fg }}>{label}</p>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base" style={{ backgroundColor: `${fg}22`, color: fg }}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-4xl font-bold leading-none mb-2" style={{ color: fg }}>{value}</p>
        <p className="text-[13px] opacity-70" style={{ color: fg }}>{sub}</p>
      </div>
    </Tag>
  );
}

// LOCKED palette (Sprint 17 feedback round 2) — use these, don't invent new ones.
export const STAT_PALETTE = {
  lavender: { bg: '#EED8FF', fg: '#6D28D9' },
  blue: { bg: '#D1EAFE', fg: '#1677E8' },
  peach: { bg: '#FFE8DA', fg: '#E84C32' },
  cream: { bg: '#FFF3D1', fg: '#C58A00' },
};
