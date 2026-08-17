import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../services/api.js';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { ok, data } = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    setLoading(false);
    if (!ok || !data.success) { setError('Incorrect email or password.'); return; }
    localStorage.setItem('capforge_token', data.token);
    window.location.href = '/';
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500" />
          <span className="text-lg font-semibold text-ink-900">CapForge</span>
        </div>
        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-8">
          <h1 className="text-xl font-semibold text-ink-900 mb-1">Welcome back</h1>
          <p className="text-[15px] text-ink-500 mb-6">Log in to continue.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[13px] font-medium text-ink-500 mb-1.5 block">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full px-3.5 py-2.5 rounded-lg border border-surface-border bg-surface-muted text-[15px] focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300" />
            </div>
            <div>
              <label className="text-[13px] font-medium text-ink-500 mb-1.5 block">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                className="w-full px-3.5 py-2.5 rounded-lg border border-surface-border bg-surface-muted text-[15px] focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300" />
            </div>
            {error && <p className="text-[13px] text-rose-500">{error}</p>}
            <button disabled={loading} className="w-full bg-ink-900 hover:bg-ink-700 text-white py-2.5 rounded-lg text-[15px] font-medium transition-colors disabled:opacity-50">
              {loading ? 'Logging in…' : 'Log in'}
            </button>
          </form>
        </div>
        <p className="text-center text-[13px] text-ink-500 mt-5">
          No account? <Link to="/register" className="text-violet-600 font-medium">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
