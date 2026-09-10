import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { GraduationCap, ArrowUpRight, Check } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import { apiFetch } from '../services/api.js';

/**
 * What to learn next, and why it is worth the time.
 *
 * This was a list of skill names with a count beside each. A skill name is
 * not a reason. Someone deciding how to spend the next few months needs to
 * know how many real ventures that unlocks and where it sits against
 * everything else they could learn instead.
 */

export default function LearningRecommendations() {
  const [loading, setLoading] = useState(true);
  const [recs, setRecs] = useState([]);

  useEffect(() => {
    apiFetch('/learning-recommendations').then(({ ok, data }) => {
      if (ok && data.success) setRecs(data.recommendations);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <Shell persona="CONTRIBUTOR" title="What to learn next">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" />
        </div>
      </Shell>
    );
  }

  const top = recs[0] || null;
  const maxDemand = recs.reduce((m, r) => Math.max(m, parseInt(r.demand_count) || 0), 0);

  return (
    <Shell persona="CONTRIBUTOR" title="What to learn next" subtitle="Ranked by how many real ventures it opens">
      <div className="mb-7">
        <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-violet-600 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
          {recs.length === 0 ? 'Nothing to add' : 'From real open roles'}
        </p>
        <h1 className="font-editorial italic text-[32px] text-trust-fg leading-tight max-w-3xl">
          {top
            ? `Learning ${top.skill} would open ${top.demand_count} more ${parseInt(top.demand_count) === 1 ? 'role' : 'roles'}.`
            : 'You already cover what ventures are asking for.'}
        </h1>
        <p className="text-[15px] text-ink-700 mt-3 max-w-2xl leading-relaxed">
          {recs.length === 0
            ? 'Nothing currently open needs a skill you have not already listed. Check back as new ventures work out what they need.'
            : 'These are not generic career advice. Each one is counted from roles that are open right now and that you would otherwise not be considered for.'}
        </p>
      </div>

      {recs.length === 0 ? (
        <div className="bg-surface rounded-xl border border-surface-border shadow-card py-16 text-center">
          <Check size={22} className="text-mint-500 mx-auto mb-3" />
          <p className="text-[15px] text-ink-700 mb-1">Nothing to add right now.</p>
          <p className="text-[13px] text-ink-500 mb-6 max-w-sm mx-auto">
            Your profile already covers the skills currently in demand.
          </p>
          <Link
            to="/app/contributor/opportunities"
            className="inline-flex items-center gap-2 text-[13px] font-medium bg-ink-900 hover:bg-ink-700 text-white px-5 py-2.5 rounded-full transition-colors"
          >
            See who needs you <ArrowUpRight size={14} />
          </Link>
        </div>
      ) : (
        <>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-[15px] font-semibold text-ink-900">Worth your time, in order</h2>
            <Link to="/app/contributor/skill-demand" className="flex items-center gap-1 text-[13px] text-ink-500 hover:text-violet-600 transition-colors">
              All demand <ArrowUpRight size={12} />
            </Link>
          </div>

          <div className="space-y-3">
            {recs.map((r, i) => {
              const count = parseInt(r.demand_count) || 0;
              const share = maxDemand > 0 ? Math.round((count / maxDemand) * 100) : 0;
              const isTop = i === 0;
              return (
                <motion.div
                  key={r.skill}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: Math.min(i * 0.06, 0.3), ease: [0.16, 1, 0.3, 1] }}
                  className={`relative overflow-hidden bg-surface rounded-xl border shadow-card p-6 pl-7 ${
                    isTop ? 'border-violet-500/40' : 'border-surface-border'
                  }`}
                >
                  <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: isTop ? '#7C5CFC' : '#E4E3EC' }} />

                  <div className="flex items-start justify-between gap-6">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <p className="text-[17px] font-semibold text-ink-950 capitalize">{r.skill}</p>
                        {isTop && (
                          <span className="text-[11px] font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md">
                            Highest impact
                          </span>
                        )}
                      </div>
                      <p className="text-[13.5px] text-ink-700 leading-relaxed">{r.reason}</p>

                      {/* The bar makes the ranking visible. A list of counts
                          asks someone to do the comparison themselves. */}
                      <div className="mt-4 h-1.5 rounded-full bg-surface-muted overflow-hidden max-w-md">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${share}%` }}
                          transition={{ duration: 0.7, delay: 0.1 + i * 0.05 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: isTop ? '#7C5CFC' : '#A7A9B1' }}
                        />
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <span className="text-[30px] font-bold leading-none tabular-nums" style={{ color: isTop ? '#6845F0' : '#3E4047' }}>
                        {count}
                      </span>
                      <p className="text-[11.5px] text-ink-500 mt-1">{count === 1 ? 'role' : 'roles'} it opens</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-between gap-4 bg-surface rounded-xl border border-surface-border shadow-card p-5">
            <p className="text-[13.5px] text-ink-700">
              Already have one of these? Add it and ventures start matching you immediately.
            </p>
            <Link
              to="/app/my-profile"
              className="shrink-0 flex items-center gap-1.5 text-[13px] font-medium text-violet-700 hover:text-violet-600 transition-colors"
            >
              Update your skills <ArrowUpRight size={13} />
            </Link>
          </div>
        </>
      )}
    </Shell>
  );
}
