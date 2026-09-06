import React, { createContext, useContext, useState, useEffect } from 'react';
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

  useEffect(() => {
    getMyStartups().then(({ ok, data }) => {
      if (ok && data.success) {
        setStartups(data.startups);
        // If nothing selected yet, or the previously-selected one no
        // longer exists in this list, default to the first real one.
        const stillValid = data.startups.some(s => s.id === activeId);
        if (!activeId || !stillValid) {
          const first = data.startups[0]?.id || null;
          setActiveIdState(first);
          if (first) localStorage.setItem('capforge_active_startup_id', first);
        }
      }
      setLoading(false);
    });
  }, []);

  function setActiveId(id) {
    setActiveIdState(id);
    localStorage.setItem('capforge_active_startup_id', id);
  }

  const activeStartup = startups.find(s => s.id === activeId) || null;

  return (
    <ActiveStartupContext.Provider value={{ startups, activeStartup, activeId, setActiveId, loading, hasMultiple: startups.length > 1 }}>
      {children}
    </ActiveStartupContext.Provider>
  );
}

export function useActiveStartup() {
  const ctx = useContext(ActiveStartupContext);
  if (!ctx) throw new Error('useActiveStartup must be used within ActiveStartupProvider');
  return ctx;
}
