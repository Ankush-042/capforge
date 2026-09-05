/**
 * AI-17 — Skill Demand Aggregation. Named in the AI spec but never
 * actually built until now — this is genuinely new backend logic, not
 * a wiring exercise. Aggregates real, currently-open gaps across the
 * whole platform to answer "what skills are in demand right now" for
 * a contributor, and compares against their own stated skills.
 */
const pool = require('../shared/db');

async function getSkillDemand(userId) {
  // Real aggregation: every currently-open (non-FILLED) gap's required
  // skills, counted by frequency and weighted by priority.
  const result = await pool.query(
    `SELECT required_skills, priority_level FROM gaps WHERE status != 'FILLED'`
  );

  const PRIORITY_WEIGHT = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  const demand = {};

  for (const row of result.rows) {
    const weight = PRIORITY_WEIGHT[row.priority_level] || 1;
    for (const skill of row.required_skills || []) {
      const key = skill.toLowerCase().trim();
      demand[key] = (demand[key] || 0) + weight;
    }
  }

  const profileResult = await pool.query(`SELECT skills FROM profiles WHERE user_id = $1`, [userId]);
  const mySkills = new Set((profileResult.rows[0]?.skills || []).map((s) => s.toLowerCase().trim()));

  const ranked = Object.entries(demand)
    .map(([skill, score]) => ({
      skill,
      score,
      demandLevel: score >= 8 ? 'HIGH' : score >= 4 ? 'MEDIUM' : 'LOW',
      haveIt: mySkills.has(skill)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  return { success: true, skills: ranked };
}

module.exports = { getSkillDemand };
