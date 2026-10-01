import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Eye, UserPlus, TrendingUp, Compass, Target, MessageSquare, Gauge } from 'lucide-react';

/**
 * Four shortcuts in the header, to the things each persona actually does.
 *
 * The bar named the page, which the sidebar already does, so it carried no
 * information and read as filler on every screen. These are actions rather
 * than navigation, which is why they are icons and not labels: the sidebar is
 * where you go, this is what you do, and if the two looked alike the bar
 * would just be clutter.
 *
 * Readiness was tried here first and removed, because it is already the
 * largest thing on the home page and repeating it taught nobody anything.
 */

const SHORTCUTS = {
  FOUNDER: [
    { icon: Sparkles, label: 'Ask about your venture', to: '/app/assistant' },
    { icon: Eye, label: 'How it looks to an investor', to: '/app/investability' },
    { icon: UserPlus, label: 'Find people', to: '/app/gaps' },
    { icon: TrendingUp, label: 'Find investors', to: '/app/find-investors' },
  ],
  CONTRIBUTOR: [
    { icon: Sparkles, label: 'Ask about your options', to: '/app/assistant' },
    { icon: Target, label: 'Ventures in your fields', to: '/app/contributor/opportunities' },
    { icon: Gauge, label: 'How you are doing', to: '/app/contributor/standing' },
    { icon: MessageSquare, label: 'Messages', to: '/app/inbox' },
  ],
  INVESTOR: [
    { icon: Compass, label: 'Explore everything', to: '/app/investor/explore' },
    { icon: Target, label: 'Deal flow', to: '/app/investor/deal-flow' },
    { icon: Eye, label: 'What you track', to: '/app/investor/portfolio' },
    { icon: MessageSquare, label: 'Messages', to: '/app/inbox' },
  ],
};

export default function HeaderState({ persona }) {
  const items = SHORTCUTS[persona] || [];
  if (items.length === 0) return null;

  return (
    <div className="hidden lg:flex items-center gap-1 pr-3 mr-1 border-r border-surface-border">
      {items.map(({ icon: Icon, label, to }) => (
        <Link
          key={to + label}
          to={to}
          title={label}
          aria-label={label}
          className="flex items-center justify-center w-9 h-9 rounded-lg text-ink-500 hover:text-ink-900 hover:bg-surface-muted transition-colors"
        >
          <Icon size={16.5} />
        </Link>
      ))}
    </div>
  );
}
