import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowUpRight, MessageSquare, Users } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import Avatar from '../components/Avatar.jsx';
import { getRankedVentures, startConversation } from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';
import { useNavigate } from 'react-router-dom';

/**
 * Ventures worth your attention, ranked.
 *
 * THIS PAGE USED TO SHOW ROLES, and that was the root mistake in the whole
 * engine. It read the recommendations table, one row per open role you fit,
 * so a venture with nothing matching simply did not exist to you. A
 * full-stack builder who chose healthtech saw one result, because the other
 * healthtech venture needed a Clinical Advisor, a Mobile App Developer and a
 * designer. That is a correct judgement about the roles and a wrong
 * conclusion about the venture.
 *
 * Now every venture in your fields appears, ranked by how well it suits you,
 * and each one states its real role situation instead of vanishing because
 * of it. You can write to any founder here. Nothing is hidden; the order
 * carries the judgement.
 */

const ROLE_STATE = {
  ROLE_FITS: { tone: '#1F5D52', bg: '#EAF7F0' },
  NO_ROLE_FITS: { tone: '#C58A00', bg: '#FFF6E0' },
  NO_OPEN_ROLES: { tone: '#8A8A99', bg: '#F3F3F6' },
};

function roleLine(role) {
  if (role.state === 'ROLE_FITS') return `${role.best} — ${role.fit}% fit`;
  if (role.state === 'NO_OPEN_ROLES') return 'Every role here is filled';
  if (role.closest) return `No open role fits you. Closest is ${role.closest}`;
  return 'No open role fits you';
}

function VentureCard({ v, index, onMessage }) {
  const st = ROLE_STATE[v.role.state] || ROLE_STATE.NO_OPEN_ROLES;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.25) }}
      className="bg-surface rounded-xl border border-surface-border shadow-card p-6 hover:shadow-elevated transition-shadow"
    >
      <div className="flex items-start justify-between gap-5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5 mb-1 flex-wrap">
            <Link to={`/app/startups/${v.id}`} className="text-[16.5px] font-semibold text-ink-950 hover:text-violet-700 transition-colors">
              {v.name}
            </Link>
            {v.matchedField && (
              <span className="text-[11px] font-medium text-violet-700 bg-violet-50 px-2 py-0.5 rounded">
                {v.matchedField}
              </span>
            )}
          </div>

          <p className="text-[13.5px] text-ink-700 leading-relaxed line-clamp-2">{v.problem}</p>

          {/* Why it is where it is, in the order it was weighted. */}
          <div className="flex items-center gap-4 mt-3 flex-wrap">
            <span className="text-[12.5px] font-medium px-2 py-1 rounded"
                  style={{ color: st.tone, backgroundColor: st.bg }}>
              {roleLine(v.role)}
            </span>
            <span className="flex items-center gap-1.5 text-[12.5px] text-ink-500">
              <Users size={12} /> {v.teamSize} on the team
            </span>
            {v.stage && <span className="text-[12.5px] text-ink-500">{v.stage}</span>}
            {v.readiness !== null && <span className="text-[12.5px] text-ink-500">readiness {v.readiness}</span>}
          </div>

          {v.alignmentReason && (
            <p className="text-[13px] text-ink-600 leading-relaxed mt-2.5 pl-3 border-l-2 border-violet-500/25">
              {v.alignmentReason}
            </p>
          )}
        </div>

        <div className="text-right shrink-0">
          <p className="text-[24px] font-semibold text-ink-950 tabular-nums leading-none">{v.score}<span className="text-[15px]">%</span></p>
          <p className="text-[11px] text-ink-300 mt-1">suits you</p>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-5 pt-4 border-t border-surface-border">
        {/* Available whatever the role situation. Somebody who cares about a
            venture should be able to say so, which is how it works in life. */}
        <button
          onClick={() => onMessage(v)}
          className="flex items-center gap-1.5 text-[13.5px] font-medium bg-ink-900 hover:bg-ink-700 text-white px-4 py-2 rounded-full transition-colors"
        >
          <MessageSquare size={13} /> Write to {v.founderName?.split(' ')[0] || 'the founder'}
        </button>
        <Link to={`/app/startups/${v.id}`} className="flex items-center gap-1 text-[13.5px] text-ink-500 hover:text-violet-700 transition-colors">
          Look properly <ArrowUpRight size={13} />
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <Avatar name={v.founderName} src={v.founderAvatar} size={22} />
          <span className="text-[12.5px] text-ink-500">{v.founderName}</span>
        </div>
      </div>
    </motion.div>
  );
}

