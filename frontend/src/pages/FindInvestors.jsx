import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { MessageSquare, Check, AlertTriangle, ArrowUpRight, Landmark } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import { getInvestorsForStartup, startConversation } from '../services/startups.js';
import { useActiveStartup } from '../context/ActiveStartupContext.jsx';
import { useToast } from '../components/Toast.jsx';

/**
 * Investors who might back this.
 *
 * The one direction of the flow that was never built. Investors browsed deal
 * flow and reached out; a founder could only wait to be discovered. That is
 * passive in a product whose entire premise is that a founder should be able
 * to go and find the people they need.
 *
 * The page does NOT hide investors from a founder below the readiness bar.
 * Seeing who you are working toward, with the gap stated plainly, is more
 * useful and more honest than an empty page.
 */

function fitTone(score) {
  if (score >= 0.7) return { fg: '#1F5D52', bg: '#EAF7F0', label: 'Strong fit' };
  if (score >= 0.5) return { fg: '#6845F0', bg: '#F1EEFE', label: 'Real fit' };
  return { fg: '#6E7079', bg: '#F4F4F7', label: 'Adjacent' };
}

function money(n) {
  const v = parseFloat(n);
  if (!v || Number.isNaN(v)) return null;
  if (v >= 1000000) return `$${(v / 1000000).toFixed(v % 1000000 === 0 ? 0 : 1)}M`;
  if (v >= 1000) return `$${Math.round(v / 1000)}k`;
  return `$${v}`;
}

function InvestorCard({ inv, onMessage, visible, index }) {
  const score = parseFloat(inv.score) || 0;
  const pct = Math.round(score * 100);
  const tone = fitTone(score);
  const strengths = inv.explanation?.strengths || [];
  const watch = inv.explanation?.watch || [];
  const lo = money(inv.ticket_min);
  const hi = money(inv.ticket_max);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.3), ease: [0.16, 1, 0.3, 1] }}
      className="bg-surface rounded-xl border border-surface-border shadow-card p-6 hover:shadow-elevated transition-shadow duration-200"
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0">
          <Link to={`/app/profile/${inv.user_id}`} className="text-[17px] font-semibold text-ink-950 hover:text-violet-700 transition-colors">
            {inv.display_name}
          </Link>
          <p className="text-[12.5px] text-ink-500 mt-0.5 truncate">
            {inv.investment_type || 'Investor'}
            {lo && hi ? ` · ${lo}–${hi}` : lo ? ` · from ${lo}` : ''}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <span className="text-[26px] font-bold leading-none tabular-nums" style={{ color: tone.fg }}>{pct}</span>
          <span className="text-[13px] font-medium ml-0.5" style={{ color: tone.fg }}>%</span>
          <p className="text-[11px] font-medium mt-1 px-2 py-0.5 rounded-md inline-block" style={{ backgroundColor: tone.bg, color: tone.fg }}>
            {tone.label}
          </p>
        </div>
      </div>

      {inv.thesis && (
        <p className="text-[13.5px] text-ink-700 leading-relaxed italic mb-4 line-clamp-3">“{inv.thesis}”</p>
      )}

      {strengths.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {strengths.slice(0, 3).map((s) => (
            <p key={s} className="text-[13.5px] text-ink-700 flex gap-2 leading-relaxed">
              <Check size={14} className="text-mint-500 shrink-0 mt-0.5" />{s}
            </p>
          ))}
        </div>
      )}

      {watch.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {watch.slice(0, 2).map((w) => (
            <p key={w} className="text-[13.5px] text-ink-500 flex gap-2 leading-relaxed">
              <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />{w}
            </p>
          ))}
        </div>
      )}

      <div className="pt-4 border-t border-surface-border flex items-center justify-between gap-3">
        <Link to={`/app/profile/${inv.user_id}`} className="flex items-center gap-1 text-[13px] font-medium text-ink-500 hover:text-violet-700 transition-colors">
          Their full thesis <ArrowUpRight size={13} />
        </Link>
        <button
          onClick={() => onMessage(inv)}
          disabled={!visible}
          title={visible ? undefined : 'Reach out once your venture is past the readiness bar'}
          className="flex items-center gap-1.5 text-[13px] font-medium bg-ink-900 hover:bg-ink-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-full transition-colors"
        >
          <MessageSquare size={13} /> Reach out
        </button>
      </div>
    </motion.div>
  );
}

