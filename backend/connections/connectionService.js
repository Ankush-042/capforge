/**
 * Connections + Team Formation + State Propagation.
 * Ref: App Flow §4.8-4.9, SRS §43-48, TRD §37 & §106 Rule 3 ("no
 * disconnected modules"): team change MUST recalculate gaps, gaps MUST
 * recalculate readiness. This module is where that chain is enforced,
 * not left as an aspiration in the docs.
 */
const pool = require('../shared/db');
const { runGapDiagnosis } = require('../gaps/gapDiagnosisService');
const { runReadinessAndRiskAnalysis } = require('../readiness/readinessService');
const { createNotification } = require('../notifications/notificationService');

/**
 * SRS §43: founder sends a connection request to a contributor, optionally
 * tied to a specific gap (so acceptance can fill that exact role).
 */
async function sendConnectionRequest(senderId, { receiverId, startupId, sourceGapId, message }) {
  if (!receiverId || !startupId) {
    return { success: false, error: 'MISSING_REQUIRED_FIELDS' };
  }
  if (senderId === receiverId) {
    return { success: false, error: 'CANNOT_CONNECT_TO_SELF' };
  }

  const startupResult = await pool.query('SELECT founder_id FROM startups WHERE id = $1', [startupId]);
  if (startupResult.rows.length === 0) return { success: false, error: 'STARTUP_NOT_FOUND' };
  if (startupResult.rows[0].founder_id !== senderId) return { success: false, error: 'NOT_STARTUP_OWNER' };

  const receiverResult = await pool.query('SELECT primary_role FROM users WHERE id = $1', [receiverId]);
  if (receiverResult.rows.length === 0) return { success: false, error: 'RECEIVER_NOT_FOUND' };
  if (receiverResult.rows[0].primary_role !== 'CONTRIBUTOR') {
    return { success: false, error: 'RECEIVER_NOT_A_CONTRIBUTOR' };
  }

  const alreadyMember = await pool.query(
    'SELECT id FROM startup_team_members WHERE startup_id = $1 AND user_id = $2',
    [startupId, receiverId]
  );
  if (alreadyMember.rows.length > 0) {
    return { success: false, error: 'ALREADY_ON_TEAM' };
  }

  try {
    const result = await pool.query(
      `INSERT INTO connections (sender_id, receiver_id, startup_id, source_gap_id, type, message, status)
       VALUES ($1, $2, $3, $4, 'FOUNDER_CONTRIBUTOR', $5, 'PENDING') RETURNING *`,
      [senderId, receiverId, startupId, sourceGapId || null, message || null]
    );
    const startupNameResult = await pool.query('SELECT name FROM startups WHERE id = $1', [startupId]);
    await createNotification(receiverId, {
      type: 'CONNECTION_REQUEST',
      title: 'New connection request',
      message: `${startupNameResult.rows[0]?.name || 'A startup'} wants to connect with you.`,
      referenceType: 'connection',
      referenceId: result.rows[0].id
    });
    return { success: true, connection: result.rows[0] };
  } catch (err) {
    // The partial unique index (migration 006) is the actual enforcement;
    // this just turns the constraint violation into a clean API error.
    if (err.code === '23505') {
      return { success: false, error: 'DUPLICATE_PENDING_REQUEST' };
    }
    return { success: false, error: 'REQUEST_FAILED', detail: err.message };
  }
}

/**
 * SRS §44-46: contributor accepts or rejects. Acceptance is where the
 * ENTIRE propagation chain fires — this is the core system test (SRS §102).
 */
/**
 * App Flow §6.5, SRS §51: investor initiates a connection with a startup's
 * founder. Reverse direction from the contributor flow (investor is the
 * sender, founder is the receiver) but the same connections table and
 * duplicate-prevention constraint (migration 006's partial unique index
 * has no type filter, so it protects this flow too, for free).
 */
