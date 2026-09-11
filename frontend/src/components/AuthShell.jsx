import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowUpRight, Lightbulb, Hammer, Landmark } from 'lucide-react';
import { apiFetch } from '../services/api.js';
import '@fontsource/geist-sans/400.css';
import '@fontsource/geist-sans/500.css';
import '@fontsource/geist-sans/600.css';
import '@fontsource/geist-sans/700.css';

/**
 * Sign in and sign up.
 *
 * The copy was the kind of thing we have been removing everywhere else:
 * "the intelligence layer", "make the impossible feel inevitable", "where
 * startup needs, human capability, and aligned capital connect". Nobody
 * talks like that, and it is the second page anyone ever sees.
 *
 * The role choice mattered most and explained least. Three buttons labelled
 * Founder, Contributor and Investor decide which of three entirely different
 * products someone gets, and nothing said what any of them meant. Each one
 * now says what you would actually be doing.
 *
 * All backend wiring is unchanged, including the admin redirect and the full
 * page load on success, both of which fix real confirmed bugs.
 */

const ROLES = [
  {
    value: 'FOUNDER',
    icon: Lightbulb,
    label: 'I have an idea',
    detail: 'Find the people to build it with, then the money to grow it.',
  },
  {
    value: 'CONTRIBUTOR',
    icon: Hammer,
    label: 'I want to build',
    detail: 'Find something worth your years, early enough that it is yours too.',
  },
  {
    value: 'INVESTOR',
    icon: Landmark,
    label: 'I back companies',
    detail: 'See ventures as they form, with honest signal on what is real.',
  },
];

const FIELD = 'w-full px-4 py-3 rounded-lg border border-surface-border bg-surface-muted text-[15px] text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-violet-500 focus:bg-surface transition-colors';

