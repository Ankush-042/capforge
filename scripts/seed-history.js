require('dotenv').config();
/**
 * Give the seeded platform a past.
 *
 * Everything seeded so far happened in the same hour. Every circle post says
 * "2m ago", every message "just now", every team formed today. That is the
 * single biggest tell that a platform is staged: real activity accumulates
 * over weeks. On top of that the charts are flat, no founder has ever spoken
 * to an investor, every conversation is two lines long, and every spark is in
 * the same state.
 *
 * This fixes all of it, in three phases:
 *
 *   1. CONTENT, through the real service functions wherever a side effect
 *      matters: conversations that go ten messages deep with a quiet week in
 *      the middle, founders pitching investors, sparks in different states.
 *   2. HISTORY: seeded activity is spread backwards over several weeks,
 *      coherently, so replies come after posts, messages after the
 *      resonance that opened them, joins after the conversation that formed
 *      the team, and notifications at the moment of the event they describe.
 *   3. DEPTH: readiness history so charts show a trend, milestones, profile
 *      views, and one spark rewritten after it did not land.
 *
 * TWO THINGS IT DELIBERATELY DOES NOT DO.
 *
 * It never changes a venture's CURRENT readiness. Spreading ventures across
 * the investor bar artificially would desync investor deal flow from the
 * scores behind it and break a quality rule. History is added BEFORE the
 * current assessment, trending up to it, so the latest score stays exactly
 * what the real assessment produced.
 *
 * It only rewrites timestamps on rows where EVERY party is a seeded account and
 * that were created in the last few days. Real accounts are never touched, and
 * because rewritten rows are then old, a second run leaves them alone.
 *
 * This is SEEDING, not product behaviour.
 *
 * Usage:
 *   node scripts/seed-history.js --dry
 *   node scripts/seed-history.js
 */
const pool = require('../backend/shared/db');
const { startOrGetConversation, sendMessage } = require('../backend/conversations/conversationService');
const { createSpark, resonate, commitToSpark, updateSpark } = require('../backend/sparks/sparkService');
const { sendPitchToConversation } = require('../backend/pitch/pitchService');
const { generateMilestones } = require('../backend/milestones/milestoneService');

const DRY = process.argv.includes('--dry');
const WINDOW_HOURS = 96;   // "freshly seeded" means created within this window
const SEED = "%@seed.test";

