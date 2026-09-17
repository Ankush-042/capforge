/**
 * Phase 2: The First Act.
 *
 * A spark is the moment before a startup exists. Everything else in this
 * codebase operates on a structured venture that already has a name, a
 * domain, diagnosed gaps and a readiness score. A spark has none of that on
 * purpose. It is one person's raw statement of what they want to build,
 * published before it is anything official.
 *
 * The founding moment is when a second person reads it and commits. At that
 * point, and only then, the spark becomes a real startup and the existing
 * AI structuring pipeline runs for the first time, with the co-founder
 * seeded onto the team from day one rather than "hired" afterward through
 * gap diagnosis like every other role.
 */
const pool = require('./../shared/db');
const { startOrGetConversation } = require('../conversations/conversationService');
const { createNotification } = require('../notifications/notificationService');

async function createSpark(userId, { title, theIdea, whyMe, lookingFor, tags }) {
  if (!title || !title.trim()) return { success: false, error: 'TITLE_REQUIRED' };
  if (!theIdea || theIdea.trim().length < 40) return { success: false, error: 'IDEA_TOO_SHORT' };

  const result = await pool.query(
    `INSERT INTO sparks (author_id, title, the_idea, why_me, looking_for, tags)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [userId, title.trim(), theIdea.trim(), whyMe?.trim() || null, lookingFor?.trim() || null, tags || []]
  );
  return { success: true, spark: result.rows[0] };
}

/**
 * The spark feed. Deliberately NOT ranked by a matching score: this is
 * vision-first browsing, not skill-matched browsing. Ordering is recency and
 * genuine activity, so a raw idea posted today is as visible as a polished one.
 */

/**
 * Order sparks by what is likely to matter to this person.
 *
 * DELIBERATELY NOT A SCORE SHOWN TO ANYONE. Sparks were designed vision-first:
 * you read an idea and decide for yourself whether it lands, rather than being
 * told it is a 73% match. That is what separates this from a job board, and
 * showing a number here would undo it.
 *
 * So relevance decides ORDER only. It never leaves the server as a percentage,
 * and the feed still reads as browsing rather than ranking.
 *
 * Deterministic on purpose: no LLM call, no embedding lookup, nothing that can
 * rate limit or fail. Opening the feed must never depend on an AI being up.
 */
function sparkRelevance(spark, viewer) {
  if (!viewer) return 0;
  let score = 0;

  const { domainsMatch } = require('../matching/matchingService');

  // The fields the founder wrote about who they hope finds this, against what
  // this person actually does and cares about.
  const tags = (spark.tags || []).map(t => String(t).toLowerCase().trim());
  const domains = (viewer.preferred_domains || []).map(d => String(d).toLowerCase().trim());
  for (const t of tags) {
    if (domains.some(d => domainsMatch(d, t))) { score += 3; break; }
  }

  // "looking_for" on a spark is the founder describing the person they hope
  // reads it. Matching that against the viewer's headline and skills is the
  // most direct signal available.
  const lookingFor = String(spark.looking_for || '').toLowerCase();
  if (lookingFor) {
    const headline = String(viewer.headline || '').toLowerCase();
    const headlineWords = headline.split(/[\s/,-]+/).filter(w => w.length > 3);
    if (headlineWords.some(w => lookingFor.includes(w))) score += 3;

    const skills = (viewer.skills || []).map(sk => String(sk).toLowerCase());
    const hit = skills.filter(sk => sk.length > 3 && lookingFor.includes(sk)).length;
    score += Math.min(hit, 3);
  }

  // The idea itself against the fields they care about, weaker than an
  // explicit tag match but real.
  const idea = `${spark.title || ''} ${spark.the_idea || ''}`.toLowerCase();
  for (const d of domains) {
    if (d.length > 3 && idea.includes(d)) { score += 1; break; }
  }

  return score;
}

async function listSparks({ viewerId, tag, limit = 40 } = {}) {
  const params = [];
  let where = `s.status IN ('OPEN', 'FORMING')`;
  if (tag) { params.push(tag); where += ` AND $${params.length} = ANY(s.tags)`; }

  // SECURITY: viewerId was previously interpolated straight into the SQL
  // string. It comes from a verified JWT so it is a UUID we issued, which
  // makes this low risk in practice, but string-building SQL with a
  // user-derived value is the pattern that causes injection and it does not
  // belong in a codebase regardless of whether this particular instance is
  // exploitable. It is a bound parameter now, like every other value here.
  params.push(viewerId || null);
  const viewerParam = `$${params.length}`;
  params.push(limit);
  const limitParam = `$${params.length}`;

  const result = await pool.query(
    `SELECT s.*, p.display_name AS author_name, p.headline AS author_headline,
            (SELECT COUNT(*) FROM spark_resonances r WHERE r.spark_id = s.id) AS resonance_count,
            CASE WHEN ${viewerParam}::uuid IS NULL THEN false
                 ELSE EXISTS(SELECT 1 FROM spark_resonances r2 WHERE r2.spark_id = s.id AND r2.user_id = ${viewerParam}::uuid)
            END AS viewer_resonated
     FROM sparks s
     JOIN profiles p ON p.user_id = s.author_id
     WHERE ${where}
     ORDER BY s.created_at DESC
     LIMIT ${limitParam}`,
    params
  );

  // Relevance ordering, applied in the application rather than SQL because it
  // reads the viewer's profile and the spark's free text together. Recency
  // remains the tiebreaker, so a quiet day does not bury a good idea and an
  // irrelevant new one does not lead.
  //
  // The relevance value is used to sort and then DISCARDED. It is never part
  // of the response, because a spark feed that shows match percentages stops
  // being a place you read ideas and becomes a job board.
  if (viewerId) {
    const v = await pool.query(
      `SELECT p.headline, p.skills, cp.preferred_domains
       FROM profiles p LEFT JOIN contributor_profiles cp ON cp.profile_id = p.id
       WHERE p.user_id = $1`,
      [viewerId]
    );
    const viewer = v.rows[0];
    if (viewer) {
      const withRelevance = result.rows.map(sp => ({ sp, r: sparkRelevance(sp, viewer) }));
      // Only reorder when there is something to go on. With no signal at all,
      // pure recency is the honest default rather than an arbitrary shuffle.
      if (withRelevance.some(x => x.r > 0)) {
        withRelevance.sort((a, b) => {
          if (b.r !== a.r) return b.r - a.r;
          return new Date(b.sp.created_at) - new Date(a.sp.created_at);
        });
        return { success: true, sparks: withRelevance.map(x => x.sp) };
      }
    }
  }

  return { success: true, sparks: result.rows };
}

/**
 * Record that someone read this spark.
 *
 * A founder posting into silence could not tell whether nobody saw it or fifty
 * people saw it and scrolled past. Those are completely different problems: the
 * first is a distribution problem, the second is a description problem. Without
 * this, the product could not tell them apart, and neither could the founder.
 *
 * One row per person, so it counts people rather than refreshes. Never records
 * the author reading their own, which would make the number a lie.
 * Fire-and-forget: a failed view record must never break reading a spark.
 */
async function recordSparkView(sparkId, viewerId, authorId) {
  if (!viewerId || viewerId === authorId) return;
  try {
    await pool.query(
      `INSERT INTO spark_views (spark_id, viewer_id) VALUES ($1, $2)
       ON CONFLICT (spark_id, viewer_id) DO NOTHING`,
      [sparkId, viewerId]
    );
  } catch (err) {
    console.error('Spark view record failed (non-fatal):', err.message);
  }
}

async function getSpark(sparkId, viewerId) {
  const result = await pool.query(
    `SELECT s.*, p.display_name AS author_name, p.headline AS author_headline, p.bio AS author_bio
     FROM sparks s JOIN profiles p ON p.user_id = s.author_id
     WHERE s.id = $1`,
    [sparkId]
  );
  if (result.rows.length === 0) return { success: false, error: 'NOT_FOUND' };
  const spark = result.rows[0];

  if (viewerId && viewerId !== spark.author_id) {
    // view_count already existed and increments on every open, so it counts
    // refreshes rather than people. Kept, because something else may read it,
    // but the number shown to a founder comes from spark_views, which is one
    // row per person. Telling someone "40 views" when it was four people
    // looking ten times is worse than telling them nothing.
    pool.query(`UPDATE sparks SET view_count = view_count + 1 WHERE id = $1`, [sparkId]).catch(() => {});
    recordSparkView(sparkId, viewerId, spark.author_id);
  }

  // The author sees who resonated. Others only see their own resonance.
  const resonances = await pool.query(
    `SELECT r.*, p.display_name, p.headline FROM spark_resonances r
     JOIN profiles p ON p.user_id = r.user_id
     WHERE r.spark_id = $1 ${viewerId === spark.author_id ? '' : 'AND r.user_id = $2'}
     ORDER BY r.created_at DESC`,
    viewerId === spark.author_id ? [sparkId] : [sparkId, viewerId || null]
  );

  const isAuthor = viewerId === spark.author_id;

  // What actually happened to this spark, for its author only. Silence with
  // numbers is information. Silence without numbers is just despair.
  let reach = null;
  if (isAuthor) {
    const v = await pool.query(`SELECT COUNT(*)::int AS n FROM spark_views WHERE spark_id = $1`, [sparkId]);
    const people = v.rows[0].n;
    const resonated = resonances.rows.length;
    reach = {
      people,
      resonated,
      // The honest diagnosis. These are genuinely different problems and the
      // fix for each is different, so the product should not blur them.
      // Not shown as advice, just as the plain shape of what happened.
      state:
        people === 0 ? 'UNSEEN'
        : resonated > 0 ? 'LANDING'
        : people < 5 ? 'EARLY'
        : 'SEEN_NOT_LANDING',
    };
  }

  return { success: true, spark, resonances: resonances.rows, isAuthor, reach };
}

/**
 * Resonance, not application. No ranking, no accept/reject. It opens a real
 * conversation immediately, because the entire point of the First Act is two
 * people talking, not one person screening the other.
 */
async function resonate(sparkId, userId, message) {
  if (!message || message.trim().length < 20) return { success: false, error: 'MESSAGE_TOO_SHORT' };

  const sparkRes = await pool.query(`SELECT * FROM sparks WHERE id = $1`, [sparkId]);
  if (sparkRes.rows.length === 0) return { success: false, error: 'NOT_FOUND' };
  const spark = sparkRes.rows[0];
  if (spark.author_id === userId) return { success: false, error: 'CANNOT_RESONATE_OWN_SPARK' };
  if (spark.status === 'FORMED') return { success: false, error: 'ALREADY_FORMED' };

  const existing = await pool.query(`SELECT * FROM spark_resonances WHERE spark_id = $1 AND user_id = $2`, [sparkId, userId]);
  if (existing.rows.length > 0) return { success: false, error: 'ALREADY_RESONATED' };

  const convo = await startOrGetConversation(userId, spark.author_id, {});
  if (!convo.success) return convo;

  await pool.query(`UPDATE conversations SET spark_id = $1 WHERE id = $2`, [sparkId, convo.conversation.id]);
  await pool.query(
    `INSERT INTO messages (conversation_id, sender_id, content) VALUES ($1, $2, $3)`,
    [convo.conversation.id, userId, message.trim()]
  );
  await pool.query(`UPDATE conversations SET last_message_at = now() WHERE id = $1`, [convo.conversation.id]);

  const result = await pool.query(
    `INSERT INTO spark_resonances (spark_id, user_id, message, conversation_id)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [sparkId, userId, message.trim(), convo.conversation.id]
  );

  createNotification(spark.author_id, {
    type: 'SPARK_RESONANCE',
    title: 'Someone believes in your idea',
    message: `Someone wants to build "${spark.title}" with you.`,
    referenceType: 'SPARK',
    referenceId: sparkId,
  }).catch(() => {});

  return { success: true, resonance: result.rows[0], conversationId: convo.conversation.id };
}

