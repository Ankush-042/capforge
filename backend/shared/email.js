/**
 * Sending email, safely.
 *
 * THE RULE THIS FILE EXISTS TO ENFORCE: email is never load-bearing. If no
 * provider is configured, if the key is wrong, if the service is down, if the
 * request times out — the application carries on exactly as it does today.
 * Nothing here can block a signup, fail a request, or throw into a route.
 *
 * That is not defensive coding for its own sake. This is a college project
 * that will be demonstrated live, and an email provider having a bad day must
 * not be able to break a demo. It is also the same rule already applied to
 * every AI call in this codebase, and applying it inconsistently would be
 * worse than not applying it at all.
 *
 * Provider is Resend, chosen because it needs one API key and one fetch call.
 * Swapping it later means changing this file only.
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const TIMEOUT_MS = 8000;

function isConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

/**
 * Returns { sent: boolean, reason?: string }. NEVER throws, never rejects.
 * Callers are not expected to handle failure because failure is not an error
 * condition here: it is an expected, acceptable state.
 */
async function sendEmail({ to, subject, html, text }) {
  if (!isConfigured()) {
    // Not an error. The app is designed to run without email configured, and
    // saying so plainly once is more useful than a stack trace.
    return { sent: false, reason: 'EMAIL_NOT_CONFIGURED' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [to],
        subject,
        html,
        text,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error(`Email send failed (${res.status}), non-fatal:`, detail.slice(0, 200));
      return { sent: false, reason: `HTTP_${res.status}` };
    }
    return { sent: true };
  } catch (err) {
    // Includes the abort on timeout. Deliberately swallowed.
    console.error('Email send failed (non-fatal):', err.name === 'AbortError' ? 'timed out' : err.message);
    return { sent: false, reason: err.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK' };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { sendEmail, isConfigured };
