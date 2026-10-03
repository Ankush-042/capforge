import CountUp from '../CountUp.jsx';
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
/**
 * Deeper than they were. The originals were pale enough that, sitting beside
 * the near-black cards elsewhere on the same page, they read as washed out
 * rather than as a deliberate second surface. Same hues, more depth, so a
 * tile holds its own without competing with the dark blocks.
 */
export const TILE_PALETTE = {
  lavender: { bg: '#E3C9FB', fg: '#5B21B6' },
  blue: { bg: '#BEDDFB', fg: '#0F5FBF' },
  peach: { bg: '#FBD7C4', fg: '#C23D26' },
  cream: { bg: '#FBE7B4', fg: '#9A6B00' },
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
  onClick,
  progress,      // 0-100, renders a rail when present
  badge,         // short string, e.g. "3 critical"
  valueColor,    // override for the number, e.g. red when momentum is negative
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10.5px] font-semibold tracking-[0.12em] uppercase" style={{ color: fg, opacity: 0.75 }}>
          {label}
        </p>
        {Icon && (
          // The tinted chip, not a loose icon. This is most of what made the
          // original tiles read as designed rather than assembled.
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              // A solid dark block rather than a tint of the tile's own
              // colour. A chip in the same hue disappears into the tile; a
              // near-black square gives the card an anchor and matches the
              // dark surfaces used elsewhere in the product.
              backgroundColor: '#17171C',
              color: '#FFFFFF',
              boxShadow: '0 1px 3px rgba(20,20,30,0.18)',
            }}
          >
            <Icon size={17} strokeWidth={1.9} />
          </div>
        )}
      </div>

      <div>
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span
            className="text-[40px] font-semibold leading-none tabular-nums tracking-[-0.03em]"
            style={{ color: valueColor || fg }}
          >
            {/* The figure arrives at its value rather than appearing at it,
                which reads as a measurement being taken. Anything that is not
                a number passes straight through. */}
            {typeof value === 'number' ? <CountUp value={value} /> : value}
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
          <p className="text-[12.5px] mt-2 leading-snug truncate" style={{ color: fg, opacity: 0.75 }}>
            {caption}
          </p>
        )}
      </div>
    </>
  );

  const className =
    'rounded-xl p-6 min-h-[148px] shadow-card flex flex-col justify-between transition-all duration-200 ' +
    (to || onClick ? 'hover:shadow-elevated hover:-translate-y-0.5 cursor-pointer' : '');

  // A tile can scroll to a section on the same page rather than navigate away.
  if (!to && onClick) return <button type="button" onClick={onClick} className={`${className} text-left w-full`} style={{ backgroundColor: bg }}>{body}</button>;
  if (!to) return <div className={className} style={{ backgroundColor: bg }}>{body}</div>;
  return <Link to={to} className={className} style={{ backgroundColor: bg }}>{body}</Link>;
}