/**
 * The actual founding moment. When both sides commit, the spark stops being
 * an idea and becomes a real venture: the existing structuring pipeline runs
 * for the first time, and the co-founder is on the team from day one.
 */
async function commitToSpark(sparkId, userId) {
  const sparkRes = await pool.query(`SELECT * FROM sparks WHERE id = $1`, [sparkId]);
  if (sparkRes.rows.length === 0) return { success: false, error: 'NOT_FOUND' };
  const spark = sparkRes.rows[0];
  if (spark.status === 'FORMED') return { success: false, error: 'ALREADY_FORMED' };

  const isAuthor = spark.author_id === userId;
  const column = isAuthor ? 'author_committed' : 'responder_committed';

  const resonanceRes = isAuthor
    ? await pool.query(`SELECT * FROM spark_resonances WHERE spark_id = $1 ORDER BY created_at ASC LIMIT 1`, [sparkId])
    : await pool.query(`SELECT * FROM spark_resonances WHERE spark_id = $1 AND user_id = $2`, [sparkId, userId]);

  if (resonanceRes.rows.length === 0) return { success: false, error: 'NO_RESONANCE_YET' };
  const resonance = resonanceRes.rows[0];

  const updated = await pool.query(
    `UPDATE spark_resonances SET ${column} = true WHERE id = $1 RETURNING *`,
    [resonance.id]
  );
  const r = updated.rows[0];

  if (!(r.author_committed && r.responder_committed)) {
    await pool.query(`UPDATE sparks SET status = 'FORMING', updated_at = now() WHERE id = $1`, [sparkId]);
    const otherUserId = isAuthor ? r.user_id : spark.author_id;
    createNotification(otherUserId, {
      type: 'SPARK_COMMIT',
      title: 'They are ready to build',
      message: `Your co-founder is ready to build "${spark.title}". Commit to make it real.`,
      referenceType: 'SPARK',
      referenceId: sparkId,
    }).catch(() => {});
    return { success: true, formed: false, awaitingOther: true };
  }

  // Both committed. This is the actual founding moment: the spark stops
  // being an idea and becomes a real venture.
  return await formVenture(spark, r.user_id);
}

