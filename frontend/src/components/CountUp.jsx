import React, { useState, useEffect, useRef } from 'react';

/**
 * A figure that arrives at its value rather than appearing at it.
 *
 * Motion here explains a change instead of decorating one: a readiness score
 * counting to 48 reads as a measurement being taken, which is what it is.
 *
 * Deliberately restrained, because the failure mode of animation is looking
 * generated rather than designed. It runs once, it is short, it respects
 * prefers-reduced-motion, and anything that is not a finite number is
 * rendered straight through without ceremony.
 */
export default function CountUp({ value, duration = 650, className = '', suffix = '' }) {
  const target = Number(value);
  const [shown, setShown] = useState(Number.isFinite(target) ? 0 : value);
  const started = useRef(false);

  useEffect(() => {
    if (!Number.isFinite(target)) { setShown(value); return; }

    const reduced = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced || started.current) { setShown(target); return; }

    started.current = true;
    const from = 0;
    const t0 = performance.now();
    let frame;

    const tick = (now) => {
      const p = Math.min((now - t0) / duration, 1);
      // Ease out: fast at first, settling at the end, which is how a figure
      // being measured behaves rather than a slider being dragged.
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(from + (target - from) * eased));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, value, duration]);

  return <span className={className}>{shown}{suffix}</span>;
}
