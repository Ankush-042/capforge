import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Eye, X, ArrowUpRight, TrendingUp, TrendingDown, Check } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import MetricTile, { TILE_PALETTE } from '../components/charts/MetricTile.jsx';
import { getWatchlist, removeFromWatchlist } from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';

/**
 * What this investor is actually tracking.
 *
 * This page previously read the `connections` table, which no live route has
 * written to since the conversation flow replaced it. It was the FOURTH place
 * still reading that dead table, after the contributor dashboard, the investor
 * dashboard and the admin panel. An investor's portfolio was permanently
 * empty, which reads as "this product has nothing in it" rather than as a bug.
 *
 * ON THE WORD "PORTFOLIO": this platform does not process investments and has
 * no knowledge of who actually funded whom. Showing holdings we cannot know
 * would be a lie. What we genuinely know is what someone is watching and what
 * they passed on, so that is what this shows and what it is called.
 */

const INVESTOR_BAR = 35;

function Entry({ e, onRemove, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.25) }}
      className={`relative overflow-hidden bg-surface rounded-xl border shadow-card p-6 pl-7 ${
        e.crossedTheBar ? 'border-mint-500/50' : 'border-surface-border'
      }`}
    >
      <span
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ backgroundColor: e.crossedTheBar ? '#3FB081' : e.status === 'PASSED' ? '#E4E3EC' : '#7C5CFC' }}
      />

      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="min-w-0">
          <Link to={`/app/startups/${e.startupId}`} className="text-[16px] font-semibold text-ink-950 hover:text-violet-700 transition-colors">
            {e.name}
          </Link>
          <p className="text-[12.5px] text-ink-500 mt-0.5 truncate">
            {(e.domain || []).slice(0, 2).join(' · ')}{e.stage ? ` · ${e.stage}` : ''}
          </p>
        </div>
        <button
          onClick={() => onRemove(e)}
          className="text-ink-300 hover:text-signal-critical transition-colors shrink-0"
          title="Stop tracking"
        >
          <X size={15} />
        </button>
      </div>

      {/* The movement is the point. A venture sitting still for months and one
          that has climbed eight points are completely different propositions,
          and an investor who marked both on the same day cannot otherwise
          tell them apart. */}
      {e.crossedTheBar && (
        <p className="flex items-center gap-1.5 text-[13px] font-medium text-mint-500 mb-2">
          <Check size={13} /> Readiness has climbed past what investors look for since you marked it
        </p>
      )}

      <div className="flex items-center gap-5 text-[13px] text-ink-700">
        {e.currentReadiness !== null && (
          <span>
            Readiness <span className="font-semibold text-ink-950 tabular-nums">{e.currentReadiness}</span>
            {e.currentReadiness < INVESTOR_BAR && <span className="text-ink-500"> · below {INVESTOR_BAR}</span>}
          </span>
        )}
        {e.moved !== null && e.moved !== 0 && (
          <span className="flex items-center gap-1" style={{ color: e.moved > 0 ? '#1F5D52' : '#E15C4D' }}>
            {e.moved > 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {e.moved > 0 ? `+${e.moved}` : e.moved} since you marked it
          </span>
        )}
        {e.moved === 0 && <span className="text-ink-500">No change since you marked it</span>}
      </div>

      {e.note && (
        <div className="mt-4 pt-4 border-t border-surface-border">
          <p className="text-[11px] font-semibold tracking-wide uppercase text-ink-300 mb-1">Why you passed</p>
          <p className="text-[13.5px] text-ink-700 leading-relaxed">{e.note}</p>
        </div>
      )}
    </motion.div>
  );
}

