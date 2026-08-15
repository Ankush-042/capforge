/**
 * Sprint 12 — Security Hardening: rate limiting.
 * Ref: TRD §79, architecture doc §96. In-memory, no extra dependency —
 * sufficient for this deployment scale; documented limitation: resets
 * on server restart and doesn't share state across multiple instances.
 */
const buckets = new Map();

function rateLimit({ windowMs, max }) {
  return (req, res, next) => {
    const key = `${req.ip}:${req.baseUrl}${req.path}`;
    const now = Date.now();
    const bucket = buckets.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > bucket.resetAt) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }
    bucket.count++;
    buckets.set(key, bucket);

    if (bucket.count > max) {
      return res.status(429).json({ error: 'RATE_LIMITED', retryAfterMs: bucket.resetAt - now });
    }
    next();
  };
}

// TRD §79: AI endpoints need particularly strong controls to prevent
// accidental or malicious cost escalation.
const aiEndpointLimit = rateLimit({ windowMs: 60000, max: 10 });
const authLimit = rateLimit({ windowMs: 60000, max: 20 });
const generalLimit = rateLimit({ windowMs: 60000, max: 100 });

module.exports = { rateLimit, aiEndpointLimit, authLimit, generalLimit };
