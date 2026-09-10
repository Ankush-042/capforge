import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Users, Crown, Target, ArrowUpRight, Check } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import MetricTile, { TILE_PALETTE } from '../components/charts/MetricTile.jsx';
import { getTeamMembers, getGaps } from '../services/startups.js';
import { useActiveStartup } from '../context/ActiveStartupContext.jsx';

/**
 * Who is here, and who is missing.
 *
 * This was two boxes side by side, "Current team" and "Open roles", each a
 * list of thin rows. It answered a question nobody asks. What a founder
 * wants to know standing here is whether they are still alone, who has
 * actually committed, and what the team cannot do yet.
 */

const AVATAR_TONES = [
  { bg: '#EED8FF', fg: '#6D28D9' },
  { bg: '#D1EAFE', fg: '#1677E8' },
  { bg: '#EAF7F0', fg: '#1F5D52' },
  { bg: '#FFE8DA', fg: '#E84C32' },
];

function MemberCard({ member, index }) {
  const tone = AVATAR_TONES[index % AVATAR_TONES.length];
  const joined = member.joined_at ? new Date(member.joined_at) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.3), ease: [0.16, 1, 0.3, 1] }}
      className="bg-surface rounded-xl border border-surface-border shadow-card p-6"
    >
      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-[17px] font-semibold shrink-0"
          style={{ backgroundColor: tone.bg, color: tone.fg }}
        >
          {(member.display_name || '?').charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[16px] font-semibold text-ink-950 truncate">{member.display_name}</p>
            {member.is_founder && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md shrink-0">
                <Crown size={11} /> Founder
              </span>
            )}
          </div>
          <p className="text-[13.5px] text-ink-700 mt-0.5">{member.role || 'Team member'}</p>
          {member.headline && member.headline !== member.role && (
            <p className="text-[12.5px] text-ink-500 mt-1 truncate">{member.headline}</p>
          )}
        </div>
      </div>

      {(member.skills || []).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-surface-border">
          {(member.skills || []).slice(0, 5).map((s) => (
            <span key={s} className="text-[11px] px-2 py-1 rounded-md bg-surface-muted text-ink-700">{s}</span>
          ))}
        </div>
      )}

      {joined && (
        <p className="text-[12px] text-ink-300 mt-3">
          {member.is_founder ? 'Here from the start' : `Joined ${joined.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`}
        </p>
      )}
    </motion.div>
  );
}

export default function Team() {
  const { activeStartup, loading: startupLoading } = useActiveStartup();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [openGaps, setOpenGaps] = useState([]);
  const [startup, setStartup] = useState(null);

  useEffect(() => {
    async function load() {
      if (startupLoading) return;
      if (!activeStartup) { setLoading(false); return; }
      setStartup(activeStartup);
      const [teamRes, gapsRes] = await Promise.all([getTeamMembers(activeStartup.id), getGaps(activeStartup.id)]);
      if (teamRes.ok && teamRes.data.success) setMembers(teamRes.data.members);
      if (gapsRes.ok && gapsRes.data.success) {
        setOpenGaps(gapsRes.data.gaps.filter((g) => g.status !== 'FILLED' && g.status !== 'DISMISSED' && (parseFloat(g.coverage) || 0) === 0));
      }
      setLoading(false);
    }
    load();
  }, [activeStartup?.id, startupLoading]);

  if (loading) {
    return (
      <Shell title="Team">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" />
        </div>
      </Shell>
    );
  }

  const total = members.length + openGaps.length;
  const coverage = total > 0 ? Math.round((members.length / total) * 100) : 0;
  const founders = members.filter((m) => m.is_founder);
  const criticalOpen = openGaps.filter((g) => g.priority_level === 'CRITICAL').length;
  const alone = members.length <= 1;

  return (
    <Shell title={startup?.name || 'Team'} subtitle={alone ? 'You are still building alone' : `${members.length} people building this`}>
      <div className="mb-7">
        <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-violet-600 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
          {alone ? 'Building alone' : founders.length > 1 ? `${founders.length} founders` : 'Your team'}
        </p>
        <h1 className="font-editorial italic text-[32px] text-trust-fg leading-tight max-w-3xl">
          {alone ? 'It is just you so far.' : `${members.length} people are building this with you.`}
        </h1>
        <p className="text-[15px] text-ink-700 mt-3 max-w-2xl leading-relaxed">
          {openGaps.length === 0
            ? 'Every role your venture needs is covered.'
            : `${openGaps.length} role${openGaps.length === 1 ? '' : 's'} still ${openGaps.length === 1 ? 'has' : 'have'} nobody. That is what limits how fast this moves.`}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <MetricTile
          label="On the team" value={members.length}
          icon={Users} {...TILE_PALETTE.lavender}
          caption={alone ? 'Just you for now' : 'Committed to building this'}
        />
        <MetricTile
          label="Coverage" value={coverage} unit="%"
          icon={Check} {...TILE_PALETTE.blue}
          progress={coverage}
          caption={`${members.length} of ${total} roles`}
        />
        <MetricTile
          label="Still open" value={openGaps.length}
          icon={Target} to="/app/gaps" {...TILE_PALETTE.peach}
          badge={criticalOpen > 0 ? `${criticalOpen} critical` : null}
          caption={openGaps.length === 0 ? 'Nothing outstanding' : 'Nobody covers these'}
        />
        <MetricTile
          label="Founders" value={founders.length}
          icon={Crown} {...TILE_PALETTE.cream}
          caption={founders.length > 1 ? 'Co-founded' : 'Solo founded'}
        />
      </div>

      <div className="mb-8">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-[15px] font-semibold text-ink-900">Who is here</h2>
          {!alone && <span className="text-[13px] text-ink-500">Founders first</span>}
        </div>
        {members.length === 0 ? (
          <div className="bg-surface rounded-xl border border-surface-border shadow-card py-16 text-center">
            <p className="text-[15px] text-ink-700 mb-1">Nobody on the team yet.</p>
            <p className="text-[13px] text-ink-500">People appear here once you and they both commit.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {members.map((m, i) => <MemberCard key={m.id} member={m} index={i} />)}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-[15px] font-semibold text-ink-900">Who you're missing</h2>
          <Link to="/app/gaps" className="text-[13px] text-ink-500 hover:text-violet-600 transition-colors">Find them</Link>
        </div>
        {openGaps.length === 0 ? (
          <div className="bg-surface rounded-xl border border-surface-border shadow-card py-14 text-center">
            <Check size={22} className="text-mint-500 mx-auto mb-3" />
            <p className="text-[15px] text-ink-700">Every role is covered.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {openGaps.map((g, i) => (
              <motion.div
                key={g.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.25) }}
              >
                <Link
                  to={`/app/gaps/${g.id}?startup=${startup.id}`}
                  className="group flex items-center justify-between gap-3 bg-surface rounded-xl border border-surface-border shadow-card p-5 hover:border-violet-500/50 hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="min-w-0">
                    <p className="text-[14.5px] font-semibold text-ink-950 truncate">{g.role}</p>
                    <p className="text-[12px] font-medium mt-0.5" style={{ color: g.priority_level === 'CRITICAL' ? '#E15C4D' : '#6E7079' }}>
                      {g.priority_level === 'CRITICAL' ? 'Critical' : 'Nobody covers this'}
                    </p>
                  </div>
                  <ArrowUpRight size={15} className="text-ink-300 group-hover:text-violet-600 transition-colors shrink-0" />
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