export default function ContributorOpportunities() {
  const showToast = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [showElsewhere, setShowElsewhere] = useState(false);

  useEffect(() => {
    getRankedVentures().then(({ ok, data: d }) => {
      if (ok && d.success) setData(d);
      setLoading(false);
    });
  }, []);

  async function message(v) {
    const { ok, data: r } = await startConversation(v.founderId || v.founder_id, { startupId: v.id });
    if (ok && r?.success) { navigate(`/app/inbox?c=${r.conversation.id}`); return; }
    showToast('Could not open that conversation.', 'error');
  }

  if (loading) {
    return (
      <Shell persona="CONTRIBUTOR" title="Opportunities">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" />
        </div>
      </Shell>
    );
  }

  if (!data) {
    return (
      <Shell persona="CONTRIBUTOR" title="Opportunities">
        <div className="bg-surface rounded-xl border border-surface-border shadow-card py-16 text-center">
          <p className="text-[15px] text-ink-700 mb-1">Finish your profile first.</p>
          <Link to="/app/profile" className="text-[13px] text-violet-700 hover:text-violet-600 transition-colors">Go to your profile</Link>
        </div>
      </Shell>
    );
  }

  const { inYourFields, elsewhere, facts, you } = data;

  return (
    <Shell persona="CONTRIBUTOR" title="Opportunities" subtitle="Ventures worth your attention, closest fit first">
      <div className="mb-7">
        <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-violet-600 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
          {(you.fields || []).join(' · ') || 'no fields chosen'}
        </p>
        <h1 className="font-editorial italic text-[32px] text-trust-fg leading-tight max-w-3xl">
          {facts.venturesInYourFields === 0
            ? 'Nothing here is in the fields you chose yet.'
            : facts.venturesWithARoleForYou === 0
              ? `${facts.venturesInYourFields} ${facts.venturesInYourFields === 1 ? 'venture is' : 'ventures are'} in your fields, and none of them has an open role that fits you.`
              : `${facts.venturesWithARoleForYou} of ${facts.venturesInYourFields} in your fields ${facts.venturesWithARoleForYou === 1 ? 'has' : 'have'} a role that fits you.`}
        </h1>

        {/* Real numbers, so a thin list reads as a thin market rather than a
            broken product. That confusion was the actual failure here. */}
        <p className="text-[15px] text-ink-700 mt-3 max-w-2xl leading-relaxed">
          {facts.venturesInYourFields > 0
            ? `${facts.openRolesInYourFields} open role${facts.openRolesInYourFields === 1 ? '' : 's'} across them. Every venture in your fields is listed whether or not one of those roles is yours, because a founder will talk to somebody who cares about the problem.`
            : 'Widen your fields on your profile, or look at everything else below.'}
        </p>
        {!you.hasMission && (
          <p className="text-[13.5px] text-amber-700 mt-3">
            You have not said what you are looking for.{' '}
            <Link to="/app/profile" className="underline hover:no-underline">Write two sentences</Link>
            {' '}and this ordering gets considerably better.
          </p>
        )}
      </div>

      {inYourFields.length > 0 && (
        <div className="space-y-4 mb-9">
          {inYourFields.map((v, i) => <VentureCard key={v.id} v={v} index={i} onMessage={message} />)}
        </div>
      )}

      {elsewhere.length > 0 && (
        <div>
          <button
            onClick={() => setShowElsewhere(!showElsewhere)}
            className="text-[14px] font-medium text-ink-700 hover:text-violet-700 transition-colors mb-1"
          >
            {showElsewhere ? 'Hide' : 'Show'} {elsewhere.length} venture{elsewhere.length === 1 ? '' : 's'} outside your fields
          </button>
          <p className="text-[13px] text-ink-500 mb-4">
            Ranked the same way, minus the field match. Some of these may still suit you.
          </p>
          {showElsewhere && (
            <div className="space-y-4">
              {elsewhere.map((v, i) => <VentureCard key={v.id} v={v} index={i} onMessage={message} />)}
            </div>
          )}
        </div>
      )}
    </Shell>
  );
}
