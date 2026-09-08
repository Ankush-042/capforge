require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function run() {
  console.log('=== Real investor accounts and their actual thesis data ===\n');
  const investors = await pool.query(
    `SELECT u.email, p.display_name, ip.thesis, ip.ticket_min, ip.ticket_max, ip.preferred_domains, ip.preferred_stages
     FROM investor_profiles ip JOIN profiles p ON p.id = ip.profile_id JOIN users u ON u.id = p.user_id`
  );
  for (const row of investors.rows) console.log(row);

  console.log('\n=== Real readiness assessment status for all 13 real startups ===\n');
  const readiness = await pool.query(
    `SELECT s.name, s.verification_status,
            (SELECT overall_score FROM readiness_assessments ra WHERE ra.startup_id = s.id ORDER BY generated_at DESC LIMIT 1) as latest_readiness
     FROM startups s JOIN users u ON u.id = s.founder_id
     WHERE u.email != 'system.import@capforge.internal' AND s.verification_status != 'UNVERIFIED'
     ORDER BY s.name`
  );
  for (const row of readiness.rows) console.log(`${row.name}: readiness = ${row.latest_readiness ?? 'NONE — invisible to investors'}`);

  await pool.end();
  process.exit(0);
}
run();
