/**
 * Email verification.
 *
 * THE POLICY, repeated here because it is the thing most likely to be
 * misread by someone changing this file later:
 *
 *   Verification exists and works. Verification blocks NOTHING. No route
 *   checks email_verified. No feature is gated. No badge is displayed.
 *
 * Its single purpose is knowing whether we can reach someone, so that
 * notifications go only to addresses that have actually been confirmed.
 * Sending to an unconfirmed address is at best pointless, and at worst
 * delivers someone's activity to a stranger whose address they mistyped.
 *
 * Enforcement, if it is ever wanted, is a policy change at the call sites.
 * It is deliberately not baked in here.
 */
const crypto = require('crypto');
const pool = require('../shared/db');
const { sendEmail } = require('../shared/email');

const TOKEN_TTL_HOURS = 48;

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function appUrl() {
  // Falls back to localhost so a link is always well-formed in development
  // rather than producing "undefined/verify?token=..." in someone's inbox.
  return process.env.APP_URL || 'http://localhost:5173';
}

/**
 * Issue a token and try to send it. Always resolves.
 *
 * Returns whether the email went out, which the caller may surface, but a
 * false here is never an error: the account is already created and fully
 * usable regardless.
 */
async function sendVerificationEmail(userId, email, displayName) {
  try {
    // One live token per user. Issuing a new link should invalidate the old
    // one, otherwise every link ever sent stays valid for 48 hours.
    await pool.query(
      `UPDATE email_verification_tokens SET used_at = now()
       WHERE user_id = $1 AND used_at IS NULL`,
      [userId]
    );

    const raw = crypto.randomBytes(32).toString('hex');
    await pool.query(
      `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, now() + interval '${TOKEN_TTL_HOURS} hours')`,
      [userId, hashToken(raw)]
    );

    const link = `${appUrl()}/verify-email?token=${raw}`;
    const name = displayName || 'there';

    const result = await sendEmail({
      to: email,
      subject: 'Confirm your email for CapForge',
      text: `Hi ${name},\n\nConfirm this address so CapForge can tell you when someone wants in on what you are building:\n\n${link}\n\nThis link works for ${TOKEN_TTL_HOURS} hours. You can keep using CapForge either way — nothing is locked.\n\nIf you did not sign up, ignore this.`,
      html: `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;color:#1a1825;line-height:1.6">
  <p style="font-size:16px">Hi ${name},</p>
  <p style="font-size:15px">Confirm this address so CapForge can tell you when someone wants in on what you are building.</p>
  <p style="margin:28px 0">
    <a href="${link}" style="background:#1a1825;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-size:15px;font-weight:500">Confirm my email</a>
  </p>
  <p style="font-size:13px;color:#6E7079">This link works for ${TOKEN_TTL_HOURS} hours. You can keep using CapForge either way, nothing is locked.</p>
  <p style="font-size:13px;color:#6E7079">If you did not sign up, ignore this.</p>
</div>`,
    });

    return { issued: true, emailSent: result.sent, reason: result.reason };
  } catch (err) {
    // Issuing a token must never break a signup that has already succeeded.
    console.error('Verification email step failed (non-fatal):', err.message);
    return { issued: false, emailSent: false, reason: 'TOKEN_ISSUE_FAILED' };
  }
}

/**
 * Confirm a token. Deliberately specific about WHY it failed, because
 * "invalid link" when the real problem is "you already used this" is the kind
 * of message that makes someone think the product is broken.
 */
async function verifyToken(rawToken) {
  if (!rawToken || typeof rawToken !== 'string' || rawToken.length < 32) {
    return { success: false, error: 'MALFORMED' };
  }

  const row = await pool.query(
    `SELECT t.*, u.email, u.email_verified
     FROM email_verification_tokens t
     JOIN users u ON u.id = t.user_id
     WHERE t.token_hash = $1`,
    [hashToken(rawToken)]
  );
  if (row.rows.length === 0) return { success: false, error: 'NOT_FOUND' };

  const t = row.rows[0];

  // Already verified by an earlier link is a SUCCESS, not a failure. Telling
  // someone their confirmed account is invalid because they clicked twice is
  // just wrong.
  if (t.email_verified) return { success: true, alreadyVerified: true, email: t.email };

  if (t.used_at) return { success: false, error: 'ALREADY_USED' };
  if (new Date(t.expires_at) < new Date()) return { success: false, error: 'EXPIRED' };

  await pool.query('BEGIN');
  try {
    await pool.query(
      `UPDATE users SET email_verified = true, email_verified_at = now() WHERE id = $1`,
      [t.user_id]
    );
    await pool.query(`UPDATE email_verification_tokens SET used_at = now() WHERE id = $1`, [t.id]);
    await pool.query('COMMIT');
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Verification commit failed:', err.message);
    return { success: false, error: 'FAILED' };
  }

  return { success: true, alreadyVerified: false, email: t.email };
}

/** Whether we can actually reach this person. The only real use of the flag. */
async function canEmail(userId) {
  const r = await pool.query(`SELECT email, email_verified FROM users WHERE id = $1`, [userId]);
  const u = r.rows[0];
  return u && u.email_verified ? u.email : null;
}

module.exports = { sendVerificationEmail, verifyToken, canEmail };
