import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import StartupSwitcher from './StartupSwitcher.jsx';
import { useMyIdentity } from '../context/MyIdentityContext.jsx';

/**
 * App shell — persona-aware sidebar (Sprint 20). Same Vercel-style nav
 * pattern, now switching its item set and identity block by persona
 * instead of being hardcoded to Founder only.
 */

/**
 * Navigation as the JOURNEY, not a tool list.
 *
 * This was fourteen flat items for a founder: Dashboard, Sparks, Inbox,
 * Gaps, Team, Readiness, Risk, Milestones, Analytics, Pitch mode,
 * Investability, Competitors, Equity, Workspace. Every one named after the
 * data structure behind it rather than what the person is trying to do. A
 * control panel, not a product.
 *
 * The flow this app exists for is: share a spark, find someone who believes
 * it, build the team, get funded. The nav now says that. "Gaps" becomes
 * "Who you're missing". "Readiness" becomes "Investor readiness". The groups
 * are the stages of building a company, and the stage you are actually in
 * is the one that opens.
 */
const NAV_BY_PERSONA = {
  ADMIN: [
    { group: null, items: [{ label: 'Admin panel', icon: '◆', path: '/app/admin' }] },
  ],
  FOUNDER: [
    {
      group: null,
      items: [
        { label: 'Home', icon: '◇', path: '/app' },
        { label: 'Messages', icon: '✉', path: '/app/inbox' },
      ],
    },
    {
      group: 'Build',
      caption: 'Find the people',
      items: [
        { label: 'Ideas being shared', icon: '✦', path: '/app/sparks' },
        { label: "Who you're missing", icon: '◈', path: '/app/gaps' },
        { label: 'Your team', icon: '◎', path: '/app/team' },
        { label: 'Splitting equity', icon: '◍', path: '/app/equity' },
      ],
    },
    {
      group: 'Grow',
      caption: 'Make it real',
      items: [
        { label: 'What to do next', icon: '◇', path: '/app/milestones' },
        { label: "What could go wrong", icon: '◑', path: '/app/risk' },
        { label: 'Who else is doing this', icon: '◌', path: '/app/competitors' },
        { label: 'How it is going', icon: '◆', path: '/app/analytics' },
        { label: 'Workspace', icon: '◫', path: '/app/workspace' },
      ],
    },
    {
      group: 'Raise',
      caption: 'Find the money',
      items: [
        { label: 'Investor readiness', icon: '◒', path: '/app/readiness' },
        { label: 'What investors see', icon: '◉', path: '/app/investability' },
        { label: 'Your pitch', icon: '▶', path: '/app/pitch' },
      ],
    },
  ],
  CONTRIBUTOR: [
    {
      group: null,
      items: [
        { label: 'Home', icon: '◇', path: '/app/contributor' },
        { label: 'Messages', icon: '✉', path: '/app/inbox' },
      ],
    },
    {
      group: 'Find something',
      caption: 'Worth your years',
      items: [
        { label: 'Ideas being shared', icon: '✦', path: '/app/sparks' },
        { label: 'Ventures that need you', icon: '◈', path: '/app/contributor/opportunities' },
        { label: 'Weighing them up', icon: '◎', path: '/app/contributor/offers' },
      ],
    },
    {
      group: 'Your worth',
      caption: 'Know what you bring',
      items: [
        { label: "What's in demand", icon: '◒', path: '/app/contributor/skill-demand' },
        { label: 'What to learn next', icon: '◇', path: '/app/contributor/learning' },
        { label: 'What to ask for', icon: '◍', path: '/app/contributor/equity-ask' },
      ],
    },
  ],
  INVESTOR: [
    {
      group: null,
      items: [
        { label: 'Home', icon: '◇', path: '/app/investor' },
        { label: 'Messages', icon: '✉', path: '/app/inbox' },
      ],
    },
    {
      group: 'Find',
      caption: 'Ventures worth backing',
      items: [
        { label: 'Matching your thesis', icon: '◈', path: '/app/investor/deal-flow' },
        { label: 'Searches you saved', icon: '◍', path: '/app/investor/saved-searches' },
      ],
    },
    {
      group: 'Track',
      caption: 'What you have backed',
      items: [
        { label: 'Your portfolio', icon: '◫', path: '/app/investor/portfolio' },
      ],
    },
  ],
};

const IDENTITY_BY_PERSONA = {
  ADMIN: { name: 'Platform Admin', gradient: 'from-ink-700 to-ink-900', initial: 'A' },
  FOUNDER: { name: 'Founder', gradient: 'from-amber-500 to-rose-500', initial: 'F' },
  CONTRIBUTOR: { name: 'Priya Data', gradient: 'from-blue-500 to-violet-500', initial: 'P' },
  INVESTOR: { name: 'Raj Capital', gradient: 'from-mint-500 to-blue-500', initial: 'R' },
};