export default function FindInvestors() {
  const { activeStartup, loading: startupLoading } = useActiveStartup();
  const navigate = useNavigate();
  const showToast = useToast();
  const [loading, setLoading] = useState(true);
  const [investors, setInvestors] = useState([]);
  const [readiness, setReadiness] = useState(null);
  const [bar, setBar] = useState(35);

  useEffect(() => {
    async function load() {
      if (startupLoading) return;
      if (!activeStartup) { setLoading(false); return; }
      const { ok, data } = await getInvestorsForStartup(activeStartup.id);
      if (ok && data.success) {
        setInvestors(data.investors);
        setReadiness(data.readiness);
        setBar(data.investorBar || 35);
      }
      setLoading(false);
    }
    load();
  }, [activeStartup?.id, startupLoading]);

  async function handleMessage(inv) {
    const { ok, data } = await startConversation(inv.user_id, { startupId: activeStartup.id });
    if (ok && data.success) navigate(`/app/inbox/${data.conversation.id}`);
    else showToast(data.error || 'Could not start a conversation.', 'error');
  }

  if (loading) {
    return (
      <Shell title="Find investors">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" />
        </div>
      </Shell>
    );
  }

  const visible = readiness !== null && readiness >= bar;
  const strong = investors.filter((i) => (parseFloat(i.score) || 0) >= 0.5);
  const rest = investors.filter((i) => (parseFloat(i.score) || 0) < 0.5);
  const top = investors[0] || null;

  return (
    <Shell title={activeStartup?.name || 'Find investors'} subtitle="Ranked against what each one actually backs">
      <div className="mb-7">
        <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-violet-600 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
          {investors.length === 0 ? 'Nobody yet' : `${investors.length} investor${investors.length === 1 ? '' : 's'} on the platform`}
        </p>
        <h1 className="font-editorial italic text-[32px] text-trust-fg leading-tight max-w-3xl">
          {top ? `${top.display_name} is the closest to what you are building.` : 'No investors here yet.'}
        </h1>
        <p className="text-[15px] text-ink-700 mt-3 max-w-2xl leading-relaxed">
          Each one is scored against their own stated thesis, the same way they are scored against you. You do not have to wait to be found.
        </p>
      </div>

      {/* Honest about the gate rather than hiding it. A founder below the bar
          can see who they are working toward, and exactly how far off. */}
      {!visible && investors.length > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
          <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-[14px] font-semibold text-amber-800">
              {readiness === null
                ? 'Your venture has not been assessed yet'
                : `You are ${bar - readiness} point${bar - readiness === 1 ? '' : 's'} from being able to reach out`}
            </p>
            <p className="text-[13px] text-amber-700 mt-0.5 leading-relaxed">
              Investors only take conversations from ventures past {bar} readiness. You can see who fits now, and reach out once you are there.{' '}
              <Link to="/app/readiness" className="underline hover:no-underline">See what moves it</Link>.
            </p>
          </div>
        </div>
      )}

      {investors.length === 0 ? (
        <div className="bg-surface rounded-xl border border-surface-border shadow-card py-16 text-center">
          <Landmark size={22} className="text-ink-300 mx-auto mb-3" />
          <p className="text-[15px] text-ink-700 mb-1">No investors on the platform yet.</p>
          <p className="text-[13px] text-ink-500 max-w-sm mx-auto">
            As investors join and write their thesis, they will appear here ranked against what you are building.
          </p>
        </div>
      ) : (
        <>
          {strong.length > 0 && (
            <div className="mb-8">
              <div className="flex items-baseline justify-between mb-3">
                <div>
                  <h2 className="text-[15px] font-semibold text-ink-900">Worth approaching</h2>
                  <p className="text-[13px] text-ink-500 mt-0.5">Their thesis genuinely overlaps what you are building.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {strong.map((inv, i) => (
                  <InvestorCard key={inv.user_id} inv={inv} onMessage={handleMessage} visible={visible} index={i} />
                ))}
              </div>
            </div>
          )}

          {rest.length > 0 && (
            <div>
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-[15px] font-semibold text-ink-900">{strong.length > 0 ? 'Further from your space' : 'Ranked by fit'}</h2>
                <span className="text-[13px] text-ink-500">Outside their stated focus</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {rest.map((inv, i) => (
                  <InvestorCard key={inv.user_id} inv={inv} onMessage={handleMessage} visible={visible} index={i} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Shell>
  );
}
