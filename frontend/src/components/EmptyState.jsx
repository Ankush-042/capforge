import React from 'react';
import { Link } from 'react-router-dom';

/**
 * One empty state, used everywhere.
 *
 * These were plain sentences on a white card, and they are among the most
 * seen screens in the product: a new account meets four or five of them
 * before it meets anything else. A sentence alone reads as a dead end, and
 * gives somebody nothing to do next.
 *
 * Three rules, learned from the failures this product already had:
 *
 *   An empty state must say WHY it is empty. "Nothing here" is a shrug;
 *   "two ventures are in your fields and neither has a role for you" is an
 *   answer somebody can act on.
 *
 *   It must distinguish EMPTY from BROKEN. Skill demand told a contributor
 *   there was nothing to measure when its request had simply failed, which
 *   is a lie the person believes and leaves on.
 *
 *   And it should offer the one thing worth doing next, when there is one.
 *   Not three links. One.
 */
/**
 * The failure case, as its own thing.
 *
 * A page that cannot load its data must not render the same screen as a page
 * whose data is genuinely empty. One is a problem with us; the other is an
 * answer about the world, and showing the second when the first is true is a
 * lie somebody acts on.
 */
export function LoadFailed({ what = 'This', onRetry }) {
  return (
    <div className="bg-surface rounded-xl border border-surface-border shadow-card py-14 px-8 text-center">
      <div className="w-11 h-11 rounded-xl mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: '#FDF1EF' }}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#C85A4A" strokeWidth="1.75" strokeLinecap="round">
          <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
        </svg>
      </div>
      <p className="text-[15.5px] font-medium text-ink-950 mb-1.5">{what} could not be loaded.</p>
      <p className="text-[13.5px] text-ink-500 leading-relaxed max-w-sm mx-auto">
        This is a loading problem rather than an empty platform. The data is there.
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 bg-ink-900 hover:bg-ink-700 text-white px-5 py-2.5 rounded-full text-[13.5px] font-medium transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export default function EmptyState({
  icon: Icon,
  title,
  body,
  action,          // { label, to } or { label, onClick }
  tone = 'quiet',  // 'quiet' | 'failure'
}) {
  const failed = tone === 'failure';

  return (
    <div className="bg-surface rounded-xl border border-surface-border shadow-card py-14 px-8 text-center">
      {Icon && (
        <div
          className="w-11 h-11 rounded-xl mx-auto mb-4 flex items-center justify-center"
          style={{ backgroundColor: failed ? '#FDF1EF' : '#F3F3F6' }}
        >
          <Icon size={19} style={{ color: failed ? '#C85A4A' : '#8A8A99' }} />
        </div>
      )}

      <p className="text-[15.5px] font-medium text-ink-950 mb-1.5">{title}</p>

      {body && (
        <p className="text-[13.5px] text-ink-500 leading-relaxed max-w-sm mx-auto">{body}</p>
      )}

      {action && (
        action.to ? (
          <Link
            to={action.to}
            className="inline-flex items-center gap-1.5 mt-5 bg-ink-900 hover:bg-ink-700 text-white px-5 py-2.5 rounded-full text-[13.5px] font-medium transition-colors"
          >
            {action.label}
          </Link>
        ) : (
          <button
            onClick={action.onClick}
            className="inline-flex items-center gap-1.5 mt-5 bg-ink-900 hover:bg-ink-700 text-white px-5 py-2.5 rounded-full text-[13.5px] font-medium transition-colors"
          >
            {action.label}
          </button>
        )
      )}
    </div>
  );
}
