import React from 'react';
import Shell from '../components/Shell.jsx';
import VentureAssistant from '../components/VentureAssistant.jsx';
import { useActiveStartup } from '../context/ActiveStartupContext.jsx';
import { useMyPersona } from '../hooks/useMyPersona.js';

/**
 * The assistant, as a place rather than something buried on a dashboard.
 *
 * It was embedded near the bottom of two pages, so reaching it meant landing
 * on a dashboard and scrolling past everything else. The header shortcut
 * pointed at /app, which does nothing at all when you are already there.
 *
 * Same component, same answers, given a route so it can be linked to.
 */
export default function Assistant() {
  const { persona } = useMyPersona();
  const { activeStartup } = useActiveStartup();
  const isContributor = persona === 'CONTRIBUTOR';

  return (
    <Shell
      persona={persona}
      title="Ask"
      subtitle={isContributor ? 'About your options here' : activeStartup?.name}
    >
      <div className="max-w-3xl">
        {/* No heading block. The panel carries its own header saying what it
            is and what it can see, and repeating that above it was the
            blankness: a title, a paragraph, and a closed widget. */}
        <VentureAssistant
          startupId={activeStartup?.id}
          startupName={activeStartup?.name}
          mode={isContributor ? 'contributor' : 'founder'}
          alwaysOpen
        />
      </div>
    </Shell>
  );
}
