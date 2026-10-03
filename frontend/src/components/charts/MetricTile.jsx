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
 * NO COLOUR. The tinted tiles never sat right: pale, they washed out beside
 * the near-black cards on the same page; deepened, they fought them. Colour
 * was doing no work here — four tiles in four hues is decoration, not
 * information, since the hue never meant anything.
 *
 * So the tile is white and separation comes from DEPTH instead. On a
 * near-white canvas a white card disappears unless it is genuinely lifted,
 * which takes three things working together: a shadow that reads as cast
 * rather than painted, a border a shade darker than the canvas, and a faint
 * highlight along the top edge where light would strike a raised surface.
 *
 * The only black element is the icon block, which is what gives each tile an
 * anchor and ties these to the dark cards elsewhere in the product.
 *
 * The four keys are kept so every existing call site still works. They now
 * differ only in the accent used for a progress rail or a badge, where the
 * colour still carries meaning.
 */
const SURFACE = {
  bg: '#FFFFFF',
  fg: '#14141A',
};

export const TILE_PALETTE = {
  lavender: { ...SURFACE, accent: '#6D28D9' },
  blue: { ...SURFACE, accent: '#1677E8' },
  peach: { ...SURFACE, accent: '#E84C32' },
  cream: { ...SURFACE, accent: '#C58A00' },
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
  accent,        // the one place colour still carries meaning: badge and rail
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10.5px] font-semibold tracking-[0.12em] uppercase" style={{ color: '#8A8A99' }}>
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
          {unit && <span className="text-[15px] font-medium" style={{ color: '#8A8A99' }}>{unit}</span>}
          {badge && (
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
              style={{ backgroundColor: `${accent || fg}18`, color: accent || fg }}
            >
              {badge}
            </span>
          )}
        </div>

        {typeof progress === 'number' && (
          <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#EDEDF2' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.max(0, Math.min(100, progress))}%`, backgroundColor: accent || fg }}
            />
          </div>
        )}

        {caption && (
          <p className="text-[12.5px] mt-2 leading-snug truncate" style={{ color: '#6B6B78' }}>
            {caption}
          </p>
        )}
      </div>
    </>
  );

  const className =
    'rounded-xl p-6 min-h-[148px] flex flex-col justify-between transition-all duration-200 ' +
    (to || onClick ? 'hover:-translate-y-0.5 cursor-pointer' : '');

  /**
   * DEPTH INSTEAD OF COLOUR. On a near-white canvas a white card merges into
   * the page unless it is genuinely lifted, and three things together are
   * what do that:
   *
   *   a two-part shadow — a tight contact shadow directly beneath the edge
   *   and a wider, softer one below it, which is how a real cast shadow
   *   behaves and why a single blurred box-shadow reads as painted on;
   *
   *   a border a shade darker than the canvas, so the edge is defined even
   *   where the shadow is weakest;
   *
   *   and a one-pixel light line along the top inside edge, where light
   *   would strike a raised surface. It is almost invisible on its own and
   *   it is most of what sells the effect.
   */
  const raised = {
    backgroundColor: bg,
    border: '1px solid #E8E8EE',
    boxShadow: [
      '0 1px 2px rgba(20,20,35,0.05)',
      '0 4px 12px rgba(20,20,35,0.06)',
      'inset 0 1px 0 rgba(255,255,255,0.9)',
    ].join(', '),
  };

  const lifted = {
    ...raised,
    boxShadow: [
      '0 2px 4px rgba(20,20,35,0.06)',
      '0 12px 28px rgba(20,20,35,0.10)',
      'inset 0 1px 0 rgba(255,255,255,0.9)',
    ].join(', '),
  };

  const interactive = Boolean(to || onClick);
  const style = raised;
  const hoverProps = interactive
    ? {
        onMouseEnter: (e) => { e.currentTarget.style.boxShadow = lifted.boxShadow; },
        onMouseLeave: (e) => { e.currentTarget.style.boxShadow = raised.boxShadow; },
      }
    : {};

  // A tile can scroll to a section on the same page rather than navigate away.
  if (!to && onClick) return <button type="button" onClick={onClick} className={`${className} text-left w-full`} style={style} {...hoverProps}>{body}</button>;
  if (!to) return <div className={className} style={style}>{body}</div>;
  return <Link to={to} className={className} style={style} {...hoverProps}>{body}</Link>;
}
