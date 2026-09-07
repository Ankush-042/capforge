const BASE = '/api';

function getToken() { return localStorage.getItem('capforge_token'); }

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  // Real defense-in-depth for the confirmed cross-account data leak: if
  // the token is genuinely invalid/expired, force a full clean reset
  // rather than leaving the app running with stale, unauthenticated state.
  if (res.status === 401 && token) {
    localStorage.removeItem('capforge_token');
    localStorage.removeItem('capforge_active_startup_id');
    window.location.href = '/sign-in';
  }

  return { ok: res.ok, status: res.status, data };
}
