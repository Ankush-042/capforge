/**
 * AUTH-005/007 (SRS §7): authorization middleware.
 * Blocks access to protected routes without a valid session,
 * attaches the authenticated user's identity to the request.
 */
const { verifyToken } = require('./authService');

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'UNAUTHENTICATED', message: 'Missing or malformed Authorization header' });
  }

  const token = authHeader.slice('Bearer '.length);
  const result = verifyToken(token);
  if (!result.valid) {
    return res.status(401).json({ error: 'INVALID_TOKEN', message: result.error });
  }

  req.user = result.payload; // { userId, email, role }
  next();
}

/**
 * Restricts a route to specific persona roles.
 * Usage: requireRole('FOUNDER')
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'UNAUTHENTICATED' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'FORBIDDEN', message: `Requires role: ${allowedRoles.join(' or ')}` });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
