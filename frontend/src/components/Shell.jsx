import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import CommandPalette from './CommandPalette.jsx';
import StartupSwitcher from './StartupSwitcher.jsx';

/**
 * App shell — persona-aware sidebar (Sprint 20). Same Vercel-style nav
 * pattern, now switching its item set and identity block by persona
 * instead of being hardcoded to Founder only.
 */

const NAV_BY_PERSONA = {
  FOUNDER: [
    { label: 'Dashboard', icon: '▦', path: '/app' },
    { label: 'Inbox', icon: '✉', path: '/app/inbox' },
    { label: 'Gaps', icon: '◈', path: '/app/gaps', nested: true },
    { label: 'Team', icon: '◎', path: '/app/team' },
    { label: 'Readiness', icon: '◒', path: '/app/readiness' },
    { label: 'Risk', icon: '◑', path: '/app/risk' },
    { label: 'Milestones', icon: '◇', path: '/app/milestones' },
    { label: 'Analytics', icon: '◆', path: '/app/analytics' },
    { label: 'Investability', icon: '◉', path: '/app/investability' },
    { label: 'Competitors', icon: '◌', path: '/app/competitors' },
    { label: 'Equity', icon: '◍', path: '/app/equity' },
    { label: 'Workspace', icon: '◫', path: '/app/workspace' },
  ],
  CONTRIBUTOR: [
    { label: 'Dashboard', icon: '▦', path: '/app/contributor' },
    { label: 'Inbox', icon: '✉', path: '/app/inbox' },
    { label: 'Opportunities', icon: '◈', path: '/app/contributor/opportunities' },
    { label: 'Compare offers', icon: '◎', path: '/app/contributor/offers' },
    { label: 'Skill Demand', icon: '◒', path: '/app/contributor/skill-demand' },
    { label: 'Learning', icon: '◇', path: '/app/contributor/learning' },
    { label: 'Equity Ask', icon: '◍', path: '/app/contributor/equity-ask' },
    { label: 'Connections', icon: '◐', path: '/app/contributor/connections' },
  ],
  INVESTOR: [
    { label: 'Dashboard', icon: '▦', path: '/app/investor' },
    { label: 'Inbox', icon: '✉', path: '/app/inbox' },
    { label: 'Deal Flow', icon: '◈', path: '/app/investor/deal-flow' },
    { label: 'Portfolio', icon: '◫', path: '/app/investor/portfolio' },
    { label: 'Connections', icon: '◐', path: '/app/investor/connections' },
  ],
};

const IDENTITY_BY_PERSONA = {
  FOUNDER: { name: 'Founder', gradient: 'from-amber-500 to-rose-500', initial: 'F' },
  CONTRIBUTOR: { name: 'Priya Data', gradient: 'from-blue-500 to-violet-500', initial: 'P' },
  INVESTOR: { name: 'Raj Capital', gradient: 'from-mint-500 to-blue-500', initial: 'R' },
};

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

export default function Shell({ children, title, subtitle, persona = 'FOUNDER' }) {
  const location = useLocation();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const NAV = NAV_BY_PERSONA[persona];
  const identity = IDENTITY_BY_PERSONA[persona];
  const homePath = NAV[0].path;

  React.useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setPaletteOpen((o) => !o); }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="app-shell min-h-screen flex" style={{ backgroundColor: '#FAF5FF' }}>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <aside className="w-[260px] shrink-0 border-r border-surface-border flex flex-col py-4 px-3 bg-surface">
        <button className="w-full flex items-center justify-between px-2 py-2 mb-4 rounded-lg hover:bg-surface-muted transition-colors">
          <span className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 via-violet-600 to-blue-600 flex items-center justify-center shadow-sm">
              <span className="text-white text-[13px] font-bold font-display leading-none">C</span>
            </div>
            <span className="text-[16px] font-bold font-display text-ink-900 tracking-[-0.02em]">CapForge</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-muted text-ink-500 font-medium">{identity.name.split(' ')[0]}</span>
          </span>
          <span className="text-ink-300 text-xs">⌄</span>
        </button>

        <button onClick={() => setPaletteOpen(true)} className="relative mb-5 w-full text-left">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300 text-xs">⌕</span>
          <span className="block w-full pl-8 pr-14 py-2 rounded-lg border border-surface-border bg-surface-muted text-sm text-ink-300">Find...</span>
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-ink-300 border border-surface-border rounded px-1.5">⌘K</span>
        </button>

        {persona === 'FOUNDER' && <StartupSwitcher />}
        <nav className="space-y-0.5">
          {NAV.map((n) => <NavItem key={n.label} {...n} active={location.pathname === n.path || (n.path !== homePath && location.pathname.startsWith(n.path))} />)}
        </nav>

        <div className="mt-auto pt-4 flex items-center gap-3 border-t border-surface-border">
          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${identity.gradient} flex items-center justify-center text-sm font-medium text-white`}>{identity.initial}</div>
          <div>
            <p className="text-[15px] font-medium text-ink-900">{identity.name}</p>
            <p className="text-xs text-ink-300">{persona.charAt(0) + persona.slice(1).toLowerCase()}</p>
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
