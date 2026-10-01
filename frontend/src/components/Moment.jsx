import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';

/**
 * When something actually becomes real.
 *
 * A team forming and a venture being born out of a spark are the two things
 * this entire product exists to cause, and both of them passed as a toast in
 * the corner — the same treatment as "could not save that". Years of
 * somebody's life start at that click and it was acknowledged with a grey
 * rectangle that disappears in four seconds.
 *
 * So this is the only place in the product that interrupts. It is deliberately
 * the one gesture that is not quiet, because a product where everything is
 * understated has nothing left to say when something genuinely matters.
 *
 * STILL RESTRAINED, because the failure mode is confetti. No sound, no
 * bouncing, nothing that would be embarrassing to see twice. It states what
 * happened, says what it means, and gets out of the way. Dismissible
 * immediately, honours reduced-motion, and never shown twice for the same
 * event.
 */
export default function Moment({ open, onClose, kind, title, line, action }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[90] flex items-center justify-center px-6"
          style={{ backgroundColor: 'rgba(12,12,18,0.82)', backdropFilter: 'blur(3px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative overflow-hidden rounded-2xl bg-ink-950 border border-white/10 max-w-[520px] w-full px-10 py-11 text-center"
          >
            <div
              className="absolute inset-0 opacity-50"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 24% 8%, rgba(124,92,252,0.34) 0%, transparent 48%), radial-gradient(circle at 80% 92%, rgba(63,176,129,0.26) 0%, transparent 46%)',
              }}
            />

            <div className="relative">
              <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-white/45 mb-5">{kind}</p>

              <h2 className="font-editorial italic text-[34px] leading-[1.1] text-white tracking-[-0.025em]">
                {title}
              </h2>

              <p className="text-[15px] text-white/70 leading-relaxed mt-5 max-w-sm mx-auto">{line}</p>

              <div className="flex items-center justify-center gap-5 mt-9">
                {action && (
                  <Link
                    to={action.to}
                    onClick={onClose}
                    className="bg-white hover:bg-white/90 text-ink-950 px-6 py-3 rounded-full text-[14.5px] font-medium transition-colors"
                  >
                    {action.label}
                  </Link>
                )}
                <button onClick={onClose} className="text-[13.5px] text-white/55 hover:text-white transition-colors">
                  Not now
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
