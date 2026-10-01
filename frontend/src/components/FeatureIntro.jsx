import React from 'react';
import { Link } from 'react-router-dom';

/**
 * What a feature is, and why anybody should bother, said where they arrive.
 *
 * THE PROBLEM THIS SOLVES. Every surface in this product is named rather
 * than explained. Sparks. Launches. Circles. Standing. Explore. A person who
 * has just signed up lands on one of them, sees a title they have never
 * encountered and an empty page underneath, and leaves. The feature is not
 * missing; the reason to use it is.
 *
 * So the empty state does the persuading. Not a tooltip, not a help link, not
 * a tour: the page itself makes the case, once, in the product's own voice.
 *
 * THE VOICE IS THE BRAND. Everything else in this space flatters people.
 * CapForge tells them no open role fits, that product-market fit is not
 * measured, that a weak match is weak. That honesty is what makes the
 * ambition believable, so the argument here is never a sales pitch: it says
 * plainly what the thing is worth and what it costs.
 *
 * Shown ONLY when there is nothing yet. The moment somebody has used a
 * feature, explaining it is noise.
 */
export default function FeatureIntro({
  eyebrow,      // what it is, in two or three words
  headline,     // the argument, in one line
  body,         // why it is worth the effort
  points,       // up to three concrete facts
  action,       // { label, to }
  secondary,    // { label, to }
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-ink-950 px-9 py-11">
      {/* The dark block, which is the product's strongest visual device and
          currently lives only on Circles. A verdict or an invitation belongs
          on it; a list does not. */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 18% 12%, rgba(124,92,252,0.30) 0%, transparent 46%), radial-gradient(circle at 88% 84%, rgba(63,176,129,0.22) 0%, transparent 42%)',
        }}
      />

      <div className="relative max-w-2xl">
        {eyebrow && (
          <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] uppercase text-white/45 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
            {eyebrow}
          </p>
        )}

        <h2 className="font-editorial italic text-[30px] leading-[1.14] text-white tracking-[-0.02em]">
          {headline}
        </h2>

        <p className="text-[15px] text-white/70 leading-relaxed mt-4">{body}</p>

        {points?.length > 0 && (
          <div className="flex flex-wrap gap-x-9 gap-y-3 mt-7">
            {points.map((p) => (
              <div key={p.label}>
                <p className="text-[19px] font-semibold text-white tabular-nums leading-none">{p.value}</p>
                <p className="text-[11.5px] text-white/45 mt-1.5">{p.label}</p>
              </div>
            ))}
          </div>
        )}

        {(action || secondary) && (
          <div className="flex items-center gap-5 mt-8">
            {action && (
              <Link
                to={action.to}
                className="bg-white hover:bg-white/90 text-ink-950 px-5 py-2.5 rounded-full text-[14px] font-medium transition-colors"
              >
                {action.label}
              </Link>
            )}
            {secondary && (
              <Link to={secondary.to} className="text-[13.5px] text-white/60 hover:text-white transition-colors">
                {secondary.label}
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
