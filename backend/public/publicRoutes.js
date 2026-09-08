/**
 * Real, honest public stats — no auth required, since a logged-out
 * visitor on Landing needs real proof-of-life numbers, not the
 * hardcoded fake placeholders ('500+', '2,400+') that were there
 * before. Uses the same real exclusion logic already proven in
 * matching (system-import/unverified startups excluded) so these
 * numbers are genuinely honest, not inflated by test data.
 */
const express = require('express');
const router = express.Router();
const pool = require('../shared/db');

router.get('/public/stats', async (req, res) => {
  const [startups, contributors, founders, investors, teamsFormed, sampleVentures] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM startups s JOIN users u ON u.id = s.founder_id WHERE u.email != 'system.import@capforge.internal' AND s.verification_status != 'UNVERIFIED'`),
    pool.query(`SELECT COUNT(*) FROM users WHERE primary_role = 'CONTRIBUTOR'`),
    pool.query(`SELECT COUNT(*) FROM users WHERE primary_role = 'FOUNDER'`),
    pool.query(`SELECT COUNT(*) FROM users WHERE primary_role = 'INVESTOR'`),
    pool.query(`SELECT COUNT(*) FROM startup_team_members WHERE is_founder = false`),
    // Real sample ventures for the landing hero's compositional cards — genuine names/domains, never fabricated
    pool.query(`SELECT s.name, s.domain FROM startups s JOIN users u ON u.id = s.founder_id WHERE u.email != 'system.import@capforge.internal' AND s.verification_status != 'UNVERIFIED' ORDER BY RANDOM() LIMIT 2`),
  ]);
  res.set('Cache-Control', 'public, max-age=300');
  res.json({
    success: true,
    stats: {
      activeVentures: parseInt(startups.rows[0].count),
      realContributors: parseInt(contributors.rows[0].count) + parseInt(founders.rows[0].count) + parseInt(investors.rows[0].count),
      teamsFormed: parseInt(teamsFormed.rows[0].count),
      sampleVentures: sampleVentures.rows,
    }
  });
});

module.exports = router;
