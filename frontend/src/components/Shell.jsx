import React from 'react';
import { Link, useLocation } from 'react-router-dom';

/**
 * App shell — sidebar per the Vercel dashboard reference: team/workspace
 * switcher up top, a real search input, gray active-state nav fill,
 * nested items get a chevron. Nav items are real router links (Sprint 19).
 */

const NAV = [
  { label: 'Dashboard', icon: '▦', path: '/' },
  { label: 'Gaps', icon: '◈', path: '/gaps', nested: true },
  { label: 'Team', icon: '◎', path: '/team' },
  { label: 'Readiness', icon: '◒', path: '/readiness' },
  { label: 'Risk', icon: '◑', path: '/risk' },
  { label: 'Milestones', icon: '◇', path: '/milestones' },
];

function NavItem({ label, icon, path, active, nested }) {
  return (
    <Link
      to={path}
      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[15px] transition-colors
        ${active ? 'bg-surface-muted text-ink-900 font-medium' : 'text-ink-500 hover:bg-surface-muted hover:text-ink-900'}`}
    >
      <span className="flex items-center gap-3">
        <span className="text-[14px] w-4 text-center opacity-70">{icon}</span>
        <span>{label}</span>
      </span>
      {nested && <span className="text-ink-300 text-xs">›</span>}
    </Link>
  );
}

export default function Shell({ children, title, subtitle }) {
  const location = useLocation();
  return (
    <div className="min-h-screen bg-canvas flex">
      <aside className="w-[260px] shrink-0 border-r border-surface-border flex flex-col py-4 px-3 bg-surface">
        <button className="w-full flex items-center justify-between px-2 py-2 mb-4 rounded-lg hover:bg-surface-muted transition-colors">
          <span className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500" />
            <span className="text-[15px] font-semibold text-ink-900 tracking-tight">FoodSense2</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-muted text-ink-500 font-medium">Founder</span>
          </span>
          <span className="text-ink-300 text-xs">⌄</span>
        </button>

        <div className="relative mb-5">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300 text-xs">⌕</span>
          <input
            placeholder="Find..."
            className="w-full pl-8 pr-8 py-2 rounded-lg border border-surface-border bg-surface-muted text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-ink-300 border border-surface-border rounded px-1">F</span>
        </div>

        <nav className="space-y-0.5">
          {NAV.map((n) => <NavItem key={n.label} {...n} active={location.pathname === n.path || (n.path !== '/' && location.pathname.startsWith(n.path))} />)}
        </nav>

        <div className="mt-auto pt-4 flex items-center gap-3 border-t border-surface-border">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center text-sm font-medium text-white">F</div>
          <div>
            <p className="text-[15px] font-medium text-ink-900">Founder</p>
            <p className="text-xs text-ink-300">test@test.com</p>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-[72px] shrink-0 border-b border-surface-border flex items-center justify-between px-10 bg-surface">
          <div>
            <p className="text-base font-semibold text-ink-900">{title}</p>
            {subtitle && <p className="text-sm text-ink-500">{subtitle}</p>}
          </div>
        </header>
        <main className="flex-1 px-10 py-9 max-w-[1440px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