export function AuthShell({ mode }) {
  const isSignUp = mode === 'sign-up';
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [role, setRole] = useState('FOUNDER');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);

    if (isSignUp && !agreed) {
      setError('You need to agree to the terms before continuing.');
      return;
    }

    setLoading(true);
    const endpoint = isSignUp ? '/auth/register' : '/auth/login';
    const body = isSignUp
      ? { displayName: name, email, password, primaryRole: role }
      : { email, password };

    const { ok, data } = await apiFetch(endpoint, { method: 'POST', body: JSON.stringify(body) });
    setLoading(false);

    if (!ok || !data.success) {
      setError(
        data.error === 'EMAIL_ALREADY_EXISTS' ? 'There is already an account with this email.'
        : data.error === 'INVALID_CREDENTIALS' ? 'That email and password do not match.'
        : data.detail || 'Something went wrong. Try again.'
      );
      return;
    }

    localStorage.setItem('capforge_token', data.token);
    const userRole = data.user?.primaryRole;
    let destination;
    // An admin's primary_role is technically FOUNDER, required by the schema
    // enum, so without this check an admin lands on the founder's "describe
    // your idea" screen, which is nonsense for an account with no venture.
    if (data.user?.isAdmin) {
      destination = '/app/admin';
    } else if (isSignUp) {
      destination = userRole === 'CONTRIBUTOR' ? '/app/contributor/onboarding' : userRole === 'INVESTOR' ? '/app/investor/onboarding' : '/app/onboarding';
    } else {
      destination = userRole === 'CONTRIBUTOR' ? '/app/contributor' : userRole === 'INVESTOR' ? '/app/investor' : '/app';
    }
    // Full page load, not navigate(). Client-side navigation never remounts
    // the React tree, so long-lived context kept a PREVIOUS user's data after
    // signing in as someone else in the same tab. This was a real,
    // confirmed cross-account leak.
    window.location.href = destination;
  }

  return (
    <div className="min-h-screen bg-canvas font-sans flex flex-col">
      <header className="px-6 lg:px-10 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[10px] bg-ink-950 flex items-center justify-center shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 12.5L7 6L9.5 9.5L13 3.5" stroke="#7C5CFC" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="13" cy="3.5" r="1.6" fill="#3FB081" />
            </svg>
          </div>
          <span className="font-display font-bold text-[15px] tracking-[-0.02em] text-ink-950">CapForge</span>
        </Link>
        <Link to="/" className="text-[13.5px] text-ink-500 hover:text-ink-900 flex items-center gap-1.5 transition-colors">
          <ArrowLeft size={14} /> Back
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className={`grid gap-16 w-full items-center ${isSignUp ? 'lg:grid-cols-[1fr_460px] max-w-5xl' : 'lg:grid-cols-2 max-w-4xl'}`}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="hidden lg:block"
          >
            <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] uppercase text-forest-600 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-forest-500" />
              {isSignUp ? 'Where startups actually begin' : 'Welcome back'}
            </p>
            <h1 className="font-display text-[40px] font-semibold text-ink-950 leading-[1.08] tracking-tight">
              {isSignUp
                ? <>It starts with one idea and one person who <span className="italic font-normal text-forest-600">believes it.</span></>
                : <>Someone may have <span className="italic font-normal text-forest-600">written back.</span></>}
            </h1>
            <p className="text-ink-700 mt-5 text-[15.5px] leading-relaxed max-w-md">
              {isSignUp
                ? 'Share what you cannot stop thinking about, find the person who wants to build it with you, and grow it until investors come looking.'
                : 'Pick up where you left off.'}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="bg-surface rounded-2xl border border-surface-border shadow-elevated p-8"
          >
            <p className="font-display text-[20px] font-semibold text-ink-950 mb-6">
              {isSignUp ? 'Create your account' : 'Sign in'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div>
                  {/* This choice decides which of three entirely different
                      products someone gets. It previously offered three bare
                      words and no explanation. */}
                  <label className="text-[13px] font-medium text-ink-700 mb-2 block">Which are you?</label>
                  <div className="space-y-2">
                    {ROLES.map((r) => {
                      const Icon = r.icon;
                      const on = role === r.value;
                      return (
                        <button
                          type="button"
                          key={r.value}
                          onClick={() => setRole(r.value)}
                          className={`w-full text-left flex items-start gap-3 px-4 py-3 rounded-lg border transition-all duration-150 ${
                            on ? 'border-violet-500/60 bg-violet-50/50' : 'border-surface-border hover:border-violet-500/30'
                          }`}
                        >
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                            style={{ backgroundColor: on ? '#EED8FF' : '#F4F4F7', color: on ? '#6D28D9' : '#6E7079' }}
                          >
                            <Icon size={15} />
                          </div>
                          <div className="min-w-0">
                            <p className={`text-[14px] ${on ? 'font-semibold text-ink-950' : 'font-medium text-ink-900'}`}>{r.label}</p>
                            <p className="text-[12.5px] text-ink-500 mt-0.5 leading-snug">{r.detail}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {isSignUp && (
                <div>
                  <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">Your name</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} required className={FIELD} />
                </div>
              )}

              <div>
                <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={FIELD} />
              </div>

              <div>
                <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={isSignUp ? 8 : undefined}
                  className={FIELD}
                />
                {isSignUp && <p className="text-[12px] text-ink-500 mt-1.5">At least 8 characters.</p>}
              </div>

              {isSignUp && (
                <label className="flex items-start gap-2.5 text-[13px] text-ink-700 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="rounded border-surface-border mt-0.5"
                  />
                  <span>I agree to the terms and privacy policy.</span>
                </label>
              )}

              {error && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg px-4 py-3">
                  <p className="text-[13px] text-rose-600">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-ink-900 hover:bg-ink-700 text-white py-3 rounded-full text-[15px] font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading
                  ? (isSignUp ? 'Creating your account…' : 'Signing you in…')
                  : (isSignUp ? 'Create account' : 'Sign in')}
                {!loading && <ArrowUpRight size={15} />}
              </button>
            </form>

            <p className="text-center text-[13.5px] text-ink-500 mt-6">
              {isSignUp ? 'Already have an account?' : 'New here?'}{' '}
              <Link to={isSignUp ? '/sign-in' : '/sign-up'} className="text-violet-700 font-medium hover:text-violet-600 transition-colors">
                {isSignUp ? 'Sign in' : 'Create an account'}
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
