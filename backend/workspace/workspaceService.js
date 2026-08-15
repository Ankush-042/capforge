/**
 * Ref: TRD §45-46, SRS §64-66. Authorization is TEAM-MEMBERSHIP based,
 * not just startup ownership — founder AND accepted contributors both
 * get access, no one else (architecture doc §85, App Flow §9.1).
 */
const pool = require('../shared/db');

async function isTeamMember(startupId, userId) {
  const founderCheck = await pool.query('SELECT id FROM startups WHERE id = $1 AND founder_id = $2', [startupId, userId]);
  if (founderCheck.rows.length > 0) return true;
  const memberCheck = await pool.query('SELECT id FROM startup_team_members WHERE startup_id = $1 AND user_id = $2', [startupId, userId]);
  return memberCheck.rows.length > 0;
}

async function getOrCreateWorkspace(startupId) {
  const existing = await pool.query('SELECT * FROM workspaces WHERE startup_id = $1', [startupId]);
  if (existing.rows.length > 0) return existing.rows[0];
  const created = await pool.query('INSERT INTO workspaces (startup_id) VALUES ($1) RETURNING *', [startupId]);
  return created.rows[0];
}

async function getWorkspace(startupId, userId) {
  if (!(await isTeamMember(startupId, userId))) return { success: false, error: 'NOT_AUTHORIZED' };
  const workspace = await getOrCreateWorkspace(startupId);
  const tasks = await pool.query('SELECT * FROM tasks WHERE workspace_id = $1 ORDER BY created_at DESC', [workspace.id]);
  const discussions = await pool.query('SELECT * FROM discussions WHERE workspace_id = $1 ORDER BY created_at DESC', [workspace.id]);
  return { success: true, workspace, tasks: tasks.rows, discussions: discussions.rows };
}

async function createTask(startupId, userId, { title, description, assignedTo, priority, dueDate }) {
  if (!(await isTeamMember(startupId, userId))) return { success: false, error: 'NOT_AUTHORIZED' };
  const workspace = await getOrCreateWorkspace(startupId);
  const result = await pool.query(
    `INSERT INTO tasks (workspace_id, created_by, assigned_to, title, description, priority, due_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [workspace.id, userId, assignedTo || null, title, description || null, priority || 'MEDIUM', dueDate || null]
  );
  return { success: true, task: result.rows[0] };
}

async function updateTask(taskId, userId, updates) {
  const taskCheck = await pool.query(
    `SELECT t.*, w.startup_id FROM tasks t JOIN workspaces w ON w.id = t.workspace_id WHERE t.id = $1`, [taskId]
  );
  if (taskCheck.rows.length === 0) return { success: false, error: 'NOT_FOUND' };
  if (!(await isTeamMember(taskCheck.rows[0].startup_id, userId))) return { success: false, error: 'NOT_AUTHORIZED' };

  const allowed = ['title', 'description', 'status', 'priority', 'due_date', 'assigned_to'];
  const fields = Object.keys(updates).filter(k => allowed.includes(k));
  if (fields.length === 0) return { success: false, error: 'NO_VALID_FIELDS' };
  const setClauses = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map(f => updates[f]);

  const result = await pool.query(`UPDATE tasks SET ${setClauses}, updated_at = now() WHERE id = $1 RETURNING *`, [taskId, ...values]);
  return { success: true, task: result.rows[0] };
}

async function postDiscussion(startupId, userId, content) {
  if (!(await isTeamMember(startupId, userId))) return { success: false, error: 'NOT_AUTHORIZED' };
  const workspace = await getOrCreateWorkspace(startupId);
  const result = await pool.query(
    `INSERT INTO discussions (workspace_id, created_by, content) VALUES ($1,$2,$3) RETURNING *`,
    [workspace.id, userId, content]
  );
  return { success: true, discussion: result.rows[0] };
}

module.exports = { isTeamMember, getWorkspace, createTask, updateTask, postDiscussion };
