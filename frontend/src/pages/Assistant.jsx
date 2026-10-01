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
        <div className="mb-7">
          <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-violet-600 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
            Reads your real data
          </p>
          <h1 className="font-editorial italic text-[32px] text-trust-fg leading-tight">
            {isContributor
              ? 'Ask about where you actually stand.'
              : 'Ask about your venture.'}
          </h1>
          <p className="text-[15px] text-ink-700 mt-3 leading-relaxed">
            {isContributor
              ? 'It reads your matches, your fields and your profile as they are right now, and it will tell you when a match is weak rather than talking you into it.'
              : 'It reads your readiness, your open roles, who has been matched to them and your conversations as they are right now. It will say what is weak rather than reassure you.'}
          </p>
        </div>

        <VentureAssistant
          startupId={activeStartup?.id}
          startupName={activeStartup?.name}
          mode={isContributor ? 'contributor' : 'founder'}
        />
      </div>
    </Shell>
  );
}
