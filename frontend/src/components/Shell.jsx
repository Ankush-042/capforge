import React from 'react';

/**
 * App shell: sidebar + top bar. Design language directly applies Linear's
 * documented refresh principles (linear.app/now/behind-the-latest-design-refresh):
 *  - Sidebar is deliberately dimmer than main content ("don't compete for
 *    attention you haven't earned") — muted icons/text, content area carries
 *    the visual weight.
 *  - Structure "felt not seen" — near-invisible borders (border-soft),
 *    separation via spacing and subtle surface-level shifts, not hard lines.
 *  - Compact chrome: small icon sizing, tight vertical rhythm in nav.
 */

const NAV = [
  { label: 'Overview', icon: '◇' },
  { label: 'Gaps', icon: '◈' },
  { label: 'Team', icon: '◎' },
  { label: 'Readiness', icon: '◒' },
  { label: 'Discover', icon: '◌' },
  { label: 'Connections', icon: '◐' },
];

function NavItem({ label, icon, active }) {
  return (
    <button
      className={`w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded text-sm transition-colors
        ${active ? 'bg-surface-1 text-text-primary' : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-1/50'}`}
    >
      <span className="text-[13px] opacity-70 w-4 text-center">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

export default function Shell({ children, activeNav = 'Overview', title }) {
  return (
    <div className="min-h-screen flex">
      <aside className="w-[220px] shrink-0 border-r border-surface-border-soft flex flex-col py-4 px-3">
        <div className="px-2 mb-6 flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-accent/90" />
          <span className="text-sm font-medium text-text-secondary tracking-tight">CapForge</span>
        </div>
        <nav className="space-y-[2px]">
          {NAV.map((n) => <NavItem key={n.label} {...n} active={n.label === activeNav} />)}
        </nav>
        <div className="mt-auto px-2 pt-4">
          <div className="flex items-center gap-2 px-1">
            <div className="w-6 h-6 rounded-full bg-surface-2 flex items-center justify-center text-[11px] text-text-tertiary">F</div>
            <span className="text-xs text-text-tertiary">Founder</span>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-12 shrink-0 border-b border-surface-border-soft flex items-center justify-between px-6">
          <h1 className="text-sm text-text-secondary font-medium">{title}</h1>
          <button className="text-xs text-text-tertiary px-2.5 py-1 rounded border border-surface-border-soft hover:text-text-secondary hover:border-surface-border transition-colors">
            ⌘K
          </button>
        </header>
        <main className="flex-1 px-6 py-6 max-w-5xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
