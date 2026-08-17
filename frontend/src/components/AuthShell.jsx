import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Check, LockKeyhole } from 'lucide-react';
import { apiFetch } from '../services/api.js';
import '../styles/landing.css';

/**
 * Auth shell — ported from the reference design. The form was a stub
 * (event.preventDefault() only) in the source; now wired to the REAL
 * backend auth endpoints, with real loading/error states and redirect
 * on success.
 */
export function AuthShell({ mode }) {
  const isSignUp = mode === 'sign-up';
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('FOUNDER');
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
      ? { displayName: name, email, password, primaryRole: role }
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
    <main className="auth-page">
      <div className="auth-orbit auth-orbit-one" />
      <div className="auth-orbit auth-orbit-two" />
      <header className="auth-header">
        <Link to="/" className="brand-mark" aria-label="CapForge home">
          <span className="brand-wordmark">C</span>
          <span>CAPFORGE</span>
        </Link>
        <Link to="/" className="auth-back"><ArrowLeft size={14} /> Back to home</Link>
      </header>

      <section className="auth-layout">
        <div className="auth-pitch">
          <p className="eyebrow">{isSignUp ? 'Build your edge' : 'Welcome back'}</p>
          <h1>{isSignUp ? <>The right people make <em>the impossible</em> feel inevitable.</> : <>Your next breakthrough is already <em>in motion.</em></>}</h1>
          <p className="auth-intro">{isSignUp ? 'Join the intelligence layer for founders, contributors, and investors building what matters next.' : 'Return to the workspace where startup needs, human capability, and aligned capital connect.'}</p>
          <div className="auth-proof"><span className="proof-icon"><Check size={14} /></span><span>Founder → Talent → Capital</span><span className="proof-line" /></div>
        </div>

        <div className="auth-card">
          <div className="auth-card-top"><span className="auth-card-label">{isSignUp ? 'Create your account' : 'Sign in to CapForge'}</span><LockKeyhole size={15} /></div>
          <form className="auth-form" onSubmit={handleSubmit}>
            {isSignUp && (
              <label>Full name<input name="name" type="text" autoComplete="name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required /></label>
            )}
            {isSignUp && (
              <label>I am a<select value={role} onChange={(e) => setRole(e.target.value)} style={{ border: '1px solid var(--border)', background: 'var(--background)', padding: '14px 13px', color: 'var(--foreground)', font: '13px var(--font-sans)', outline: 'none' }}>
                <option value="FOUNDER">Founder</option>
                <option value="CONTRIBUTOR">Contributor</option>
                <option value="INVESTOR">Investor</option>
              </select></label>
            )}
            <label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
            <label>Password<input name="password" type="password" autoComplete={isSignUp ? 'new-password' : 'current-password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={isSignUp ? 8 : undefined} /></label>
            {isSignUp && (
              <label className="auth-check"><input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} /> <span>I agree to the CapForge terms and privacy policy.</span></label>
            )}
            {error && <p style={{ color: 'var(--destructive)', fontSize: 12 }}>{error}</p>}
            <button type="submit" className="button button-dark auth-submit" disabled={loading}>
              {loading ? (isSignUp ? 'Creating account…' : 'Signing in…') : (isSignUp ? 'Create account' : 'Sign in')} <ArrowUpRight size={16} />
            </button>
          </form>
          <p className="auth-switch">{isSignUp ? 'Already have an account?' : 'New to CapForge?'} <Link to={isSignUp ? '/sign-in' : '/sign-up'}>{isSignUp ? 'Sign in' : 'Create an account'}</Link></p>
        </div>
      </section>
    </main>
  );
}