async function sendInvestorConnectionRequest(investorId, { startupId, message }) {
  if (!startupId) return { success: false, error: 'MISSING_STARTUP_ID' };

  const senderResult = await pool.query('SELECT primary_role FROM users WHERE id = $1', [investorId]);
  if (senderResult.rows.length === 0 || senderResult.rows[0].primary_role !== 'INVESTOR') {
    return { success: false, error: 'SENDER_NOT_AN_INVESTOR' };
  }

  const startupResult = await pool.query(
    `SELECT founder_id FROM startups WHERE id = $1 AND status = 'ACTIVE' AND visibility = 'DISCOVERABLE'`,
    [startupId]
  );
  if (startupResult.rows.length === 0) return { success: false, error: 'STARTUP_NOT_FOUND_OR_NOT_DISCOVERABLE' };
  const founderId = startupResult.rows[0].founder_id;

  try {
    const result = await pool.query(
      `INSERT INTO connections (sender_id, receiver_id, startup_id, type, message, status)
       VALUES ($1, $2, $3, 'FOUNDER_INVESTOR', $4, 'PENDING') RETURNING *`,
      [investorId, founderId, startupId, message || null]
    );
    const startupNameResult = await pool.query('SELECT name FROM startups WHERE id = $1', [startupId]);
    await createNotification(founderId, {
      type: 'INVESTOR_CONNECTION_REQUEST',
      title: 'Investor interested in your startup',
      message: `An investor wants to connect regarding ${startupNameResult.rows[0]?.name || 'your startup'}.`,
      referenceType: 'connection',
      referenceId: result.rows[0].id
    });
    return { success: true, connection: result.rows[0] };
  } catch (err) {
    if (err.code === '23505') return { success: false, error: 'DUPLICATE_PENDING_REQUEST' };
    return { success: false, error: 'REQUEST_FAILED', detail: err.message };
  }
}

