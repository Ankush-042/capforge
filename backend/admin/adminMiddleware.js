const pool = require('../shared/db');

async function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'UNAUTHENTICATED' });
  const result = await pool.query('SELECT is_admin FROM users WHERE id = $1', [req.user.userId]);
  if (result.rows.length === 0 || !result.rows[0].is_admin) {
    return res.status(403).json({ error: 'FORBIDDEN', message: 'Admin access required.' });
  }
  next();
}
module.exports = { requireAdmin };
