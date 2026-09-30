import React from 'react';

/**
 * Shapes that match what is coming, instead of a spinner.
 *
 * A spinner says "waiting". A skeleton says "arriving", and because it holds
 * the shape of the content the page does not jump when the data lands. Every
 * page in this product opened with a spinner in the middle of an empty
 * rectangle, which is the cheapest possible answer and reads like one.
 */

export function SkeletonLine({ w = '100%', h = 13, className = '' }) {
  return (
    <div
      className={`rounded bg-surface-muted animate-pulse ${className}`}
      style={{ width: w, height: h }}
    />
  );
}

/** A card-shaped placeholder, matching the product's real card. */
export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="bg-surface rounded-xl border border-surface-border shadow-card p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <SkeletonLine w="42%" h={15} className="mb-2.5" />
          <SkeletonLine w="64%" h={12} />
        </div>
        <SkeletonLine w={44} h={26} />
      </div>
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonLine key={i} w={i === lines - 1 ? '58%' : '100%'} h={12} />
        ))}
      </div>
    </div>
  );
}

/** What most list pages need: a heading block, then cards. */
export default function SkeletonPage({ cards = 3 }) {
  return (
    <div>
      <div className="mb-7">
        <SkeletonLine w={92} h={11} className="mb-3.5" />
        <SkeletonLine w="56%" h={30} className="mb-3" />
        <SkeletonLine w="72%" h={14} />
      </div>
      <div className="space-y-4">
        {Array.from({ length: cards }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  );
}
