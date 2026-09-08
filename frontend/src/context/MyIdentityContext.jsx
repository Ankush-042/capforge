import React, { createContext, useContext, useState, useEffect } from 'react';
import { getMyProfile } from '../services/startups.js';

/**
 * Real fix for a confirmed, precise symptom: 'every time I click a
 * sidebar link, Priya Data flashes for a second.' Root cause: Shell
 * was fetching the real identity fresh on every single MOUNT — and
 * React Router remounts the page (and Shell within it) on every
 * navigation, so a fresh fetch cycle (and a brief fallback-name flash)
 * happened on every single click, not just once.
 *
 * Real fix: fetch the identity ONCE per actual session (this context
 * wraps the whole app, mounted once), not once per page visit — every
 * subsequent navigation reads the already-resolved value instantly,
 * with zero flash. Still genuinely resets on login/logout, since
 * AuthShell's real full-page-reload already guarantees a fresh app
 * mount (and therefore a fresh fetch here) on every account switch.
 */
const MyIdentityContext = createContext(null);

export function MyIdentityProvider({ children }) {
  const [persona, setPersona] = useState(null);
  const [displayName, setDisplayName] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    getMyProfile().then(({ ok, data }) => {
      if (ok && data.success) {
        if (data.profile.primary_role) setPersona(data.profile.primary_role);
        if (data.profile.display_name) setDisplayName(data.profile.display_name);
        setIsAdmin(!!data.profile.is_admin);
      }
    });
  }, []);

  return (
    <MyIdentityContext.Provider value={{ persona, displayName, isAdmin }}>
      {children}
    </MyIdentityContext.Provider>
  );
}

export function useMyIdentity() {
  const ctx = useContext(MyIdentityContext);
  if (!ctx) throw new Error('useMyIdentity must be used within MyIdentityProvider');
  return ctx;
}
