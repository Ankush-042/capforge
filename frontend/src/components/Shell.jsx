import React from 'react';

const NAV = [
  { label: 'Dashboard', icon: '▦' },
  { label: 'Gaps', icon: '◈' },
  { label: 'Team', icon: '◎' },
  { label: 'Readiness', icon: '◒' },
  { label: 'Discover', icon: '◌' },
  { label: 'Connections', icon: '◐' },
  { label: 'Settings', icon: '⚙' },
];

function NavItem({ label, icon, active }) {
  return (
    <button
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
        ${active ? 'bg-violet-50 text-violet-700 font-medium' : 'text-ink-500 hover:bg-surface-muted hover:text-ink-900'}`}
    >
      <span className="text-[14px] w-4 text-center">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

export default function Shell({ children, activeNav = 'Dashboard', title, subtitle }) {
  return (
    <div className="min-h-screen bg-canvas flex">
      <aside className="w-[240px] shrink-0 border-r border-surface-border flex flex-col py-5 px-3 bg-surface">
        <div className="px-2 mb-7 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500" />
          <span className="text-[15px] font-semibold text-ink-900 tracking-tight">CapForge</span>
        </div>
        <nav className="space-y-1">
          {NAV.map((n) => <NavItem key={n.label} {...n} active={n.label === activeNav} />)}
        </nav>
        <div className="mt-auto px-2 pt-4 flex items-center gap-2.5 border-t border-surface-border pt-4">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center text-xs font-medium text-white">F</div>
          <div>
            <p className="text-xs font-medium text-ink-900">Founder</p>
            <p className="text-[11px] text-ink-300">test@test.com</p>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 shrink-0 border-b border-surface-border flex items-center justify-between px-8 bg-surface">
          <div>
            <p className="text-[15px] font-semibold text-ink-900">{title}</p>
            {subtitle && <p className="text-xs text-ink-500">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3">
            <button className="text-xs text-ink-500 px-3 py-1.5 rounded-lg border border-surface-border hover:bg-surface-muted transition-colors">
              Search  ⌘K
            </button>
          </div>
        </header>
        <main className="flex-1 px-8 py-7 max-w-6xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
