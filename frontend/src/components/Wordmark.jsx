import React from 'react';

/**
 * CapForge, set once.
 *
 * It was plain bold sans in two places with slightly different sizes, which
 * is a name rather than a mark. A wordmark needs one idea, and the idea here
 * is in the second half of the word: Cap is the thing everybody else sells,
 * Forge is what this actually does. So the weight splits — the first half
 * quiet, the second carrying the editorial serif the whole product already
 * uses for anything that matters.
 *
 * No icon, no gradient, no glyph. The product's visual language is typography
 * and restraint, and a logo mark would be the one piece arguing against that.
 */
export default function Wordmark({ size = 16, className = '' }) {
  return (
    <span
      className={`inline-flex items-baseline leading-none tracking-[-0.025em] ${className}`}
      style={{ fontSize: size }}
    >
      <span className="font-display font-medium text-ink-800">Cap</span>
      <span className="font-editorial italic font-semibold text-ink-950" style={{ marginLeft: '0.5px' }}>Forge</span>
    </span>
  );
}
