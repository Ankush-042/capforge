import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowUpRight, AlertTriangle, Eye, MessageSquare, Target, Check } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import MetricTile, { TILE_PALETTE } from '../components/charts/MetricTile.jsx';
import { getMyStanding } from '../services/startups.js';

/**
 * How you are doing, and why.
 *
 * A founder gets readiness, a breakdown, and a page naming the specific causes.
 * A contributor got nothing about themselves. Someone three weeks in with no
 * conversations had no way to know whether their profile was weak, their
 * fields were wrong, nobody was building in their space, or they were being
 * seen and simply not chosen. Four different problems, four different fixes,
 * and the product could not tell them apart.
 *
 * NOT A SCORE. Scoring a person the way a venture is scored would be grim and
 * wrong: a venture is a thing you fix, a person is not a number. This names a
 * situation and what would change it.
 */

const SITUATION = {
  HIDDEN: {
    eyebrow: 'Nothing can reach you',
    title: 'You are hidden from search.',
    body: 'Founders cannot find you and matching will not surface you. Nothing else on this page matters until this changes.',
  },
  PROFILE_THIN: {
    eyebrow: 'Working with very little',
    title: 'Matching does not have much to go on yet.',
    body: 'The engine weighs what you want as heavily as what you can do. Right now several of those fields are empty, so it is guessing.',
  },
  EMPTY_MARKET: {
    eyebrow: 'Not your fault',
    title: 'Nobody is building in the fields you picked.',
    body: 'There are no open roles at all in those areas right now. That is a market problem, not a profile problem. Widening your fields is the only thing that changes it.',
  },
  NO_MATCHES: {
    eyebrow: 'Nothing has matched yet',
    title: 'Ventures exist in your fields, but none have matched you.',
    body: 'There is work in your space, so the gap is between what they need and what your profile says you do.',
  },
  TOO_EARLY: {
    eyebrow: 'Early days',
    title: 'Too early to read anything into this.',
    body: 'You have been here less than a week. Ventures are matched as founders work out what they need, which does not happen all at once.',
  },
  MATCHED_NOT_TALKING: {
    eyebrow: 'Matched, not talking',
    title: 'Ventures want you. No conversation has started.',
    body: 'This is the one situation entirely in your hands. Nothing on this platform happens until someone sends a message, and either side can be the one who does.',
  },
  MOVING: {
    eyebrow: 'In motion',
    title: 'You are in conversation.',
    body: 'The rest is between you and them. Nothing here can tell you whether it is the right one.',
  },
};

export default function ContributorStanding() {
  const [loading, setLoading] = useState(true);
  const [s, setS] = useState(null);

  useEffect(() => {
    getMyStanding().then(({ ok, data }) => {
      if (ok && data.success) setS(data.standing);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <Shell persona="CONTRIBUTOR" title="How you are doing">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" />
        </div>
      </Shell>
    );
  }

  if (!s) {
    return (
      <Shell persona="CONTRIBUTOR" title="How you are doing">
        <div className="bg-surface rounded-xl border border-surface-border shadow-card py-16 text-center">
          <p className="text-[15px] text-ink-700 mb-1">No profile yet.</p>
          <Link to="/app/my-profile" className="text-[13px] text-violet-700 hover:text-violet-600 transition-colors">Set one up</Link>
        </div>
      </Shell>
    );
  }

  const sit = SITUATION[s.situation] || SITUATION.TOO_EARLY;

  return (
    <Shell persona="CONTRIBUTOR" title="How you are doing" subtitle="What is working, and what is not">
      <div className="mb-7">
        <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-violet-600 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
          {sit.eyebrow}
        </p>
        <h1 className="font-editorial italic text-[32px] text-trust-fg leading-tight max-w-3xl">{sit.title}</h1>
        <p className="text-[15px] text-ink-700 mt-3 max-w-2xl leading-relaxed">{sit.body}</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <MetricTile
          label="Ventures matching you" value={s.matches}
          icon={Target} to="/app/contributor/opportunities" {...TILE_PALETTE.lavender}
          caption={s.matches === 0 ? 'Nothing yet' : `Best fit ${s.bestScore}%`}
        />
        <MetricTile
          label="Conversations" value={s.conversations}
          icon={MessageSquare} to="/app/inbox" {...TILE_PALETTE.blue}
          caption={s.conversations === 0 ? 'None started' : 'Founders you are talking to'}
        />
        <MetricTile
          label="Profile views" value={s.profileViews}
          icon={Eye} {...TILE_PALETTE.peach}
          caption={s.profileViews === 0 ? 'Nobody has looked yet' : 'People who opened your profile'}
        />
        <MetricTile
          label="Profile" value={s.completion} unit="%"
          icon={Check} to="/app/my-profile" {...TILE_PALETTE.cream}
          progress={s.completion}
          caption={s.completion < 80 ? 'Fuller profiles match better' : 'Complete enough'}
        />
      </div>

      {/* The specific things costing them, named, with what each actually
          affects. Not generic profile advice: these are the same fields the
          matching engine weighs. */}
      {s.gaps.length > 0 && (
        <div className="mb-8">
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <h2 className="text-[15px] font-semibold text-ink-900">What is costing you</h2>
              <p className="text-[13px] text-ink-500 mt-0.5">Each of these is something the matching engine actually reads.</p>
            </div>
          </div>
          <div className="space-y-3">
            {s.gaps.map((g, i) => (
              <motion.div
                key={g.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.25) }}
                className="relative overflow-hidden bg-surface rounded-xl border border-surface-border shadow-card p-6 pl-7"
              >
                <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-amber-400" />
                <div className="flex items-start justify-between gap-6">
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-ink-950 mb-1">{g.what}</p>
                    <p className="text-[13.5px] text-ink-700 leading-relaxed">{g.why}</p>
                  </div>
                  <Link
                    to={g.to}
                    className="shrink-0 flex items-center gap-1.5 text-[13px] font-medium text-violet-700 hover:text-violet-600 transition-colors"
                  >
                    Fix it <ArrowUpRight size={13} />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* The market answer. This is what separates "nobody wants you" from
          "nobody is building in your space", which is the distinction that
          decides whether someone should change their profile or change their
          expectations. */}
      <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
        <p className="text-[15px] font-semibold text-ink-950 mb-1">Is there work in your space?</p>
        <p className="text-[13.5px] text-ink-700 leading-relaxed">
          {s.domainCount === 0
            ? 'You have not picked any fields, so there is nothing to measure this against.'
            : s.rolesInYourFields === 0
              ? `No open roles anywhere in the ${s.domainCount === 1 ? 'field' : 'fields'} you picked. Nothing about your profile changes that.`
              : `${s.rolesInYourFields} open ${s.rolesInYourFields === 1 ? 'role' : 'roles'} across the platform in your fields. ${
                  s.matches === 0
                    ? 'None have matched you, so the gap is between what they need and what your profile says.'
                    : `${s.matches} of them matched you.`
                }`}
        </p>
        {s.rolesInYourFields === 0 && s.domainCount > 0 && (
          <Link to="/app/my-profile" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-violet-700 hover:text-violet-600 transition-colors mt-3">
            Widen your fields <ArrowUpRight size={13} />
          </Link>
        )}
        {s.dismissed > 0 && (
          <p className="text-[12.5px] text-ink-500 mt-3 pt-3 border-t border-surface-border">
            You have told us {s.dismissed} {s.dismissed === 1 ? 'venture was' : 'ventures were'} not for you. That is shaping what you get shown.
          </p>
        )}
      </div>
    </Shell>
  );
}