function NavItem({ label, icon, path, active, nested }) {
  return (
    <Link
      to={path}
      className={`group relative w-full flex items-center justify-between pl-3 pr-2 py-[7px] rounded-lg text-[14px] transition-all duration-150
        ${active
          ? 'bg-violet-50 text-violet-700 font-medium'
          : 'text-ink-500 hover:bg-surface-muted hover:text-ink-900'}`}
    >
      {/* A real active marker rather than a grey wash: you should be able to
          see where you are at a glance, from the edge of your vision. */}
      {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-r-full bg-violet-600" />}
      <span className="flex items-center gap-2.5 min-w-0">
        <span className={`text-[13px] w-4 text-center shrink-0 transition-opacity ${active ? 'opacity-100' : 'opacity-50 group-hover:opacity-80'}`}>{icon}</span>
        <span className="truncate">{label}</span>
      </span>
    </Link>
  );
}

export default function Shell({ children, title, subtitle, persona: externalPersona, displayName: externalDisplayName }) {
  const location = useLocation();

  // REAL, COMPREHENSIVE FIX: previously, ~20 pages hardcoded a literal
  // persona string ("CONTRIBUTOR", "FOUNDER", etc) and NEVER fetched or
  // passed a real display name at all — only the 7 pages using the
  // useMyPersona hook ever did. This meant the sidebar identity fell
  // back to a HARDCODED WRONG NAME ('Priya Data' for every contributor,
  // 'Raj Capital' for every investor) on every one of those ~20 pages,
  // confirmed directly: Dashboard's own main content correctly showed
  // 'Arjun Mehta' (its own separate fetch) while the sidebar still said
  // 'Priya Data' (Shell had no real name passed in at all).
  //
  // Shell now consumes the SHARED identity context instead of fetching
  // internally on every mount — real fix for a confirmed follow-up
  // symptom: fetching on every Shell mount meant a fresh fetch cycle
  // (and a brief fallback-name flash) on EVERY navigation, since React
  // Router remounts the page/Shell on each route change. The shared
  // context fetches ONCE per real session; every subsequent navigation
  // reads the already-resolved value instantly, with zero flash.
  const { persona: fetchedPersona, displayName: fetchedDisplayName, isAdmin } = useMyIdentity();

  const persona = isAdmin ? 'ADMIN' : (externalPersona || fetchedPersona);
  const realDisplayName = externalDisplayName || fetchedDisplayName;

  if (!persona) {
    return (
      <div className="app-shell min-h-screen flex" style={{ backgroundColor: '#FAF5FF' }}>
        <aside className="w-64 border-r border-surface-border bg-white p-4 flex flex-col">
          <div className="h-8 bg-surface-muted rounded-lg animate-pulse mb-6" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-8 bg-surface-muted rounded-lg animate-pulse" />)}
          </div>
        </aside>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" />
        </div>
      </div>
    );
  }

  const NAV = NAV_BY_PERSONA[persona];
  const identity = { ...IDENTITY_BY_PERSONA[persona], ...(realDisplayName ? { name: realDisplayName } : {}) };
  const homePath = NAV[0].items[0].path;

  return (
    <div className="app-shell min-h-screen flex" style={{ backgroundColor: '#FAF5FF' }}>
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

        {persona === 'FOUNDER' && <StartupSwitcher />}
        <nav className="space-y-0.5">
          {NAV.map((section, si) => {
            const isActiveSection = section.items.some(i =>
              location.pathname === i.path || (i.path !== homePath && location.pathname.startsWith(i.path))
            );
            return (
              <div key={section.group || `top-${si}`} className={section.group ? 'pt-5' : ''}>
                {section.group && (
                  <div className="px-3 pb-2">
                    <p className={`text-[11px] font-semibold tracking-[0.1em] uppercase transition-colors ${isActiveSection ? 'text-violet-600' : 'text-ink-300'}`}>
                      {section.group}
                    </p>
                    <p className="text-[11px] text-ink-300 mt-0.5">{section.caption}</p>
                  </div>
                )}
                <div className="space-y-0.5">
                  {section.items.map((n) => (
                    <NavItem
                      key={n.path}
                      {...n}
                      active={location.pathname === n.path || (n.path !== homePath && location.pathname.startsWith(n.path))}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="mt-auto pt-4 flex items-center justify-between gap-3 border-t border-surface-border">
          <Link to="/app/my-profile" className="flex items-center gap-3 min-w-0 hover:opacity-80 transition-opacity" title="View and edit your profile">
            <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${identity.gradient} flex items-center justify-center text-sm font-medium text-white shrink-0`}>{identity.initial}</div>
            <div className="min-w-0">
              <p className="text-[15px] font-medium text-ink-900 truncate">{identity.name}</p>
              <p className="text-xs text-ink-300">{persona.charAt(0) + persona.slice(1).toLowerCase()}</p>
            </div>
          </Link>
          <button
            onClick={() => {
              // Real fix: no logout mechanism existed anywhere in the app —
              // users were switching accounts by logging in again over an
              // existing session, which never reset app state, causing a
              // real cross-account data leak. A genuine full page reload
              // guarantees every piece of state resets cleanly.
              localStorage.removeItem('capforge_token');
              localStorage.removeItem('capforge_active_startup_id');
              window.location.href = '/sign-in';
            }}
            title="Log out"
            className="text-xs text-ink-300 hover:text-signal-critical shrink-0 transition-colors px-2 py-1"
          >
            Log out
          </button>
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
