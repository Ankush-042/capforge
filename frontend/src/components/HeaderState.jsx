import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getProgress, getRankedVentures, getInvestorRecommendations } from '../services/startups.js';

/**
 * The numbers you would otherwise go hunting for, in the bar at the top.
 *
 * The header named the page, which the sidebar already does, so it carried no
 * information and read as a band of filler across every screen. This is what
 * it should have been carrying: the two or three figures that tell somebody
 * where they stand, each one a link to the page that explains it.
 *
 * Deliberately different per persona, because "where do I stand" is a
 * different question for each of them. A founder asks how ready they are and
 * what is still open; a contributor asks how many ventures are in their
 * fields; an investor asks how many are a close fit.
 *
 * NEVER A BLOCKER. It loads after the page, fails silently, and renders
 * nothing until it has something true to say. A header that can break a page
 * is worse than a header that says nothing.
 */

function Stat({ label, value, to }) {
  const body = (
    <div className="text-right">
      <p className="text-[17px] font-semibold text-ink-950 tabular-nums leading-none">{value}</p>
      <p className="text-[10px] font-medium tracking-[0.1em] uppercase text-ink-300 mt-1">{label}</p>
    </div>
  );
  return to
    ? <Link to={to} className="hover:opacity-70 transition-opacity">{body}</Link>
    : body;
}

export default function HeaderState({ persona, startupId }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (persona === 'FOUNDER' && startupId) {
          const { ok, data } = await getProgress(startupId);
          if (!alive || !ok || !data.success) return;
          const p = data.progress;
          const open = (p.dimensions || []).reduce((a, d) => a + (d.gaps?.length || 0), 0);
          setStats([
            { label: 'Readiness', value: p.score ?? '—', to: '/app/readiness' },
            ...(open > 0 ? [{ label: 'Roles open', value: open, to: '/app/gaps' }] : []),
          ]);
        } else if (persona === 'CONTRIBUTOR') {
          const { ok, data } = await getRankedVentures();
          if (!alive || !ok || !data.success) return;
          setStats([
            { label: 'In your fields', value: data.facts.venturesInYourFields, to: '/app/contributor/opportunities' },
            ...(data.facts.venturesWithARoleForYou > 0
              ? [{ label: 'With a role', value: data.facts.venturesWithARoleForYou, to: '/app/contributor/opportunities' }]
              : []),
          ]);
        } else if (persona === 'INVESTOR') {
          const { ok, data } = await getInvestorRecommendations();
          if (!alive || !ok || !data.success) return;
          const deals = data.recommendations || [];
          const close = deals.filter((d) => parseFloat(d.score) >= 0.5).length;
          setStats([
            { label: 'In deal flow', value: deals.length, to: '/app/investor/deal-flow' },
            ...(close > 0 ? [{ label: 'Close fit', value: close, to: '/app/investor/deal-flow' }] : []),
          ]);
        }
      } catch {
        /* The header must never be what breaks a page. */
      }
    })();
    return () => { alive = false; };
  }, [persona, startupId]);

  if (!stats || stats.length === 0) return null;

  return (
    <div className="hidden lg:flex items-center gap-7 pr-7 mr-1 border-r border-surface-border">
      {stats.map((s) => <Stat key={s.label} {...s} />)}
    </div>
  );
}
