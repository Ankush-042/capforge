import { useState, useEffect } from 'react';
import { getMyProfile } from '../services/startups.js';

/**
 * Real fix for a confirmed bug: 5 shared screens (Search, Notifications,
 * Settings, Inbox, ConversationThread) never passed a persona to Shell,
 * so it silently defaulted to FOUNDER for every non-founder user —
 * replacing a contributor's or investor's entire sidebar with the
 * founder's nav and identity. One shared hook instead of duplicating
 * this fetch in every file (and risking missing it again).
 */
export function useMyPersona() {
  const [persona, setPersona] = useState('FOUNDER');
  useEffect(() => {
    getMyProfile().then(({ ok, data }) => {
      if (ok && data.success && data.profile.primary_role) setPersona(data.profile.primary_role);
    });
  }, []);
  return persona;
}
