import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Check, ArrowUpRight, TrendingUp } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import MetricTile, { TILE_PALETTE } from '../components/charts/MetricTile.jsx';
import { getSkillDemand } from '../services/startups.js';

/**
 * What ventures are actually short of.
 *
 * This was a list of skills with the word HIGH, MEDIUM or LOW beside each.
 * It told a contributor nothing they could act on. What matters is the split
 * between what you already have that people want, and what they want that
 * you do not have, because the second list is the whole reason to look.
 */

const LEVEL = {
  HIGH: { fg: '#E15C4D', bg: '#FDEEF0', label: 'In short supply', weight: 3 },
  MEDIUM: { fg: '#C5A93A', bg: '#FFF9E8', label: 'Some demand', weight: 2 },
  LOW: { fg: '#3FB081', bg: '#EAF7F0', label: 'Well covered', weight: 1 },
};

function SkillRow({ s, index }) {
  const lvl = LEVEL[s.demandLevel] || LEVEL.LOW;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: Math.min(index * 0.03, 0.25) }}
      className="flex items-center justify-between gap-4 bg-surface rounded-xl border border-surface-border shadow-card px-5 py-4"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {s.haveIt && <Check size={15} className="text-mint-500 shrink-0" />}
        <p className="text-[14.5px] font-medium text-ink-950 capitalize truncate">{s.skill}</p>
      </div>
      <span
        className="text-[11.5px] font-semibold px-2.5 py-1 rounded-md shrink-0"
        style={{ backgroundColor: lvl.bg, color: lvl.fg }}
      >
        {lvl.label}
      </span>
    </motion.div>
  );
}

export default function SkillDemand() {
  const [loading, setLoading] = useState(true);
  const [skills, setSkills] = useState([]);

  useEffect(() => {
    getSkillDemand().then(({ ok, data }) => {
      if (ok && data.success) setSkills(data.skills);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <Shell persona="CONTRIBUTOR" title="Skill demand">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" />
        </div>
      </Shell>
    );
  }

  const byWeight = (a, b) => (LEVEL[b.demandLevel]?.weight || 0) - (LEVEL[a.demandLevel]?.weight || 0);
  const yours = skills.filter((s) => s.haveIt).sort(byWeight);
  const missing = skills.filter((s) => !s.haveIt).sort(byWeight);
  const yoursInDemand = yours.filter((s) => s.demandLevel === 'HIGH');
  const topMissing = missing.filter((s) => s.demandLevel === 'HIGH');

  return (
    <Shell persona="CONTRIBUTOR" title="Skill demand" subtitle="What ventures are actually short of">
      <div className="mb-7">
        <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-violet-600 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
          {skills.length === 0 ? 'Nothing to measure yet' : 'From real open roles'}
        </p>
        <h1 className="font-editorial italic text-[32px] text-trust-fg leading-tight max-w-3xl">
          {yoursInDemand.length > 0
            ? `${yoursInDemand.length} of your skills ${yoursInDemand.length === 1 ? 'is' : 'are'} in short supply right now.`
            : topMissing.length > 0
              ? `${topMissing[0].skill} is what ventures cannot find.`
              : 'Nothing is in short supply right now.'}
        </h1>
        <p className="text-[15px] text-ink-700 mt-3 max-w-2xl leading-relaxed">
          Counted from every role currently open across the platform. Not a survey, not a trend report: what founders are genuinely unable to fill today.
        </p>
      </div>

      {skills.length === 0 ? (
        <div className="bg-surface rounded-xl border border-surface-border shadow-card py-16 text-center">
          <TrendingUp size={22} className="text-ink-300 mx-auto mb-3" />
          <p className="text-[15px] text-ink-700 mb-1">No open roles to measure yet.</p>
          <p className="text-[13px] text-ink-500">This fills in as ventures work out what they need.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-8">
            <MetricTile
              label="Yours in demand" value={yoursInDemand.length}
              icon={Check} {...TILE_PALETTE.blue}
              caption={yoursInDemand.length > 0 ? 'Hard for founders to find' : 'None in short supply'}
            />
            <MetricTile
              label="Worth learning" value={topMissing.length}
              icon={TrendingUp} to="/app/contributor/learning" {...TILE_PALETTE.peach}
              caption={topMissing.length > 0 ? 'In demand, not on your profile' : 'You are well covered'}
            />
            <MetricTile
              label="Tracked" value={skills.length}
              icon={TrendingUp} {...TILE_PALETTE.lavender}
              caption="Skills across all open roles"
            />
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div>
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-[15px] font-semibold text-ink-900">What you already bring</h2>
                <span className="text-[13px] text-ink-500">{yours.length}</span>
              </div>
              {yours.length === 0 ? (
                <div className="bg-surface rounded-xl border border-surface-border shadow-card py-10 text-center">
                  <p className="text-[13.5px] text-ink-500 mb-3">None of your listed skills are in demand right now.</p>
                  <Link to="/app/my-profile" className="text-[13px] font-medium text-violet-700 hover:text-violet-600 transition-colors">
                    Check your profile is current
                  </Link>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {yours.map((s, i) => <SkillRow key={s.skill} s={s} index={i} />)}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-[15px] font-semibold text-ink-900">What they cannot find</h2>
                <Link to="/app/contributor/learning" className="flex items-center gap-1 text-[13px] text-ink-500 hover:text-violet-600 transition-colors">
                  What to learn <ArrowUpRight size={12} />
                </Link>
              </div>
              {missing.length === 0 ? (
                <div className="bg-surface rounded-xl border border-surface-border shadow-card py-10 text-center">
                  <Check size={20} className="text-mint-500 mx-auto mb-2" />
                  <p className="text-[13.5px] text-ink-700">You cover everything in demand.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {missing.slice(0, 12).map((s, i) => <SkillRow key={s.skill} s={s} index={i} />)}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </Shell>
  );
}
