import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMyStartups } from '../services/startups.js';

/**
 * Phase E — real fix for the confirmed startups[0] bug: every founder
 * screen independently fetched getMyStartups() and always grabbed the
 * FIRST one, so a founder with two ventures had no way to see the
 * second at all. One shared context now holds the real list and the
 * currently-selected active startup — persisted across a session via
 * localStorage, so switching sticks as you navigate between screens.
 */
const ActiveStartupContext = createContext(null);

export function ActiveStartupProvider({ children }) {
  const [startups, setStartups] = useState([]);
  const [activeId, setActiveIdState] = useState(() => localStorage.getItem('capforge_active_startup_id'));
  const [loading, setLoading] = useState(true);

  /**
   * CONFIRMED BUG, reported from a real signup. This ran once on mount with
   * no way to run again, and finishing onboarding does a client-side
   * navigate() rather than a page load. So the provider never remounted, the
   * list stayed empty, and a founder who had JUST created their venture
   * landed on a dashboard telling them they had not created one. The venture
   * existed the whole time; pressing F5 would have shown it, which is exactly
   * why it looked like a glitch rather than a bug.
   *
   * Pulled out so anything that creates or changes a venture can say so.
   */
  const refresh = useCallback(async () => {
    const { ok, data } = await getMyStartups();
    if (ok && data.success) {
      setStartups(data.startups);
      // If nothing is selected yet, or the previously-selected one no longer
      // exists in this list, default to the first real one.
      setActiveIdState((current) => {
        const stillValid = data.startups.some((s) => s.id === current);
        if (current && stillValid) return current;
        const first = data.startups[0]?.id || null;
        if (first) localStorage.setItem('capforge_active_startup_id', first);
        return first;
      });
    }
    setLoading(false);
    return ok && data.success ? data.startups : [];
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  function setActiveId(id) {
    setActiveIdState(id);
    localStorage.setItem('capforge_active_startup_id', id);
  }

  const activeStartup = startups.find(s => s.id === activeId) || null;

  return (
    <ActiveStartupContext.Provider value={{ startups, activeStartup, activeId, setActiveId, loading, refresh, hasMultiple: startups.length > 1 }}>
      {children}
    </ActiveStartupContext.Provider>
  );
}

export function useActiveStartup() {
  const ctx = useContext(ActiveStartupContext);
  if (!ctx) throw new Error('useActiveStartup must be used within ActiveStartupProvider');
  return ctx;
}
