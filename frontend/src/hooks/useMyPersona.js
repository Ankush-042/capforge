import { useState, useEffect } from 'react';
import { getMyProfile } from '../services/startups.js';

/**
 * Real fix for TWO confirmed bugs, both traced to this hook:
 *
 * 1. Defaulted to 'FOUNDER' as an initial GUESS while the real fetch
 *    resolved — meaning every single page, for every persona, briefly
 *    flashed the wrong (Founder's) nav and identity on every load.
 *    Confirmed directly: "clicking Inbox flashes founder sidebar every
 *    time." Now defaults to null (a real "not known yet" state) instead
 *    of a wrong guess — callers must handle this loading state
 *    explicitly rather than being shown incorrect UI while waiting.
 *
 * 2. Never exposed the real, authenticated user's actual display name —
 *    Shell.jsx was using a static hardcoded lookup table with a real
 *    SEED ACCOUNT'S name baked in per role ('Priya Data' for every
 *    single contributor, 'Raj Capital' for every single investor,
 *    regardless of who was actually logged in). Now fetches and
 *    exposes the real name from the real authenticated profile.
 */
export function useMyPersona() {
  const [persona, setPersona] = useState(null);
  const [displayName, setDisplayName] = useState(null);

  useEffect(() => {
    getMyProfile().then(({ ok, data }) => {
      if (ok && data.success) {
        if (data.profile.primary_role) setPersona(data.profile.primary_role);
        if (data.profile.display_name) setDisplayName(data.profile.display_name);
      }
    });
  }, []);

  return { persona, displayName };
}
