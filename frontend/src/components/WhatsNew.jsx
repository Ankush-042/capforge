import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Users, Sparkles, TrendingUp, TrendingDown, Target, Search, X } from 'lucide-react';
import { getWhatsNew } from '../services/startups.js';

/**
 * What changed since you were last here.
 *
 * Every screen in this product showed current state and nothing showed a
 * delta, which is the most common reason a person reopens anything.
 *
 * DELIBERATELY RENDERS NOTHING when nothing happened. A strip that always
 * appears, padded with "your readiness is 43", trains people to ignore it.
 * Silence is the correct output most of the time, and a component that is
 * only ever there when it has something to say stays worth reading.
 */

const ICON = {
  MESSAGES: MessageSquare,
  CANDIDATES: Users,
  JOINED: Users,
  READINESS: TrendingUp,
  RESONANCE: Sparkles,
  OPPORTUNITIES: Target,
  SPARKS: Sparkles,
  DEALFLOW: Search,
};

function sinceLabel(iso) {
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (hours < 1) return 'in the last hour';
  if (hours < 24) return `in the last ${hours} hours`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'since yesterday';
  if (days < 7) return `in the last ${days} days`;
  return `since ${new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
}

export default function WhatsNew() {
  const [data, setData] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    getWhatsNew().then(({ ok, data: d }) => {
      if (ok && d.success) setData(d);
    });
  }, []);

  // Nothing to say, first visit, or dismissed: render nothing at all.
  if (!data || data.firstVisit || !data.items?.length || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-xl bg-ink-950 p-6 mb-6"
      >
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle at 15% 25%, #7C5CFC 0%, transparent 55%), radial-gradient(circle at 85% 75%, #1F5D52 0%, transparent 55%)' }} />
        <div className="relative">
          <div className="flex items-start justify-between gap-4 mb-4">
            <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-mint-500">
              <span className="w-1.5 h-1.5 rounded-full bg-mint-500" />
              {data.since ? `While you were away · ${sinceLabel(data.since)}` : 'While you were away'}
            </p>
            <button
              onClick={() => setDismissed(true)}
              className="text-white/30 hover:text-white/70 transition-colors shrink-0"
              aria-label="Dismiss"
            >
              <X size={15} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-2.5">
            {data.items.slice(0, 6).map((item, i) => {
              const Icon = ICON[item.kind] || Sparkles;
              const DownIcon = item.kind === 'READINESS' && item.text.includes('down') ? TrendingDown : Icon;
              return (
                <Link
                  key={`${item.kind}-${i}`}
                  to={item.to}
                  className="group flex items-center gap-2.5 text-[14px] text-white/80 hover:text-white transition-colors"
                >
                  <DownIcon size={14} className="text-mint-500 shrink-0" />
                  <span className="truncate">{item.text}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
