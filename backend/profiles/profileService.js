/**
 * Profile management (SRS §12: Profile Requirements) +
 * Contributor/Investor onboarding (SRS §10, §11).
 */
const pool = require('../shared/db');

/**
 * Computes profile completeness as a real percentage based on which
 * fields are actually filled — not decorative (SRS §12).
 */
function calculateCompleteness(profile, roleProfile, role) {
  const coreFields = ['display_name', 'headline', 'bio', 'location', 'profile_image'];
  let filled = coreFields.filter(f => profile[f] && String(profile[f]).trim().length > 0).length;
  let total = coreFields.length;

  if (role === 'CONTRIBUTOR' && roleProfile) {
    const fields = ['availability', 'commitment_type', 'experience_years', 'portfolio_url'];
    filled += fields.filter(f => roleProfile[f]).length;
    total += fields.length;
    filled += (roleProfile.preferred_stage?.length > 0) ? 1 : 0;
    filled += (roleProfile.preferred_domains?.length > 0) ? 1 : 0;
    total += 2;
  }

  if (role === 'INVESTOR' && roleProfile) {
    const fields = ['thesis', 'ticket_min', 'ticket_max', 'investment_type'];
    filled += fields.filter(f => roleProfile[f]).length;
    total += fields.length;
    filled += (roleProfile.preferred_stages?.length > 0) ? 1 : 0;
    filled += (roleProfile.preferred_domains?.length > 0) ? 1 : 0;
    total += 2;
  }

  return Math.round((filled / total) * 100);
}

async function getMyProfile(userId, role) {
  const profileResult = await pool.query('SELECT * FROM profiles WHERE user_id = $1', [userId]);
  if (profileResult.rows.length === 0) {
    return { success: false, error: 'PROFILE_NOT_FOUND' };
  }
  const profile = profileResult.rows[0];

  let roleProfile = null;
  if (role === 'CONTRIBUTOR') {
    const r = await pool.query('SELECT * FROM contributor_profiles WHERE profile_id = $1', [profile.id]);
    roleProfile = r.rows[0] || null;
  } else if (role === 'INVESTOR') {
    const r = await pool.query('SELECT * FROM investor_profiles WHERE profile_id = $1', [profile.id]);
    roleProfile = r.rows[0] || null;
  }

  const completeness = calculateCompleteness(profile, roleProfile, role);

  // Keep the stored score in sync with the real calculation.
  if (completeness !== profile.completion_score) {
    await pool.query('UPDATE profiles SET completion_score = $1, updated_at = now() WHERE id = $2', [completeness, profile.id]);
  }

  return { success: true, profile: { ...profile, completion_score: completeness }, roleProfile };
}

async function updateBaseProfile(userId, updates) {
  const allowed = ['display_name', 'headline', 'bio', 'location', 'profile_image', 'skills'];
  const fields = Object.keys(updates).filter(k => allowed.includes(k));
  if (fields.length === 0) return { success: false, error: 'NO_VALID_FIELDS' };

  const setClauses = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map(f => updates[f]);

  const result = await pool.query(
    `UPDATE profiles SET ${setClauses}, updated_at = now() WHERE user_id = $1 RETURNING *`,
    [userId, ...values]
  );
  if (result.rows.length === 0) return { success: false, error: 'PROFILE_NOT_FOUND' };
  return { success: true, profile: result.rows[0] };
}

/**
 * SRS §10: Contributor onboarding — creates or updates the
 * contributor_profiles row for the authenticated user.
 */
async function upsertContributorProfile(userId, data) {
  const profileResult = await pool.query('SELECT id FROM profiles WHERE user_id = $1', [userId]);
  if (profileResult.rows.length === 0) return { success: false, error: 'PROFILE_NOT_FOUND' };
  const profileId = profileResult.rows[0].id;

  const { availability, commitmentType, preferredStage, preferredDomains, experienceYears, equityPreference, portfolioUrl } = data;

  const result = await pool.query(
    `INSERT INTO contributor_profiles (profile_id, availability, commitment_type, preferred_stage, preferred_domains, experience_years, equity_preference, portfolio_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (profile_id) DO UPDATE SET
       availability = EXCLUDED.availability,
       commitment_type = EXCLUDED.commitment_type,
       preferred_stage = EXCLUDED.preferred_stage,
       preferred_domains = EXCLUDED.preferred_domains,
       experience_years = EXCLUDED.experience_years,
       equity_preference = EXCLUDED.equity_preference,
       portfolio_url = EXCLUDED.portfolio_url
     RETURNING *`,
    [profileId, availability, commitmentType, preferredStage || [], preferredDomains || [], experienceYears, equityPreference, portfolioUrl]
  );
  return { success: true, contributorProfile: result.rows[0] };
}

/**
 * SRS §11: Investor onboarding.
 */
async function upsertInvestorProfile(userId, data) {
  const profileResult = await pool.query('SELECT id FROM profiles WHERE user_id = $1', [userId]);
  if (profileResult.rows.length === 0) return { success: false, error: 'PROFILE_NOT_FOUND' };
  const profileId = profileResult.rows[0].id;

  const { thesis, ticketMin, ticketMax, preferredStages, preferredDomains, preferredGeographies, investmentType } = data;

  const result = await pool.query(
    `INSERT INTO investor_profiles (profile_id, thesis, ticket_min, ticket_max, preferred_stages, preferred_domains, preferred_geographies, investment_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (profile_id) DO UPDATE SET
       thesis = EXCLUDED.thesis,
       ticket_min = EXCLUDED.ticket_min,
       ticket_max = EXCLUDED.ticket_max,
       preferred_stages = EXCLUDED.preferred_stages,
       preferred_domains = EXCLUDED.preferred_domains,
       preferred_geographies = EXCLUDED.preferred_geographies,
       investment_type = EXCLUDED.investment_type
     RETURNING *`,
    [profileId, thesis, ticketMin, ticketMax, preferredStages || [], preferredDomains || [], preferredGeographies || [], investmentType]
  );
  return { success: true, investorProfile: result.rows[0] };
}

module.exports = { getMyProfile, updateBaseProfile, upsertContributorProfile, upsertInvestorProfile };