const HOUR = 3600000;
const DAY = 24 * HOUR;
const NOW = Date.now();
const rand = (a, b) => a + Math.random() * (b - a);
const iso = (ms) => new Date(ms).toISOString();
const step = (s) => console.log(`\n${s}\n${'-'.repeat(s.length)}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Lay out a sequence of events from a desired start, never reaching the
 * present. If the gaps would run past "a little while ago", they are scaled
 * down to fit rather than truncated, so ordering and rhythm both survive.
 */
function layout(desiredStart, gaps, latestAllowed = NOW - HOUR) {
  const total = gaps.reduce((a, b) => a + b, 0);
  let start = desiredStart;
  let scale = 1;
  if (start + total > latestAllowed) {
    if (start >= latestAllowed) start = latestAllowed - total;
    if (start + total > latestAllowed) scale = Math.max(0.05, (latestAllowed - start) / total);
  }
  const times = [start];
  for (const g of gaps) times.push(times[times.length - 1] + g * scale);
  return times;
}

// ----------------------------------------------------------------------------
// Content
// ----------------------------------------------------------------------------

/** A conversation that goes somewhere, including a week of silence. */
const DEEP_EXCHANGE = [
  ['C', "Following up properly now that I have had time to read everything on {venture}. I have questions before I say anything that sounds like a commitment."],
  ['F', "Ask them. I would rather lose you now than six months in."],
  ['C', "How many hours a week are you actually expecting? Not the pitch version."],
  ['F', "Honestly, twenty to start. More once we know the thing works. I am not going to pretend it stays part-time forever."],
  ['C', "That works for now. What I need clarity on is what happens if it does work and I am still on twenty."],
  ['F', "Then we renegotiate, in writing, before it turns into resentment. I have watched exactly that end a company."],
  ['C', "Sorry, went quiet. Had a week at my current job that ate everything. Still very interested."],
  ['F', "No apology needed. Honestly it told me something useful, that you would say so rather than disappear."],
  ['C', "Can we talk equity before going further? Not to haggle, just so neither of us is guessing."],
  ['F', "Yes. I would rather it be awkward now than later. What were you thinking?"],
  ['C', "I looked at the range the calculator here suggested and it seemed fair. Somewhere in there, with a normal vesting schedule."],
  ['F', "That is close to what I had in mind. Let us get on a call this week and write it down."],
];
const QUIET_AFTER = 5; // the silence falls after the sixth message

const INVESTOR_OPENER = "I have been following {venture} since it crossed the readiness bar. Before anything else: what is the part you are least sure about?";
const FOUNDER_REPLY = "Distribution. The product question I think we can answer. Getting in front of the people who actually need it is the thing I lose sleep over.";
const PITCH_NOTE = "Here is the full picture, including that.";
const INVESTOR_AFTER = "That is a more honest answer than I usually get. I have read it. Can you walk me through the next ninety days on a call?";

const EXTRA_RESONANCES = [
  "I have been circling this exact problem for about a year without doing anything about it. Seeing someone else write it down properly made me want to stop circling.",
  "I am not sure I am the right fit for what you described, but I have worked adjacent to this for four years and I would like to at least talk it through.",
];

const QUIET_SPARK = {
  title: 'Small clinics throw away most of the data they collect',
  theIdea: "Every small clinic I have worked with records far more than it ever looks at again. Appointment patterns, no-shows, the questions patients ask before booking. None of it is analysed because nobody there has the time or the tools. I suspect there is a simple product in just telling them what they already know.",
  whyMe: "I spent three years building software for clinics and watched this happen in every one of them.",
  lookingFor: 'Someone who has worked with healthcare data and understands what small clinics can realistically adopt.',
  tags: ['healthcare', 'saas'],
};

const REWRITE = (idea) => `${idea}\n\nTo be more specific about what I mean: the first version would be deliberately small, one problem, for one kind of customer, and I would rather prove that than describe the whole vision.`;

// ----------------------------------------------------------------------------

(async () => {
  if (DRY) console.log('DRY RUN. Nothing will be written.\n');
  const report = {};

  // ==========================================================================
  // PHASE 1 — CONTENT
  // ==========================================================================

  step('Phase 1a: conversations that go somewhere');
  const shallow = (await pool.query(
    `SELECT c.id, c.startup_id, s.name AS venture, s.founder_id,
            CASE WHEN c.participant_a_id = s.founder_id THEN c.participant_b_id ELSE c.participant_a_id END AS contributor_id,
            (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id)::int AS n
     FROM conversations c
     JOIN startups s ON s.id = c.startup_id
     JOIN users ua ON ua.id = c.participant_a_id
     JOIN users ub ON ub.id = c.participant_b_id
     WHERE ua.email LIKE $1 AND ub.email LIKE $1
       AND c.team_formed_at IS NULL
       AND (c.participant_a_id = s.founder_id OR c.participant_b_id = s.founder_id)
       AND EXISTS (SELECT 1 FROM users u3
                   WHERE u3.id = CASE WHEN c.participant_a_id = s.founder_id THEN c.participant_b_id ELSE c.participant_a_id END
                     AND u3.primary_role = 'CONTRIBUTOR')
     ORDER BY c.created_at DESC`,
    [SEED]
  )).rows.filter((c) => c.n <= 3).slice(0, 3);

  for (const c of shallow) {
    console.log(`  ${DRY ? 'would deepen' : 'deepening'}  ${c.venture} (${c.n} -> ${c.n + DEEP_EXCHANGE.length} messages)`);
    if (DRY) continue;
    // Inserted directly, a millisecond apart so order is fixed; phase 2 gives
    // them their real rhythm. sendMessage would stamp every one "now" and
    // fire a notification per line, neither of which is what history is.
    let t = NOW;
    for (const [who, text] of DEEP_EXCHANGE) {
      t += 1;
      await pool.query(
        `INSERT INTO messages (conversation_id, sender_id, content, created_at) VALUES ($1, $2, $3, $4)`,
        [c.id, who === 'F' ? c.founder_id : c.contributor_id, text.replace('{venture}', c.venture), iso(t)]
      );
    }
    await pool.query(`UPDATE conversations SET last_message_at = $2 WHERE id = $1`, [c.id, iso(t)]);
  }
  report.deepened = shallow.length;

  step('Phase 1b: founders pitching investors');
  const pitchPairs = (await pool.query(
    `WITH latest AS (
       SELECT DISTINCT ON (startup_id) startup_id, overall_score
       FROM readiness_assessments ORDER BY startup_id, generated_at DESC
     )
     SELECT DISTINCT ON (s.id) s.id AS startup_id, s.name AS venture, s.founder_id,
            ip_p.user_id AS investor_id, ip_p.display_name AS investor
     FROM startups s
     JOIN latest l ON l.startup_id = s.id AND l.overall_score >= 35
     JOIN users fu ON fu.id = s.founder_id AND fu.email LIKE $1
     JOIN investor_profiles ip ON TRUE
     JOIN profiles ip_p ON ip_p.id = ip.profile_id
     JOIN users iu ON iu.id = ip_p.user_id AND iu.email LIKE $1 AND iu.primary_role = 'INVESTOR'
     WHERE EXISTS (SELECT 1 FROM unnest(COALESCE(s.domain, ARRAY[]::text[])) sd
                   JOIN unnest(COALESCE(ip.preferred_domains, ARRAY[]::text[])) idd
                     ON lower(sd) LIKE '%' || lower(idd) || '%' OR lower(idd) LIKE '%' || lower(sd) || '%')
       AND NOT EXISTS (SELECT 1 FROM conversations c
                       WHERE c.startup_id = s.id
                         AND (c.participant_a_id = ip_p.user_id OR c.participant_b_id = ip_p.user_id))
     ORDER BY s.id, l.overall_score DESC`,
    [SEED]
  )).rows.slice(0, 2);

  for (const p of pitchPairs) {
    console.log(`  ${DRY ? 'would open' : 'opening'}  ${p.investor} -> ${p.venture}, with a pitch sent`);
    if (DRY) continue;
    const convo = await startOrGetConversation(p.investor_id, p.founder_id, { startupId: p.startup_id });
    if (!convo.success) { console.log(`    could not open: ${convo.error}`); continue; }
    const cid = convo.conversation.id;
    await sendMessage(cid, p.investor_id, INVESTOR_OPENER.replace('{venture}', p.venture));
    await sendMessage(cid, p.founder_id, FOUNDER_REPLY);
    const pitch = await sendPitchToConversation(cid, p.startup_id, p.founder_id, PITCH_NOTE);
    if (!pitch.success) console.log(`    pitch not sent: ${pitch.error}`);
    await sendMessage(cid, p.investor_id, INVESTOR_AFTER);
  }
  report.investorConversations = pitchPairs.length;

  step('Phase 1c: sparks in different states');

  // One spark with several people wanting in.
  const busy = (await pool.query(
    `SELECT s.id, s.title, s.author_id,
            (SELECT COUNT(*) FROM spark_resonances r WHERE r.spark_id = s.id)::int AS n
     FROM sparks s JOIN users u ON u.id = s.author_id
     WHERE u.email LIKE $1 AND s.status IN ('OPEN','FORMING')
     ORDER BY s.created_at DESC`,
    [SEED]
  )).rows.find((s) => s.n === 1);

  if (busy) {
    console.log(`  ${DRY ? 'would add' : 'adding'}  ${EXTRA_RESONANCES.length} more people to "${busy.title.slice(0, 44)}..."`);
    if (!DRY) {
      const people = (await pool.query(
        `SELECT p.user_id FROM profiles p JOIN users u ON u.id = p.user_id
         WHERE u.email LIKE $1 AND u.primary_role = 'CONTRIBUTOR'
           AND p.user_id NOT IN (SELECT user_id FROM spark_resonances WHERE spark_id = $2)
         ORDER BY random() LIMIT $3`,
        [SEED, busy.id, EXTRA_RESONANCES.length]
      )).rows;
      for (const [i, person] of people.entries()) {
        const r = await resonate(busy.id, person.user_id, EXTRA_RESONANCES[i]);
        if (!r.success) console.log(`    resonance failed: ${r.error}`);
      }
    }
  } else {
    console.log('  skip  no single-resonance spark to build on');
  }

  // One spark nobody has answered, because not every idea lands.
  const quietExists = (await pool.query(`SELECT 1 FROM sparks WHERE title = $1`, [QUIET_SPARK.title])).rows.length > 0;
  if (quietExists) {
    console.log('  skip  the unanswered spark already exists');
  } else {
    const author = (await pool.query(
      `SELECT s.founder_id AS id FROM startups s JOIN users u ON u.id = s.founder_id
       WHERE u.email LIKE $1 AND EXISTS (SELECT 1 FROM unnest(s.domain) d WHERE lower(d) LIKE '%health%')
       LIMIT 1`,
      [SEED]
    )).rows[0];
    if (author) {
      console.log(`  ${DRY ? 'would post' : 'posting'}  an idea nobody has answered yet`);
      if (!DRY) {
        const r = await createSpark(author.id, QUIET_SPARK);
        if (!r.success) console.log(`    failed: ${r.error}`);
      }
    }
  }

  // An idea that actually became a venture, through the real founding moment.
  // Only if none exists: it runs the whole creation chain, including AI
  // structuring and role diagnosis, and one example is the point.
  const formedCount = (await pool.query(`SELECT COUNT(*)::int AS n FROM sparks WHERE status = 'FORMED'`)).rows[0].n;
  if (formedCount > 0) {
    console.log(`  skip  ${formedCount} spark(s) have already become ventures`);
  } else {
    const candidate = (await pool.query(
      `SELECT s.id, s.title, s.author_id, r.user_id AS responder_id
       FROM sparks s JOIN users u ON u.id = s.author_id
       JOIN spark_resonances r ON r.spark_id = s.id
       WHERE u.email LIKE $1 AND s.status IN ('OPEN','FORMING') AND s.why_me IS NOT NULL
         AND (SELECT COUNT(*) FROM spark_resonances r2 WHERE r2.spark_id = s.id) = 1
       ORDER BY s.created_at ASC LIMIT 1`,
      [SEED]
    )).rows[0];
    if (!candidate) {
      console.log('  skip  no spark suitable for forming');
    } else {
      console.log(`  ${DRY ? 'would form' : 'forming'}  a venture from "${candidate.title.slice(0, 44)}..."`);
      if (!DRY) {
        try {
          await commitToSpark(candidate.id, candidate.responder_id);
          const f = await commitToSpark(candidate.id, candidate.author_id);
          console.log(f.success && f.formed
            ? '    formed: the idea is a venture now'
            : `    did not form: ${f.error || (f.awaitingOther ? 'awaiting the other side' : 'unknown')}`);
        } catch (err) {
          // It calls the model several times. A rate limit here must not take
          // the rest of the history down with it.
          console.log(`    formation failed (non-fatal): ${err.message}`);
        }
      }
    }
  }

  // ==========================================================================
  // PHASE 2 — HISTORY
  // ==========================================================================

  step('Phase 2: spreading activity backwards over several weeks');
  const windowSql = `now() - interval '${WINDOW_HOURS} hours'`;

  // --- Sparks and the people who wanted in ---
  const freshSparks = (await pool.query(
    `SELECT s.id FROM sparks s JOIN users u ON u.id = s.author_id
     WHERE u.email LIKE $1 AND s.created_at > ${windowSql}
     ORDER BY s.created_at`,
    [SEED]
  )).rows;
  const conversationStart = {}; // conversation id -> when the resonance opened it

  for (const sp of freshSparks) {
    const born = NOW - rand(4, 20) * DAY;
    const res = (await pool.query(
      `SELECT id, conversation_id FROM spark_resonances WHERE spark_id = $1 ORDER BY created_at, id`,
      [sp.id]
    )).rows;
    const times = layout(born, [rand(6, 30) * HOUR, ...res.slice(1).map(() => rand(10, 60) * HOUR)]);
    if (!DRY) {
      await pool.query(`UPDATE sparks SET created_at = $2, updated_at = $2 WHERE id = $1`, [sp.id, iso(born)]);
      for (const [i, r] of res.entries()) {
        await pool.query(`UPDATE spark_resonances SET created_at = $2 WHERE id = $1`, [r.id, iso(times[i + 1])]);
        if (r.conversation_id) conversationStart[r.conversation_id] = times[i + 1] + 5 * 60000;
      }
    }
  }
  console.log(`  ${freshSparks.length} spark(s)`);

  // --- Conversations and their messages ---
  const freshConvos = (await pool.query(
    `SELECT c.id, c.team_formed_at FROM conversations c
     JOIN users ua ON ua.id = c.participant_a_id
     JOIN users ub ON ub.id = c.participant_b_id
     WHERE ua.email LIKE $1 AND ub.email LIKE $1 AND c.created_at > ${windowSql}`,
    [SEED]
  )).rows;

  for (const c of freshConvos) {
    const msgs = (await pool.query(
      `SELECT id FROM messages WHERE conversation_id = $1 ORDER BY created_at, id`, [c.id]
    )).rows;
    const gaps = msgs.slice(1).map((_, i) =>
      msgs.length >= 10 && i === QUIET_AFTER ? rand(6, 8) * DAY : rand(0.4, 20) * HOUR);
    const start = conversationStart[c.id] ?? NOW - rand(4, 24) * DAY;
    const times = msgs.length ? layout(start, gaps, NOW - 3 * HOUR) : [start];
    const last = times[times.length - 1];
    const formedAt = c.team_formed_at ? Math.min(last + rand(1, 10) * HOUR, NOW - 30 * 60000) : null;

    if (!DRY) {
      for (const [i, m] of msgs.entries()) {
        // Everything but the last message has been read, so each thread
        // carries one genuinely new message rather than being all unread or
        // all stale.
        const readAt = i < msgs.length - 1 ? iso(Math.min(times[i] + rand(0.2, 6) * HOUR, NOW - 60000)) : null;
        await pool.query(`UPDATE messages SET created_at = $2, read_at = $3 WHERE id = $1`, [m.id, iso(times[i]), readAt]);
      }
      await pool.query(
        `UPDATE conversations SET created_at = $2, last_message_at = $3, team_formed_at = COALESCE($4, team_formed_at) WHERE id = $1`,
        [c.id, iso(times[0]), iso(last), formedAt ? iso(formedAt) : null]
      );
    }
  }
  console.log(`  ${freshConvos.length} conversation(s)`);

  // --- Team members join when their team formed, not today ---
  if (!DRY) {
    await pool.query(
      `UPDATE startup_team_members tm SET joined_at = c.team_formed_at
       FROM conversations c
       JOIN users u ON TRUE
       WHERE tm.is_founder = false AND tm.joined_at > ${windowSql}
         AND u.id = tm.user_id AND u.email LIKE $1
         AND c.startup_id = tm.startup_id AND c.team_formed_at IS NOT NULL
         AND (c.participant_a_id = tm.user_id OR c.participant_b_id = tm.user_id)`,
      [SEED]
    );
  }

  // --- Circle posts, replies after the post they answer ---
  const freshTop = (await pool.query(
    `SELECT rp.id FROM room_posts rp JOIN users u ON u.id = rp.author_id
     WHERE u.email LIKE $1 AND rp.parent_id IS NULL AND rp.created_at > ${windowSql}`,
    [SEED]
  )).rows;
  for (const p of freshTop) {
    const at = NOW - rand(1, 21) * DAY;
    const replies = (await pool.query(`SELECT id FROM room_posts WHERE parent_id = $1 ORDER BY created_at, id`, [p.id])).rows;
    const times = layout(at, replies.map(() => rand(0.7, 36) * HOUR), NOW - 20 * 60000);
    if (!DRY) {
      await pool.query(`UPDATE room_posts SET created_at = $2 WHERE id = $1`, [p.id, iso(times[0])]);
      for (const [i, r] of replies.entries()) {
        await pool.query(`UPDATE room_posts SET created_at = $2 WHERE id = $1`, [r.id, iso(times[i + 1])]);
      }
    }
  }
  console.log(`  ${freshTop.length} circle thread(s)`);

  // --- Investors started watching over time, not all at once ---
  const freshWatch = (await pool.query(
    `SELECT w.id FROM investor_watchlist w JOIN users u ON u.id = w.investor_id
     WHERE u.email LIKE $1 AND w.created_at > ${windowSql}`,
    [SEED]
  )).rows;
  if (!DRY) {
    for (const w of freshWatch) {
      const at = iso(NOW - rand(2, 18) * DAY);
      await pool.query(`UPDATE investor_watchlist SET created_at = $2, updated_at = $2 WHERE id = $1`, [w.id, at]);
    }
  }
  console.log(`  ${freshWatch.length} watchlist entr(ies)`);

  // --- Notifications land at the moment of the event they describe ---
  const freshNotes = (await pool.query(
    `SELECT n.id, n.type, n.reference_type, n.reference_id FROM notifications n
     JOIN users u ON u.id = n.user_id
     WHERE u.email LIKE $1 AND n.created_at > ${windowSql}`,
    [SEED]
  )).rows;
  let aligned = 0;
  if (!DRY) {
    for (const n of freshNotes) {
      let t = null;
      if (n.reference_type === 'conversation') {
        t = (await pool.query(`SELECT last_message_at FROM conversations WHERE id = $1`, [n.reference_id])).rows[0]?.last_message_at;
      } else if (n.reference_type === 'SPARK') {
        t = n.type === 'SPARK_FITS_YOU'
          ? (await pool.query(`SELECT created_at + interval '20 minutes' AS t FROM sparks WHERE id = $1`, [n.reference_id])).rows[0]?.t
          : (await pool.query(`SELECT MAX(created_at) AS t FROM spark_resonances WHERE spark_id = $1`, [n.reference_id])).rows[0]?.t;
      } else if (n.reference_type === 'STARTUP') {
        t = (await pool.query(`SELECT MAX(team_formed_at) AS t FROM conversations WHERE startup_id = $1`, [n.reference_id])).rows[0]?.t;
      }
      if (!t) continue;
      const ms = new Date(t).getTime();
      // Anything older than two days has been seen; the recent ones have not.
      await pool.query(`UPDATE notifications SET created_at = $2, is_read = $3 WHERE id = $1`,
        [n.id, iso(ms), ms < NOW - 2 * DAY]);
      aligned++;
    }
  }
  console.log(`  ${DRY ? freshNotes.length + ' notification(s) to align' : aligned + ' notification(s) aligned to their events'}`);

  // ==========================================================================
  // PHASE 3 — DEPTH
  // ==========================================================================

  step('Phase 3a: readiness history');
  // History BEFORE the current assessment, trending up to it. The current
  // score is never touched: that is what investor visibility runs on.
  const ventures = (await pool.query(
    `SELECT s.id, s.name,
            (SELECT COUNT(*) FROM readiness_assessments ra WHERE ra.startup_id = s.id)::int AS n
     FROM startups s JOIN users u ON u.id = s.founder_id
     WHERE u.email LIKE $1`,
    [SEED]
  )).rows.filter((v) => v.n >= 1 && v.n < 4);

  for (const v of ventures) {
    const cur = (await pool.query(
      `SELECT overall_score, dimensions, algorithm_version, generated_at FROM readiness_assessments
       WHERE startup_id = $1 ORDER BY generated_at DESC LIMIT 1`,
      [v.id]
    )).rows[0];
    const S = parseFloat(cur.overall_score);
    const T = new Date(cur.generated_at).getTime();
    const plan = [[21, 12], [14, 8], [7, 3]].slice(0, 4 - v.n); // days before, points below

    console.log(`  ${DRY ? 'would add' : 'adding'}  ${plan.length} earlier point(s) to ${v.name} (climbing to ${Math.round(S)})`);
    if (DRY) continue;

    for (const [daysBefore, below] of plan) {
      const score = Math.max(5, S - below);
      const ratio = S > 0 ? score / S : 1;
      const dims = {};
      for (const [k, val] of Object.entries(cur.dimensions || {})) {
        dims[k] = typeof val === 'number' ? Math.max(0, Math.min(1, +(val * ratio).toFixed(3))) : val;
      }
      await pool.query(
        `INSERT INTO readiness_assessments (startup_id, overall_score, dimensions, critical_issues, top_actions, algorithm_version, generated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [v.id, score.toFixed(2), JSON.stringify(dims), [], [], cur.algorithm_version, iso(T - daysBefore * DAY)]
      );
    }
  }
  report.historyVentures = ventures.length;

  step('Phase 3b: milestones');
  const noMilestones = (await pool.query(
    `SELECT s.id, s.name FROM startups s JOIN users u ON u.id = s.founder_id
     WHERE u.email LIKE $1 AND NOT EXISTS (SELECT 1 FROM milestones m WHERE m.startup_id = s.id)
     ORDER BY s.name LIMIT 5`,
    [SEED]
  )).rows;
  for (const v of noMilestones) {
    console.log(`  ${DRY ? 'would generate' : 'generating'}  milestones for ${v.name}`);
    if (DRY) continue;
    try {
      const r = await generateMilestones(v.id);
      if (!r.success) { console.log(`    failed: ${r.error || 'unknown'}`); continue; }
      // The first step done, the second under way, so the page shows progress
      // rather than a list nobody has touched.
      const ms = (await pool.query(`SELECT id FROM milestones WHERE startup_id = $1 ORDER BY sequence_order LIMIT 2`, [v.id])).rows;
      if (ms[0]) await pool.query(`UPDATE milestones SET status = 'COMPLETED' WHERE id = $1`, [ms[0].id]);
      if (ms[1]) await pool.query(`UPDATE milestones SET status = 'IN_PROGRESS' WHERE id = $1`, [ms[1].id]);
    } catch (err) {
      console.log(`    failed (non-fatal): ${err.message}`);
    }
    await sleep(6000); // it calls the model; the free tier needs room
  }

  step('Phase 3c: who looked at whom');
  const views = (await pool.query(
    `SELECT DISTINCT s.founder_id AS viewer, r.target_user_id AS viewed
     FROM recommendations r JOIN startups s ON s.id = r.startup_id
     JOIN users a ON a.id = s.founder_id JOIN users b ON b.id = r.target_user_id
     WHERE r.recommendation_type = 'CONTRIBUTOR' AND r.status = 'ACTIVE' AND r.score >= 0.30
       AND a.email LIKE $1 AND b.email LIKE $1
     LIMIT 40`,
    [SEED]
  )).rows;
  let added = 0;
  for (const v of views) {
    const exists = (await pool.query(`SELECT 1 FROM profile_views WHERE viewer_id = $1 AND viewed_user_id = $2`, [v.viewer, v.viewed])).rows.length > 0;
    if (exists) continue;
    added++;
    if (!DRY) {
      await pool.query(`INSERT INTO profile_views (viewer_id, viewed_user_id, viewed_at) VALUES ($1, $2, $3)`,
        [v.viewer, v.viewed, iso(NOW - rand(1, 20) * DAY)]);
    }
  }
  console.log(`  ${added} profile view(s)`);

  step('Phase 3d: an idea rewritten after it did not land');
  // After phase 2, so the spark is old enough that a rewrite genuinely lifts
  // it back into the feed, exactly as the real feature does.
  const toRewrite = (await pool.query(
    `SELECT s.id, s.author_id, s.the_idea, s.title FROM sparks s JOIN users u ON u.id = s.author_id
     WHERE u.email LIKE $1 AND s.status IN ('OPEN','FORMING') AND s.edit_count = 0
       AND s.created_at < now() - interval '2 days'
     ORDER BY s.created_at ASC LIMIT 1`,
    [SEED]
  )).rows[0];
  if (!toRewrite && DRY) {
    // In a dry run nothing has been backdated yet, so no spark is old enough
    // to qualify. Saying 'nothing suitable' here would be false.
    console.log('  would rewrite  one spark, once phase 2 has given it some age');
  } else if (!toRewrite) {
    console.log('  skip  nothing suitable (or already done)');
  } else {
    console.log(`  ${DRY ? 'would rewrite' : 'rewriting'}  "${toRewrite.title.slice(0, 48)}..."`);
    if (!DRY) {
      const r = await updateSpark(toRewrite.id, toRewrite.author_id, { the_idea: REWRITE(toRewrite.the_idea) });
      console.log(r.success ? `    ${r.resurfaced ? 'rewritten and back near the top of the feed' : 'rewritten'}` : `    failed: ${r.error}`);
    }
  }

  // ==========================================================================
  console.log(`\n${'='.repeat(64)}`);
  console.log(DRY ? 'Dry run complete. Nothing was written.' : 'Done. The platform has a past now.');

  const spread = (await pool.query(
    `WITH latest AS (SELECT DISTINCT ON (startup_id) startup_id, overall_score
                     FROM readiness_assessments ORDER BY startup_id, generated_at DESC)
     SELECT COUNT(*) FILTER (WHERE overall_score < 25)::int AS far,
            COUNT(*) FILTER (WHERE overall_score >= 25 AND overall_score < 35)::int AS close,
            COUNT(*) FILTER (WHERE overall_score >= 35)::int AS above
     FROM latest`
  )).rows[0];
  console.log(`\nReadiness across ventures, untouched: ${spread.far} well below the bar, ${spread.close} close to it, ${spread.above} above it.`);

  if (!DRY) {
    console.log('\nIf a spark became a venture, it has new roles nobody is ranked for yet:');
    console.log('  node scripts/judge-matches.js');
    console.log('  node scripts/rerank-everything.js');
    console.log('  node scripts/test-matching-quality.js');
  }
  await pool.end();
  process.exit(0);
})().catch((err) => { console.error('\nFailed:', err.message); console.error(err.stack); process.exit(1); });