async function respondToConnection(connectionId, respondingUserId, action) {
  if (!['accept', 'reject'].includes(action)) {
    return { success: false, error: 'INVALID_ACTION' };
  }

  const connResult = await pool.query('SELECT * FROM connections WHERE id = $1', [connectionId]);
  if (connResult.rows.length === 0) return { success: false, error: 'CONNECTION_NOT_FOUND' };
  const connection = connResult.rows[0];

  if (connection.receiver_id !== respondingUserId) {
    return { success: false, error: 'NOT_AUTHORIZED', detail: 'Only the recipient can respond to this request.' };
  }
  if (connection.status !== 'PENDING') {
    return { success: false, error: 'ALREADY_RESOLVED', detail: `Connection is already ${connection.status}.` };
  }

  if (action === 'reject') {
    const r = await pool.query(
      `UPDATE connections SET status = 'REJECTED', updated_at = now() WHERE id = $1 RETURNING *`,
      [connectionId]
    );
    await createNotification(connection.sender_id, {
      type: 'CONNECTION_REJECTED',
      title: 'Connection request declined',
      message: 'Your connection request was declined.',
      referenceType: 'connection',
      referenceId: connectionId
    });
    return { success: true, connection: r.rows[0], propagation: null };
  }

  // FOUNDER_INVESTOR acceptance: no team membership, no gap/readiness
  // propagation — an investor connecting is not a contributor joining
  // the venture. Simple state transition only.
  if (connection.type === 'FOUNDER_INVESTOR') {
    const r = await pool.query(
      `UPDATE connections SET status = 'ACCEPTED', updated_at = now() WHERE id = $1 RETURNING *`,
      [connectionId]
    );
    await createNotification(connection.sender_id, {
      type: 'CONNECTION_ACCEPTED',
      title: 'Connection request accepted',
      message: 'Your connection request was accepted.',
      referenceType: 'connection',
      referenceId: connectionId
    });
    return { success: true, connection: r.rows[0], propagation: null };
  }

  // action === 'accept', type === FOUNDER_CONTRIBUTOR — the full propagation chain.
  // Phase 1: the transactional part (team membership, connection status,
  // recommendation status) — atomic, rolls back cleanly on failure.
  const client = await pool.connect();
  let updatedConnRow, assignedRole;
  try {
    await client.query('BEGIN');

    const updatedConn = await client.query(
      `UPDATE connections SET status = 'ACCEPTED', updated_at = now() WHERE id = $1 RETURNING *`,
      [connectionId]
    );
    updatedConnRow = updatedConn.rows[0];

    if (connection.source_gap_id) {
      const gapResult = await client.query('SELECT role FROM gaps WHERE id = $1', [connection.source_gap_id]);
      assignedRole = gapResult.rows[0]?.role;
    }
    if (!assignedRole) {
      const profileResult = await client.query(
        `SELECT p.headline FROM profiles p WHERE p.user_id = $1`, [connection.receiver_id]
      );
      assignedRole = profileResult.rows[0]?.headline || 'Contributor';
    }

    const profileForSkills = await client.query(
      `SELECT skills FROM profiles WHERE user_id = $1`, [connection.receiver_id]
    );

    await client.query(
      `INSERT INTO startup_team_members (startup_id, user_id, role, skills, is_founder)
       VALUES ($1, $2, $3, $4, false)
       ON CONFLICT (startup_id, user_id) DO UPDATE SET role = EXCLUDED.role, skills = EXCLUDED.skills`,
      [connection.startup_id, connection.receiver_id, assignedRole, profileForSkills.rows[0]?.skills || []]
    );

    if (connection.source_gap_id) {
      await client.query(
        `UPDATE recommendations SET status = 'CONNECTED'
         WHERE source_gap_id = $1 AND target_user_id = $2`,
        [connection.source_gap_id, connection.receiver_id]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    client.release();
    return { success: false, error: 'ACCEPTANCE_FAILED', detail: err.message };
  }
  client.release();

  await createNotification(connection.sender_id, {
    type: 'TEAM_MEMBER_JOINED',
    title: 'New team member joined',
    message: `Your connection request was accepted — they've joined the ${assignedRole} role.`,
    referenceType: 'connection',
    referenceId: connectionId
  });

  // Phase 2: propagation (team changed -> gaps recalculate -> readiness
  // recalculates). Deliberately OUTSIDE the transaction and in its own
  // try/catch — these are separate logical operations (architecture doc
  // §67), and by this point the team-membership change is already
  // durably committed, so a failure here must never be treated as a
  // reason to roll back something that already succeeded.
  let gapResult, readinessResult;
  try {
    gapResult = await runGapDiagnosis(connection.startup_id);
    readinessResult = await runReadinessAndRiskAnalysis(connection.startup_id);
  } catch (err) {
    return {
      success: true,
      connection: updatedConnRow,
      propagation: {
        team_member_added: { user_id: connection.receiver_id, role: assignedRole },
        warning: 'Team membership was saved, but automatic gap/readiness recalculation failed. Re-run analysis manually.',
        error_detail: err.message
      }
    };
  }

  return {
    success: true,
    connection: updatedConnRow,
    propagation: {
      team_member_added: { user_id: connection.receiver_id, role: assignedRole },
      gaps_recalculated: gapResult.success ? gapResult.gaps : null,
      readiness_recalculated: readinessResult.success ? readinessResult.readiness : null
    }
  };
}

async function getMyConnections(userId) {
  const result = await pool.query(
    `SELECT c.*, s.name as startup_name,
            sender.email as sender_email, receiver.email as receiver_email
     FROM connections c
     JOIN startups s ON s.id = c.startup_id
     JOIN users sender ON sender.id = c.sender_id
     JOIN users receiver ON receiver.id = c.receiver_id
     WHERE c.sender_id = $1 OR c.receiver_id = $1
     ORDER BY c.created_at DESC`,
    [userId]
  );
  return { success: true, connections: result.rows };
}

module.exports = { sendConnectionRequest, sendInvestorConnectionRequest, respondToConnection, getMyConnections };
