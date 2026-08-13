/**
 * AUTH-001 through AUTH-007 (SRS §7)
 * Registration, login, session (JWT), password hashing.
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../shared/db');

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = '7d';

const VALID_ROLES = ['FOUNDER', 'CONTRIBUTOR', 'INVESTOR'];

/**
 * AUTH-001/002: Register a new user.
 * Per SRS §3.2: duplicate email must be rejected, failed registration
 * must not create a partial account (uses a transaction).
 */
async function register({ email, password, primaryRole, displayName }) {
  if (!email || !email.includes('@')) {
    return { success: false, error: 'INVALID_EMAIL' };
  }
  if (!password || password.length < 8) {
    return { success: false, error: 'WEAK_PASSWORD', detail: 'Password must be at least 8 characters' };
  }
  if (!VALID_ROLES.includes(primaryRole)) {
    return { success: false, error: 'INVALID_ROLE' };
  }
  if (!displayName || displayName.trim().length === 0) {
    return { success: false, error: 'MISSING_DISPLAY_NAME' };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return { success: false, error: 'EMAIL_ALREADY_EXISTS' };
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, primary_role) VALUES ($1, $2, $3) RETURNING id, email, primary_role, created_at`,
      [email.toLowerCase(), passwordHash, primaryRole]
    );
    const user = userResult.rows[0];

    await client.query(
      `INSERT INTO profiles (user_id, display_name) VALUES ($1, $2)`,
      [user.id, displayName.trim()]
    );

    await client.query('COMMIT');

    const token = signToken(user);
    return { success: true, user: { id: user.id, email: user.email, primaryRole: user.primary_role }, token };
  } catch (err) {
    await client.query('ROLLBACK');
    return { success: false, error: 'REGISTRATION_FAILED', detail: err.message };
  } finally {
    client.release();
  }
}

/**
 * AUTH-003: Authenticate an existing user.
 */
async function login({ email, password }) {
  if (!email || !password) {
    return { success: false, error: 'MISSING_CREDENTIALS' };
  }

  const result = await pool.query(
    'SELECT id, email, password_hash, primary_role FROM users WHERE email = $1',
    [email.toLowerCase()]
  );

  if (result.rows.length === 0) {
    return { success: false, error: 'INVALID_CREDENTIALS' }; // don't leak which part was wrong
  }

  const user = result.rows[0];
  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    return { success: false, error: 'INVALID_CREDENTIALS' };
  }

  await pool.query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id]);

  const token = signToken(user);
  return { success: true, user: { id: user.id, email: user.email, primaryRole: user.primary_role }, token };
}

function signToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.primary_role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * AUTH-004/005: Verify a session token, used by auth middleware.
 */
function verifyToken(token) {
  try {
    return { valid: true, payload: jwt.verify(token, JWT_SECRET) };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

module.exports = { register, login, verifyToken };
