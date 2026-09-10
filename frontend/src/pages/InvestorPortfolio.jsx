import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Briefcase, AlertTriangle, Check, ArrowUpRight } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import MetricTile, { TILE_PALETTE } from '../components/charts/MetricTile.jsx';
import { getPortfolioAnalysis } from '../services/startups.js';

/**
 * What you have actually backed.
 *
 * This was a donut beside a paragraph. The donut told an investor the shape
 * of their portfolio, which they already knew, and the concentration warning
 * sat in prose where it was easy to skip.
 *
 * The useful question here is whether you are more concentrated than you
 * meant to be, so that answer leads, and the domains are shown as ranked
 * bars where an outsized share is immediately obvious.
 */

const BAR_COLORS = ['#7C5CFC', '#4C86F9', '#3FB081', '#F0A84E', '#EF6E85', '#A7A9B1'];

export default function InvestorPortfolio() {
  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState(null);

  useEffect(() => {
    getPortfolioAnalysis().then(({ ok, data }) => {
      if (ok && data.success) setPortfolio(data.portfolio);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <Shell persona="INVESTOR" title="Portfolio">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" />
        </div>
      </Shell>
    );
  }

  const count = portfolio?.count || 0;
  const domains = (portfolio?.domain_distribution || [])
    .map((d) => ({ ...d, percentage: parseFloat(d.percentage) || 0 }))
    .sort((a, b) => b.percentage - a.percentage);
  const biggest = domains[0] || null;
  const concentrated = !!portfolio?.concentration_warning;
  const suggestions = portfolio?.diversification_suggestions || [];

  return (
    <Shell persona="INVESTOR" title="Portfolio" subtitle="Built from what you have actually backed">
      <div className="mb-7">
        <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-violet-600 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
          {count === 0 ? 'Nothing yet' : concentrated ? 'Concentrated' : 'Reasonably spread'}
        </p>
        <h1 className="font-editorial italic text-[32px] text-trust-fg leading-tight max-w-3xl">
          {count === 0
            ? 'You have not backed anything here yet.'
            : concentrated && biggest
              ? `${Math.round(biggest.percentage)}% of what you back is ${biggest.domain}.`
              : 'Your positions are spread across domains.'}
        </h1>
        <p className="text-[15px] text-ink-700 mt-3 max-w-2xl leading-relaxed">
          {count === 0
            ? 'This builds from real connections you make with founders, not from anything you enter manually.'
            : 'Concentration is not automatically wrong. Plenty of good investors are deliberately narrow. It is only a problem when it happened without you choosing it.'}
        </p>
      </div>

      {count === 0 ? (
        <div className="bg-surface rounded-xl border border-surface-border shadow-card py-16 text-center">
          <Briefcase size={22} className="text-ink-300 mx-auto mb-3" />
          <p className="text-[15px] text-ink-700 mb-1">Nothing in your portfolio yet.</p>
          <p className="text-[13px] text-ink-500 mb-6 max-w-sm mx-auto">
            It fills in as you connect with founders. Nothing here is entered by hand.
          </p>
          <Link
            to="/app/investor/deal-flow"
            className="inline-flex items-center gap-2 text-[13px] font-medium bg-ink-900 hover:bg-ink-700 text-white px-5 py-2.5 rounded-full transition-colors"
          >
            See your deal flow <ArrowUpRight size={14} />
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-8">
            <MetricTile
              label="Positions" value={count}
              icon={Briefcase} {...TILE_PALETTE.lavender}
              caption="Founders you have connected with"
            />
            <MetricTile
              label="Domains" value={domains.length}
              icon={Check} {...TILE_PALETTE.blue}
              caption={domains.length === 1 ? 'All in one space' : 'Across your positions'}
            />
            <MetricTile
              label="Largest share" value={biggest ? Math.round(biggest.percentage) : 0} unit="%"
              icon={concentrated ? AlertTriangle : Check} {...(concentrated ? TILE_PALETTE.peach : TILE_PALETTE.cream)}
              progress={biggest ? biggest.percentage : 0}
              caption={biggest ? biggest.domain : 'No domains yet'}
            />
          </div>

          <div className="grid grid-cols-5 gap-6">
            <div className="col-span-3">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-[15px] font-semibold text-ink-900">Where your money sits</h2>
                <span className="text-[13px] text-ink-500">By share of positions</span>
              </div>
              <div className="bg-surface rounded-xl border border-surface-border shadow-card p-6">
                <div className="space-y-4">
                  {domains.map((d, i) => (
                    <div key={d.domain}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[13.5px] font-medium text-ink-900 capitalize">{d.domain}</span>
                        <span className="text-[13.5px] font-semibold tabular-nums" style={{ color: BAR_COLORS[i % BAR_COLORS.length] }}>
                          {Math.round(d.percentage)}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${d.percentage}%` }}
                          transition={{ duration: 0.7, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="col-span-2">
              <div className="mb-3">
                <h2 className="text-[15px] font-semibold text-ink-900">{concentrated ? 'Worth knowing' : 'How it reads'}</h2>
              </div>

              <div className={`rounded-xl border shadow-card p-6 mb-4 ${concentrated ? 'bg-amber-50 border-amber-200' : 'bg-surface border-surface-border'}`}>
                <div className="flex items-start gap-2.5">
                  {concentrated
                    ? <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                    : <Check size={15} className="text-mint-500 shrink-0 mt-0.5" />}
                  <p className={`text-[13.5px] leading-relaxed ${concentrated ? 'text-amber-800' : 'text-ink-700'}`}>
                    {portfolio.concentration_warning || 'Your positions are spread across enough domains that no single one dominates.'}
                  </p>
                </div>
              </div>

              {suggestions.length > 0 && (
                <>
                  <p className="text-[13px] font-medium text-ink-700 mb-2.5">
                    Ventures that would widen it
                  </p>
                  <div className="space-y-2.5">
                    {suggestions.map((s) => (
                      <Link
                        key={s.startup_id}
                        to={`/app/startups/${s.startup_id}`}
                        className="group flex items-center justify-between gap-3 bg-surface rounded-xl border border-surface-border shadow-card px-5 py-3.5 hover:border-violet-500/50 hover:shadow-elevated transition-all duration-200"
                      >
                        <span className="text-[14px] font-medium text-ink-950 truncate">{s.name}</span>
                        <span className="text-[13px] font-semibold text-violet-700 tabular-nums shrink-0">
                          {Math.round(parseFloat(s.score) * 100)}%
                        </span>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </Shell>
  );
}