/**
 * The founding moment made real.
 *
 * Runs the SAME structuring pipeline every other venture goes through
 * (createStartup already handles AI structuring, gap diagnosis and seeding
 * the author as a team member), then does the one thing that makes this
 * different from every other path into the platform: the person who
 * resonated joins as a genuine CO-FOUNDER from day one, not as a hire
 * discovered later through gap diagnosis.
 */
async function formVenture(spark, coFounderId) {
  const { createStartup } = require('../startups/startupService');

  // The spark's own text becomes the venture's raw idea. Nothing is
  // re-typed or lost: what they wrote before the company existed is
  // literally what the company is built from.
  const rawIdea = [spark.the_idea, spark.why_me ? `\n\nWhy this founder: ${spark.why_me}` : ''].join('');

  const created = await createStartup(spark.author_id, {
    name: spark.title.length > 60 ? spark.title.slice(0, 57) + '...' : spark.title,
    rawIdea,
    currentTeamSize: 2, // Real from the first moment: two committed people, not one
    founderVision: spark.why_me || null,
    founderDomainExpertise: spark.tags || [],
  });

  // Real failure isolation, matching the pattern already proven in
  // createStartup: if AI structuring fails, the commitment itself must
  // NOT be lost. The spark stays FORMING so it can be retried, rather
  // than being marked FORMED with no venture behind it.
  if (!created.startup) {
    return { success: false, error: 'FORMATION_FAILED', detail: created.detail || created.error };
  }
  const startup = created.startup;

  // The one thing that makes this path genuinely different: co-founder,
  // seeded on day one, flagged is_founder like the author.
  const coFounderProfile = await pool.query(`SELECT headline, skills FROM profiles WHERE user_id = $1`, [coFounderId]);
  const cp = coFounderProfile.rows[0];
  await pool.query(
    `INSERT INTO startup_team_members (startup_id, user_id, role, skills, is_founder)
     VALUES ($1, $2, $3, $4, true)
     ON CONFLICT (startup_id, user_id) DO NOTHING`,
    [startup.id, coFounderId, cp?.headline || 'Co-founder', cp?.skills || []]
  );

  await pool.query(
    `UPDATE sparks SET status = 'FORMED', formed_startup_id = $1, updated_at = now() WHERE id = $2`,
    [startup.id, spark.id]
  );

  for (const uid of [spark.author_id, coFounderId]) {
    createNotification(uid, {
      type: 'SPARK_FORMED',
      title: 'It is real now',
      message: `"${spark.title}" is a venture. You are both founders.`,
      referenceType: 'STARTUP',
      referenceId: startup.id,
    }).catch(() => {});
  }

  return {
    success: true,
    formed: true,
    bothCommitted: true,
    startupId: startup.id,
    structured: created.success,
    detail: created.success ? undefined : 'Venture created, but AI structuring did not complete. You can re-run analysis from the dashboard.',
  };
}

async function getMySparks(userId) {
  const authored = await pool.query(
    `SELECT s.*, (SELECT COUNT(*) FROM spark_resonances r WHERE r.spark_id = s.id) AS resonance_count
     FROM sparks s WHERE s.author_id = $1 ORDER BY s.created_at DESC`,
    [userId]
  );
  const resonated = await pool.query(
    `SELECT s.*, r.message AS my_message, r.author_committed, r.responder_committed, r.conversation_id,
            p.display_name AS author_name
     FROM spark_resonances r
     JOIN sparks s ON s.id = r.spark_id
     JOIN profiles p ON p.user_id = s.author_id
     WHERE r.user_id = $1 ORDER BY r.created_at DESC`,
    [userId]
  );
  return { success: true, authored: authored.rows, resonated: resonated.rows };
}

module.exports = { createSpark, listSparks, getSpark, resonate, commitToSpark, getMySparks };
