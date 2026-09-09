import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { RefreshCw, ExternalLink, Radio } from 'lucide-react';

/**
 * Signal: real, current market intelligence.
 *
 * Every claim in the body is synthesized from live web search results, and
 * the sources below it are the actual URLs those results came from. They are
 * clickable on purpose: this is the one surface in the app where the user
 * should be able to check the machine's work directly.
 */
export default function SignalPanel({ endpoint }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [signal, setSignal] = useState(null);
  const [error, setError] = useState(null);

  async function load(refresh = false) {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const token = localStorage.getItem('capforge_token');
      const res = await fetch(`/api${endpoint}${refresh ? '?refresh=true' : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) { setSignal(data.signal); setError(null); }
      else setError(data.error);
    } catch (err) {
      setError('NETWORK');
    }
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { load(); }, [endpoint]);

  if (loading) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-ink-950 p-8">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 20% 40%, #7C5CFC 0%, transparent 55%), radial-gradient(circle at 80% 60%, #1F5D52 0%, transparent 55%)' }} />
        <div className="relative flex items-center gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-mint-500 animate-spin" />
          <p className="text-[15px] text-white/60">Reading current trends in your market…</p>
        </div>
      </div>
    );
  }

  // Real, honest error states. Each says what is actually wrong and what to
  // do about it, rather than a generic failure message.
  if (error) {
    const messages = {
      TAVILY_NOT_CONFIGURED: 'Market intelligence needs a Tavily API key set as TAVILY_API_KEY.',
      NO_THESIS_DOMAINS: 'Add domains to your investment thesis to get market intelligence for your space.',
      NO_INVESTOR_PROFILE: 'Complete your investor profile to get market intelligence.',
      SYNTHESIS_FAILED: 'Could not synthesize the market read just now. Try again shortly.',
      SEARCH_FAILED: 'The market search did not return anything usable just now.',
    };
    return (
      <div className="rounded-2xl border border-surface-border bg-surface p-7">
        <div className="flex items-center gap-2 mb-2">
          <Radio size={16} className="text-ink-300" />
          <p className="text-[15px] font-semibold text-ink-900">What is moving in your market</p>
        </div>
        <p className="text-[14px] text-ink-500 leading-relaxed">{messages[error] || 'Current market trends are unavailable right now.'}</p>
        <button onClick={() => load(true)} className="mt-4 text-[13px] font-medium text-violet-700 hover:text-violet-600 transition-colors">Try again</button>
      </div>
    );
  }

  if (!signal) return null;

  const sources = Array.isArray(signal.sources) ? signal.sources : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-2xl bg-ink-950 p-8"
    >
      <div className="absolute inset-0 opacity-35" style={{ backgroundImage: 'radial-gradient(circle at 15% 25%, #7C5CFC 0%, transparent 55%), radial-gradient(circle at 85% 75%, #1F5D52 0%, transparent 55%)' }} />
      <div className="relative">
        <div className="flex items-start justify-between gap-4 mb-5">
          <p className="flex items-center gap-2 text-xs font-medium tracking-[0.14em] uppercase text-mint-500">
            <span className="w-1.5 h-1.5 rounded-full bg-mint-500 animate-pulse" />What is moving in your market
          </p>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 transition-colors disabled:opacity-40"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing' : 'Refresh'}
          </button>
        </div>

        <h3 className="font-display text-[22px] lg:text-[26px] font-semibold text-white leading-snug mb-2">
          {signal.headline}
        </h3>
        <p className="text-[13px] text-white/40 mb-5">
          Current industry trends, pulled from the live web in the last month. Not about your venture.
        </p>

        <div className="text-[15px] text-white/70 leading-relaxed space-y-3">
          {signal.body.split('\n').filter(Boolean).map((para, i) => <p key={i}>{para}</p>)}
        </div>

        {signal.based_on && (
          <p className="text-[12px] text-white/35 mt-5">
            Weighted toward your {signal.based_on.replace(/_/g, ' ')} signal.
          </p>
        )}

        {sources.length > 0 && (
          <div className="mt-6 pt-5 border-t border-white/10">
            <p className="text-[11px] font-medium tracking-wide uppercase text-white/35 mb-3">Sources</p>
            <div className="space-y-2">
              {sources.map((s, i) => (
                <a
                  key={i}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 text-[13px] text-white/55 hover:text-mint-500 transition-colors group"
                >
                  <ExternalLink size={12} className="mt-0.5 shrink-0 opacity-50 group-hover:opacity-100" />
                  <span className="line-clamp-1">{s.title}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
