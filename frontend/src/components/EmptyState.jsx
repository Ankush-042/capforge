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
