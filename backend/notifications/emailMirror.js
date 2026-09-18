/**
 * Reaching someone who is not looking at the tab.
 *
 * This product's entire value is that someone finds you. Until now, if a
 * person read your spark and said they wanted in, you found out only by
 * opening CapForge and noticing. If you did not open it for three days, you
 * did not know for three days, and by then they had moved on. For a
 * marketplace, that is the difference between a match and a missed one.
 *
 * WHY THIS IS SELECTIVE, AND NOT "EMAIL EVERY NOTIFICATION"
 * The fastest way to make email worthless is to send too much of it. Someone
 * who gets a message for every chat line stops reading all of them, including
 * the one that mattered. So only events that are RARE, TIME-SENSITIVE and
 * about another human deciding something about you are sent.
 *
 * Deliberately excluded: NEW_MESSAGE, because a message per chat line is
 * spam and the conversation-opened event already covers the case that
 * matters. Also excluded are anything the person did themselves and anything
 * a background job produced.
 *
 * FOUR GATES, all of which must pass:
 *   1. The event type is on the allowlist below.
 *   2. The address is verified, because we cannot reach an unconfirmed one
 *      and sending there risks delivering someone's activity to a stranger
 *      who mistyped their address.
 *   3. The person has not switched that category off in their preferences,
 *      which already existed and was never honoured by anything.
 *   4. Email is configured at all.
 *
 * Failing any gate is silent and harmless. Nothing here can throw into a
 * caller: an in-app notification must never fail because email did.
 */
const pool = require('../shared/db');
const { sendEmail } = require('../shared/email');
const { canEmail } = require('../auth/verificationService');

/**
 * type -> { preference key it respects, subject, what the button says }
 *
 * The preference keys are the ones that already exist on
 * notification_preferences. Inventing new ones would leave the settings page
 * lying about what it controls.
 */
const EMAILABLE = {
  SPARK_RESONANCE: {
    pref: 'connections',
    subject: 'Someone wants in on your idea',
    cta: 'Read what they said',
  },
  SPARK_COMMIT: {
    pref: 'team_updates',
    subject: 'They are in',
    cta: 'See where it stands',
  },
  SPARK_FORMED: {
    pref: 'team_updates',
    subject: 'Your idea is a venture now',
    cta: 'Open your venture',
  },
  TEAM_FORMED: {
    pref: 'team_updates',
    subject: 'You are building this together',
    cta: 'See your team',
  },
  TEAM_CONFIRM_PENDING: {
    pref: 'team_updates',
    subject: 'Waiting on you',
    cta: 'Take a look',
  },
  CONNECTION_REQUEST: {
    pref: 'connections',
    subject: 'Someone reached out',
    cta: 'Read the message',
  },
  INVESTOR_CONNECTION_REQUEST: {
    pref: 'connections',
    subject: 'An investor reached out',
    cta: 'Read the message',
  },
};

function appUrl() {
  return process.env.APP_URL || 'http://localhost:5173';
}

/** Where the button should land, from the notification's own reference. */
function linkFor(referenceType, referenceId) {
  const base = appUrl();
  switch (referenceType) {
    case 'conversation': return `${base}/app/inbox/${referenceId}`;
    case 'SPARK': return `${base}/app/sparks/${referenceId}`;
    case 'STARTUP': return `${base}/app/startups/${referenceId}`;
    default: return `${base}/app`;
  }
}

async function prefersEmail(userId, prefKey) {
  try {
    const r = await pool.query(
      `SELECT ${prefKey} AS allowed FROM notification_preferences WHERE user_id = $1`,
      [userId]
    );
    // No row means defaults, and the defaults are on for everything this
    // sends. Absence of a preference is not a refusal.
    if (r.rows.length === 0) return true;
    return r.rows[0].allowed !== false;
  } catch (err) {
    console.error('Preference check failed (non-fatal, defaulting to send):', err.message);
    return true;
  }
}

/**
 * Mirror one notification to email if it qualifies. Always resolves.
 */
async function mirrorToEmail(userId, { type, title, message, referenceType, referenceId }) {
  try {
    const spec = EMAILABLE[type];
    if (!spec) return { sent: false, reason: 'NOT_EMAILABLE' };

    const address = await canEmail(userId);
    if (!address) return { sent: false, reason: 'UNVERIFIED' };

    if (!(await prefersEmail(userId, spec.pref))) return { sent: false, reason: 'OPTED_OUT' };

    const link = linkFor(referenceType, referenceId);
    const body = message || title;

    const result = await sendEmail({
      to: address,
      subject: spec.subject,
      text: `${title}\n\n${body}\n\n${spec.cta}: ${link}\n\nYou can turn these off in Settings.`,
      html: `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;color:#1a1825;line-height:1.6">
  <p style="font-size:17px;font-weight:600;margin:0 0 10px">${title}</p>
  <p style="font-size:15px;margin:0 0 26px">${body}</p>
  <p style="margin:0 0 26px">
    <a href="${link}" style="background:#1a1825;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-size:15px;font-weight:500">${spec.cta}</a>
  </p>
  <p style="font-size:12.5px;color:#6E7079;margin:0">You can turn these off in Settings.</p>
</div>`,
    });

    return result;
  } catch (err) {
    // An in-app notification must never fail because email did.
    console.error('Email mirror failed (non-fatal):', err.message);
    return { sent: false, reason: 'ERROR' };
  }
}

module.exports = { mirrorToEmail, EMAILABLE };
