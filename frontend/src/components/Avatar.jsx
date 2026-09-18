import React from 'react';

/**
 * One avatar, everywhere.
 *
 * The initial-circle pattern was duplicated across six files, each with its
 * own size, its own colour logic and its own fallback. Adding images to six
 * copies would have guaranteed they drifted apart, so this replaces all of
 * them.
 *
 * Colour is DERIVED FROM THE NAME rather than random, so the same person is
 * the same colour on every screen. That consistency is the only thing that
 * made initials usable at all, and it is preserved for anyone without a
 * picture.
 *
 * A broken image falls back to the initial rather than rendering a broken-image
 * icon. Data URIs do not usually fail, but a truncated one would, and a broken
 * icon next to someone's name looks worse than no picture at all.
 */

const TONES = [
  { bg: '#EED8FF', fg: '#6D28D9' },
  { bg: '#D1EAFE', fg: '#1677E8' },
  { bg: '#EAF7F0', fg: '#1F5D52' },
  { bg: '#FFE8DA', fg: '#E84C32' },
  { bg: '#FFF3D1', fg: '#C58A00' },
];

function toneFor(name) {
  const s = String(name || '?');
  let sum = 0;
  for (let i = 0; i < s.length; i++) sum += s.charCodeAt(i);
  return TONES[sum % TONES.length];
}

export default function Avatar({ name, src, size = 40, className = '' }) {
  const [failed, setFailed] = React.useState(false);
  const tone = toneFor(name);
  const initial = String(name || '?').trim().charAt(0).toUpperCase() || '?';

  const style = { width: size, height: size };

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name || ''}
        onError={() => setFailed(true)}
        style={style}
        className={`rounded-full object-cover shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      style={{ ...style, backgroundColor: tone.bg, color: tone.fg, fontSize: Math.round(size * 0.4) }}
      className={`rounded-full flex items-center justify-center font-semibold shrink-0 select-none ${className}`}
      aria-label={name || undefined}
    >
      {initial}
    </div>
  );
}