export default function InvestorPortfolio() {
  const showToast = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ watching: [], passed: [] });

  async function load() {
    const { ok, data: d } = await getWatchlist();
    if (ok && d.success) setData(d);
  }
  useEffect(() => { load().then(() => setLoading(false)); }, []);

  async function handleRemove(e) {
    const before = data;
    setData({
      watching: data.watching.filter((x) => x.startupId !== e.startupId),
      passed: data.passed.filter((x) => x.startupId !== e.startupId),
    });
    const { ok } = await removeFromWatchlist(e.startupId);
    if (!ok) { setData(before); showToast('Could not remove that.', 'error'); }
  }

  if (loading) {
    return (
      <Shell persona="INVESTOR" title="Tracking">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" />
        </div>
      </Shell>
    );
  }

  const { watching, passed } = data;
  const crossed = watching.filter((e) => e.crossedTheBar);
  const climbing = watching.filter((e) => e.moved !== null && e.moved > 0);

  return (
    <Shell persona="INVESTOR" title="Tracking" subtitle="What you are watching, and what you passed on">
      <div className="mb-7">
        <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-violet-600 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
          {watching.length === 0 && passed.length === 0 ? 'Nothing tracked yet' : `${watching.length} watching · ${passed.length} passed`}
        </p>
        <h1 className="font-editorial italic text-[32px] text-trust-fg leading-tight max-w-3xl">
          {crossed.length > 0
            ? `${crossed.length} ${crossed.length === 1 ? 'venture has' : 'ventures have'} climbed past ${crossed.length === 1 ? 'that level' : 'that level'} since you marked ${crossed.length === 1 ? 'it' : 'them'}.`
            : watching.length === 0
              ? 'You are not tracking anything yet.'
              : 'Nothing has crossed the bar yet.'}
        </h1>
        <p className="text-[15px] text-ink-700 mt-3 max-w-2xl leading-relaxed">
          {watching.length === 0 && passed.length === 0
            ? 'Mark a venture from deal flow to watch how it moves, or record why you passed so you remember your own reasoning later.'
            : 'This is not a record of investments. CapForge does not process them and would be guessing. It is what you told it you were tracking.'}
        </p>
      </div>

      {watching.length === 0 && passed.length === 0 ? (
        <div className="bg-surface rounded-xl border border-surface-border shadow-card py-16 text-center">
          <Eye size={22} className="text-ink-300 mx-auto mb-3" />
          <p className="text-[15px] text-ink-700 mb-1">Nothing tracked yet.</p>
          <p className="text-[13px] text-ink-500 mb-6 max-w-sm mx-auto">
            Watching a venture tells you when it moves. Recording a pass tells future you why you said no.
          </p>
          <Link to="/app/investor/deal-flow" className="inline-flex items-center gap-2 text-[13px] font-medium bg-ink-900 hover:bg-ink-700 text-white px-5 py-2.5 rounded-full transition-colors">
            See your deal flow <ArrowUpRight size={14} />
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-8">
            <MetricTile
              label="Watching" value={watching.length}
              onClick={watching.length ? () => document.getElementById('watching')?.scrollIntoView({ behavior: 'smooth' }) : undefined}
              icon={Eye} {...TILE_PALETTE.lavender}
              caption={watching.length === 0 ? 'Nothing yet' : 'Ventures you are following'}
            />
            <MetricTile
              label="Climbing" value={climbing.length}
              icon={TrendingUp} {...TILE_PALETTE.blue}
              badge={crossed.length > 0 ? `${crossed.length} crossed` : null}
              caption={climbing.length === 0 ? 'None moving up' : 'Readiness up since you marked them'}
            />
            <MetricTile
              label="Passed" value={passed.length}
              onClick={passed.length ? () => document.getElementById('passed')?.scrollIntoView({ behavior: 'smooth' }) : undefined}
              icon={X} {...TILE_PALETTE.cream}
              caption={passed.length === 0 ? 'None' : 'With your reasoning kept'}
            />
          </div>

          {watching.length > 0 && (
            <div id="watching" className="mb-8 scroll-mt-6">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-[15px] font-semibold text-ink-900">Watching</h2>
                <Link to="/app/investor/deal-flow" className="text-[13px] text-ink-500 hover:text-violet-600 transition-colors">Find more</Link>
              </div>
              <div className="space-y-3">
                {watching.map((e, i) => <Entry key={e.startupId} e={e} onRemove={handleRemove} index={i} />)}
              </div>
            </div>
          )}

          {passed.length > 0 && (
            <div id="passed" className="scroll-mt-6">
              <div className="flex items-baseline justify-between mb-3">
                <div>
                  <h2 className="text-[15px] font-semibold text-ink-900">Passed on</h2>
                  <p className="text-[13px] text-ink-500 mt-0.5">Worth re-reading. A venture that was too early once may not be now.</p>
                </div>
              </div>
              <div className="space-y-3">
                {passed.map((e, i) => <Entry key={e.startupId} e={e} onRemove={handleRemove} index={i} />)}
              </div>
            </div>
          )}
        </>
      )}
    </Shell>
  );
}
