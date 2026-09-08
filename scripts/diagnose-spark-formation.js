/**
 * Diagnostic: did the spark founding moment actually seed the team?
 *
 * Reported symptom: the venture page appeared, but the Team tab was empty
 * until the separate gap-based team-formation flow was used manually from
 * the Inbox. That should not have been necessary: formVenture is supposed
 * to seed BOTH people as founders at the moment of formation.
 *
 * This tells us which of three things actually happened:
 *   A) The rows were never inserted (formVenture's insert silently failed)
 *   B) The rows exist but is_founder is wrong
 *   C) The rows exist and are correct, so the bug is display-side only
 */
const pool = require('../backend/shared/db');

(async () => {
  const sparks = await pool.query(
    `SELECT s.id, s.title, s.status, s.formed_startup_id, s.author_id, s.created_at
     FROM sparks s WHERE s.status = 'FORMED' ORDER BY s.created_at DESC LIMIT 5`
  );

  if (sparks.rows.length === 0) {
    console.log('No FORMED sparks found at all.');
    process.exit(0);
  }

  for (const spark of sparks.rows) {
    console.log('='.repeat(70));
    console.log(`SPARK: ${spark.title}`);
    console.log(`  status: ${spark.status}`);
    console.log(`  formed_startup_id: ${spark.formed_startup_id || 'NULL  <-- venture was never created'}`);

    if (!spark.formed_startup_id) continue;

    const startup = await pool.query(`SELECT id, name, status, founder_id, current_team_size FROM startups WHERE id = $1`, [spark.formed_startup_id]);
    if (startup.rows.length === 0) {
      console.log('  STARTUP ROW MISSING despite formed_startup_id being set.');
      continue;
    }
    console.log(`  venture: ${startup.rows[0].name} (status ${startup.rows[0].status})`);

    const team = await pool.query(
      `SELECT tm.user_id, tm.role, tm.is_founder, tm.joined_at, u.email, p.display_name
       FROM startup_team_members tm
       JOIN users u ON u.id = tm.user_id
       LEFT JOIN profiles p ON p.user_id = tm.user_id
       WHERE tm.startup_id = $1 ORDER BY tm.joined_at ASC`,
      [spark.formed_startup_id]
    );

    console.log(`  TEAM MEMBERS: ${team.rows.length}`);
    for (const m of team.rows) {
      console.log(`    - ${m.display_name || '(no profile)'} <${m.email}>`);
      console.log(`      role: ${m.role} | is_founder: ${m.is_founder} | joined: ${m.joined_at.toISOString()}`);
    }

    // Who resonated and committed?
    const res = await pool.query(
      `SELECT r.user_id, r.author_committed, r.responder_committed, u.email
       FROM spark_resonances r JOIN users u ON u.id = r.user_id WHERE r.spark_id = $1`,
      [spark.id]
    );
    console.log(`  RESONANCES: ${res.rows.length}`);
    for (const r of res.rows) {
      console.log(`    - ${r.email} | author_committed: ${r.author_committed} | responder_committed: ${r.responder_committed}`);
      const onTeam = team.rows.find(t => t.user_id === r.user_id);
      if (r.author_committed && r.responder_committed) {
        console.log(`      ON TEAM: ${onTeam ? `YES (is_founder: ${onTeam.is_founder})` : 'NO  <-- THIS IS THE BUG'}`);
      }
    }

    // Was the profile lookup the failure point?
    const authorProfile = await pool.query(`SELECT 1 FROM profiles WHERE user_id = $1`, [spark.author_id]);
    console.log(`  author has profile row: ${authorProfile.rows.length > 0}`);
  }

  console.log('='.repeat(70));
  await pool.end();
})();
