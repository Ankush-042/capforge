import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Check, LockKeyhole } from 'lucide-react';
import { apiFetch } from '../services/api.js';
import '@fontsource/geist-sans/400.css';
import '@fontsource/geist-sans/500.css';
import '@fontsource/geist-sans/600.css';
import '@fontsource/geist-sans/700.css';

/**
 * Auth shell — rebuilt in pure Tailwind, matching the rebuilt Landing page.
 * Real backend wiring preserved exactly as before (login/register).
 */
export function AuthShell({ mode }) {
  const isSignUp = mode === 'sign-up';
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);

    if (isSignUp && !agreed) {
      setError('Please agree to the terms and privacy policy to continue.');
      return;
    }

    setLoading(true);
    const endpoint = isSignUp ? '/auth/register' : '/auth/login';
    const body = isSignUp
      ? { displayName: name, email, password, primaryRole: 'FOUNDER' }
      : { email, password };

    const { ok, data } = await apiFetch(endpoint, { method: 'POST', body: JSON.stringify(body) });
    setLoading(false);

    if (!ok || !data.success) {
      setError(
        data.error === 'EMAIL_ALREADY_EXISTS' ? 'An account with this email already exists.' :
        data.error === 'INVALID_CREDENTIALS' ? 'Incorrect email or password.' :
        data.detail || 'Something went wrong. Please try again.'
      );
      return;
    }

    localStorage.setItem('capforge_token', data.token);
    navigate('/app');
  }

  return (
    <div className="min-h-screen bg-canvas font-sans flex flex-col">
      <header className="px-6 lg:px-10 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full border border-ink-900 flex items-center justify-center font-display text-sm font-semibold text-ink-900">C</div>
          <span className="font-display font-semibold text-[15px] tracking-tight text-ink-900">CAPFORGE</span>
        </Link>
        <Link to="/" className="text-sm text-ink-500 hover:text-ink-900 flex items-center gap-1.5 transition-colors">
          <ArrowLeft size={14} /> Back to home
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="grid lg:grid-cols-2 gap-16 max-w-4xl w-full items-center">
          <div className="hidden lg:block">
            <p className="text-xs font-medium tracking-[0.14em] uppercase text-forest-600 mb-4">{isSignUp ? 'Build your edge' : 'Welcome back'}</p>
            <h1 className="font-display text-4xl font-semibold text-ink-950 leading-tight">
              {isSignUp
                ? <>The right people make <span className="italic font-normal text-forest-600">the impossible</span> feel inevitable.</>
                : <>Your next breakthrough is already <span className="italic font-normal text-forest-600">in motion.</span></>}
            </h1>
            <p className="text-ink-500 mt-5 text-[15px] leading-relaxed max-w-sm">
              {isSignUp
                ? 'Join the intelligence layer for founders, contributors, and investors building what matters next.'
                : 'Return to the workspace where startup needs, human capability, and aligned capital connect.'}
            </p>
            <div className="flex items-center gap-2 mt-8 text-sm text-forest-600">
              <span className="w-6 h-6 rounded-full bg-forest-50 flex items-center justify-center"><Check size={13} /></span>
              Founder → Talent → Capital
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-surface-border shadow-elevated p-8">
            <div className="flex items-center justify-between mb-6">
              <span className="text-sm font-medium text-ink-900">{isSignUp ? 'Create your account' : 'Sign in to CapForge'}</span>
              <LockKeyhole size={16} className="text-ink-300" />
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div>
                  <label className="text-xs font-medium text-ink-500 mb-1.5 block">Full name</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} required
                    className="w-full px-3.5 py-2.5 rounded-lg border border-surface-border bg-surface-muted text-[15px] focus:outline-none focus:ring-2 focus:ring-forest-500/20 focus:border-forest-500" />
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-ink-500 mb-1.5 block">Email address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  className="w-full px-3.5 py-2.5 rounded-lg border border-surface-border bg-surface-muted text-[15px] focus:outline-none focus:ring-2 focus:ring-forest-500/20 focus:border-forest-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-ink-500 mb-1.5 block">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={isSignUp ? 8 : undefined}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-surface-border bg-surface-muted text-[15px] focus:outline-none focus:ring-2 focus:ring-forest-500/20 focus:border-forest-500" />
              </div>
              {isSignUp && (
                <label className="flex items-center gap-2 text-[13px] text-ink-500">
                  <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="rounded border-surface-border" />
                  I agree to the CapForge terms and privacy policy.
                </label>
              )}
              {error && <p className="text-[13px] text-rose-500">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full bg-ink-900 hover:bg-ink-700 text-white py-3 rounded-lg text-[15px] font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? (isSignUp ? 'Creating account…' : 'Signing in…') : (isSignUp ? 'Create account' : 'Sign in')} <ArrowUpRight size={15} />
              </button>
            </form>
            <p className="text-center text-[13px] text-ink-500 mt-6">
              {isSignUp ? 'Already have an account?' : 'New to CapForge?'}{' '}
              <Link to={isSignUp ? '/sign-in' : '/sign-up'} className="text-forest-600 font-medium">{isSignUp ? 'Sign in' : 'Create an account'}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
