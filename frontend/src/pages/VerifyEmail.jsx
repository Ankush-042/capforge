import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Check, AlertTriangle } from 'lucide-react';
import { apiFetch } from '../services/api.js';

/**
 * Where a verification link lands.
 *
 * Public by design. The token is the credential, and requiring a login before
 * clicking a link from your own inbox is a wall for no benefit.
 *
 * Every outcome says what it means and what to do, and NONE of them implies
 * the account is unusable, because it never is. Verification blocks nothing
 * in this product. A failed or expired link is an inconvenience, not a
 * lockout, and the copy has to make that unmistakable or people will assume
 * they have lost access.
 */
export default function VerifyEmail() {
  const [params] = useSearchParams();
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    const token = params.get('token');
    if (!token) { setState({ loading: false, error: 'MALFORMED' }); return; }
    apiFetch(`/auth/verify-email?token=${encodeURIComponent(token)}`).then(({ data }) => {
      setState({ loading: false, ...(data || { error: 'FAILED' }) });
    });
  }, [params]);

  const { loading, success, alreadyVerified, error } = state;

  const message = success
    ? alreadyVerified
      ? { title: 'Already confirmed', body: 'This address was confirmed earlier. Nothing more to do.' }
      : { title: 'Confirmed', body: 'We can reach you now, so you will hear when someone wants in on what you are building.' }
    : {
        EXPIRED: { title: 'That link has expired', body: 'Links last 48 hours. Sign in and ask for a new one from Settings whenever you like.' },
        ALREADY_USED: { title: 'That link was already used', body: 'If it worked the first time, you are confirmed. If not, request a new one from Settings.' },
        NOT_FOUND: { title: 'We do not recognise that link', body: 'It may have been replaced by a newer one. Request another from Settings.' },
        MALFORMED: { title: 'That link looks incomplete', body: 'Email clients sometimes break long links. Try copying the whole thing, or request a new one.' },
      }[error] || { title: 'Could not confirm that', body: 'Something went wrong on our end. Requesting a new link usually fixes it.' };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        <div className="bg-surface rounded-2xl border border-surface-border shadow-elevated p-8 text-center">
          {loading ? (
            <>
              <div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin mx-auto mb-5" />
              <p className="text-[15px] text-ink-700">Confirming your email…</p>
            </>
          ) : (
            <>
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ backgroundColor: success ? '#EAF7F0' : '#FEF3E8' }}
              >
                {success
                  ? <Check size={22} className="text-mint-500" />
                  : <AlertTriangle size={20} className="text-amber-600" />}
              </div>
              <p className="font-display text-[22px] font-semibold text-ink-950 mb-2">{message.title}</p>
              <p className="text-[14.5px] text-ink-700 leading-relaxed mb-6">{message.body}</p>

              {/* The line that matters. Nothing in this product is gated on
                  verification, and someone landing on a failure state will
                  otherwise assume they have lost access. */}
              {!success && (
                <p className="text-[13px] text-ink-500 leading-relaxed mb-6">
                  Your account works either way. Nothing in CapForge is locked behind this.
                </p>
              )}

              <Link
                to="/app"
                className="inline-flex items-center gap-2 bg-ink-900 hover:bg-ink-700 text-white px-6 py-3 rounded-full text-[15px] font-medium transition-colors"
              >
                Go to CapForge
              </Link>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
