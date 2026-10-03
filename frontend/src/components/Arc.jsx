import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Learn, earn, connect, grow — the arc a contributor is actually on, which
 * nothing in this product has ever acknowledged.
 *
 * WHY IT MATTERS. Somebody signs up, fills in a profile, and is handed a
 * dashboard. They have no idea what this is for, where they are in it, or
 * what the end of it looks like. A list of pages is not a journey, and a
 * person who cannot see the journey has no reason to take the next step.
 *
 * It is drawn from their real state rather than decorated: each stage is
 * reached or not, by a fact, and the one they are on says what moves them.
 * A progress bar that moves on its own teaches nothing. This moves when they
 * actually do something.
 *
 * AMBITION IN THE PROMISE, HONESTY IN THE DELIVERY. The end of the arc is
 * worth wanting and the product does not pretend they are further along than
 * they are. That tension is the whole brand: everything else in this space
 * flatters, and flattery has never built a company.
 */
export default function Arc({ reached = {}, className = '' }) {
  const stages = [
    {
      key: 'learn',
      label: 'Learn',
      done: reached.learn,
      doneLine: 'You know what ventures here are short of.',
      nextLine: 'Find out what the ventures here actually need.',
      to: '/app/contributor/skill-demand',
    },
    {
      key: 'connect',
      label: 'Connect',
      done: reached.connect,
      doneLine: 'You have started a conversation.',
      nextLine: 'Nothing happens until somebody writes first. It can be you.',
      to: '/app/contributor/opportunities',
    },
    {
      key: 'earn',
      label: 'Earn',
      done: reached.earn,
      doneLine: 'You are on a team, with a stake in it.',
      nextLine: 'Join something and own part of what you build.',
      to: '/app/contributor/opportunities',
    },
    {
      key: 'grow',
      label: 'Grow',
      done: reached.grow,
      doneLine: 'What you have done here is visible to everyone who looks.',
      nextLine: 'Useful work shows on your profile and brings the next thing to you.',
      to: '/app/my-profile',
    },
  ];

  const current = stages.find((st) => !st.done) || stages[stages.length - 1];

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-ink-950 px-8 py-8 ${className}`}>
      <div
        className="absolute inset-0 opacity-[0.32]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 14% 10%, rgba(124,92,252,0.32) 0%, transparent 46%), radial-gradient(circle at 88% 88%, rgba(63,176,129,0.24) 0%, transparent 44%)',
        }}
      />

      <div className="relative">
        <div className="flex items-center gap-2.5 mb-6">
          {stages.map((st, i) => (
            <React.Fragment key={st.key}>
              <span
                className={`text-[12px] font-semibold tracking-[0.1em] uppercase transition-colors ${
                  st.done ? 'text-white' : st.key === current.key ? 'text-violet-300' : 'text-white/25'
                }`}
              >
                {st.label}
              </span>
              {i < stages.length - 1 && (
                <span className={`h-px flex-1 ${st.done ? 'bg-white/35' : 'bg-white/10'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <p className="font-editorial italic text-[25px] leading-[1.18] text-white tracking-[-0.02em] max-w-xl">
          {current.done ? current.doneLine : current.nextLine}
        </p>

        {!current.done && (
          <Link
            to={current.to}
            className="inline-flex items-center gap-1.5 mt-5 bg-white hover:bg-white/90 text-ink-950 px-5 py-2.5 rounded-full text-[13.5px] font-medium transition-colors"
          >
            {current.key === 'learn' ? 'See what is needed'
              : current.key === 'connect' ? 'Find where you fit'
              : current.key === 'earn' ? 'See your matches'
              : 'Open your profile'}
          </Link>
        )}
      </div>
    </div>
  );
}
