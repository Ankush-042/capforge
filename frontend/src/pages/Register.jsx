import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../services/api.js';

const ROLES = [
  { value: 'FOUNDER', label: 'Founder', desc: 'I have a venture and need a team.' },
  { value: 'CONTRIBUTOR', label: 'Contributor', desc: 'I want to join a venture.' },
  { value: 'INVESTOR', label: 'Investor', desc: 'I want to discover ventures.' },
];

export default function Register() {
  const [form, setForm] = useState({ displayName: '', email: '', password: '', primaryRole: 'FOUNDER' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { ok, data } = await apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(form) });
    setLoading(false);
    if (!ok || !data.success) { setError(data.detail || 'Something went wrong — try again.'); return; }
    localStorage.setItem('capforge_token', data.token);
    window.location.href = '/';
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500" />
          <span className="text-lg font-semibold text-ink-900">CapForge</span>
        </div>
        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-8">
          <h1 className="text-xl font-semibold text-ink-900 mb-1">Create your account</h1>
          <p className="text-[15px] text-ink-500 mb-6">Start building in a minute.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map((r) => (
                <button type="button" key={r.value} onClick={() => setForm({ ...form, primaryRole: r.value })}
                  className={`text-center px-2 py-3 rounded-lg border text-xs font-medium transition-colors ${form.primaryRole === r.value ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-surface-border text-ink-500 hover:bg-surface-muted'}`}>
                  {r.label}
                </button>
              ))}
            </div>
            <div>
              <label className="text-[13px] font-medium text-ink-500 mb-1.5 block">Name</label>
              <input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required
                className="w-full px-3.5 py-2.5 rounded-lg border border-surface-border bg-surface-muted text-[15px] focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300" />
            </div>
            <div>
              <label className="text-[13px] font-medium text-ink-500 mb-1.5 block">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required
                className="w-full px-3.5 py-2.5 rounded-lg border border-surface-border bg-surface-muted text-[15px] focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300" />
            </div>
            <div>
              <label className="text-[13px] font-medium text-ink-500 mb-1.5 block">Password</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8}
                className="w-full px-3.5 py-2.5 rounded-lg border border-surface-border bg-surface-muted text-[15px] focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300" />
            </div>
            {error && <p className="text-[13px] text-rose-500">{error}</p>}
            <button disabled={loading} className="w-full bg-ink-900 hover:bg-ink-700 text-white py-2.5 rounded-lg text-[15px] font-medium transition-colors disabled:opacity-50">
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>
        <p className="text-center text-[13px] text-ink-500 mt-5">
          Already have an account? <Link to="/login" className="text-violet-600 font-medium">Log in</Link>
        </p>
      </div>
    </div>
  );
}
