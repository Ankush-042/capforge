import React from 'react';
import { Link } from 'react-router-dom';

/**
 * The dashboard metric tile.
 *
 * This restores the treatment the original StatCard had and my rebuild lost.
 * The colour alone was never what made those tiles work: it was the generous
 * padding, the fixed height so a row of them shares one baseline, the
 * content pushed to top and bottom so the middle can breathe, the icon in a
 * tinted chip rather than floating loose, and every piece of text tinted
 * from the tile's own colour instead of a grey that fights the fill.
 *
 * One component, used by all three dashboards. Three copies of the same
 * treatment is how the founder and contributor homes drifted apart in the
 * first place.
 */
export const TILE_PALETTE = {
  lavender: { bg: '#EED8FF', fg: '#6D28D9' },
  blue: { bg: '#D1EAFE', fg: '#1677E8' },
  peach: { bg: '#FFE8DA', fg: '#E84C32' },
  cream: { bg: '#FFF3D1', fg: '#C58A00' },
};

export default function MetricTile({
  label,
  value,
  unit,
  caption,
  icon: Icon,
  bg,
  fg,
  to,
  progress,      // 0-100, renders a rail when present
  badge,         // short string, e.g. "3 critical"
  valueColor,    // override for the number, e.g. red when momentum is negative
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-semibold tracking-wide uppercase" style={{ color: fg, opacity: 0.75 }}>
          {label}
        </p>
        {Icon && (
          // The tinted chip, not a loose icon. This is most of what made the
          // original tiles read as designed rather than assembled.
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${fg}22`, color: fg }}
          >
            <Icon size={16} strokeWidth={2} />
          </div>
        )}
      </div>

      <div>
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span
            className="text-[38px] font-bold leading-none tabular-nums tracking-tight"
            style={{ color: valueColor || fg }}
          >
            {value}
          </span>
          {unit && <span className="text-[15px] font-medium" style={{ color: fg, opacity: 0.6 }}>{unit}</span>}
          {badge && (
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
              style={{ backgroundColor: `${fg}22`, color: fg }}
            >
              {badge}
            </span>
          )}
        </div>

        {typeof progress === 'number' && (
          <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: `${fg}1F` }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.max(0, Math.min(100, progress))}%`, backgroundColor: fg }}
            />
          </div>
        )}

        {caption && (
          <p className="text-[13px] mt-2 leading-snug truncate" style={{ color: fg, opacity: 0.75 }}>
            {caption}
          </p>
        )}
      </div>
    </>
  );

  const className =
    'rounded-xl p-6 min-h-[148px] shadow-card flex flex-col justify-between transition-all duration-200 ' +
    (to ? 'hover:shadow-elevated hover:-translate-y-0.5 cursor-pointer' : '');

  if (!to) return <div className={className} style={{ backgroundColor: bg }}>{body}</div>;
  return <Link to={to} className={className} style={{ backgroundColor: bg }}>{body}</Link>;
}
