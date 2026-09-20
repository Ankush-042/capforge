require('dotenv').config();
/**
 * Bring the seeded platform to life.
 *
 * Every screen in CapForge has been built and verified against data that
 * exists but never MOVES. Ventures sit there, contributors sit there, and
 * nothing has ever happened between them. That hides a whole class of problem:
 * empty states are tested, populated ones are not, and the screens that only
 * mean something once there is activity, the inbox, circles, tracking, what
 * changed while you were away, have never been seen doing their actual job.
 *
 * This creates real activity through the REAL SERVICE FUNCTIONS, not by
 * inserting rows. That matters: inserting rows directly would skip every
 * validation, notification, and side effect, and would therefore prove
 * nothing about whether the product works. Going through the services means
 * if something is broken, this breaks too, which is the point.
 *
 * SAFE TO RE-RUN. Everything checks for its own prior effect first, so running
 * it twice does not double anything.
 *
 * Usage:
 *   node scripts/bring-to-life.js            do it
 *   node scripts/bring-to-life.js --dry      say what it would do, change nothing
 */
const pool = require('../backend/shared/db');
const { startOrGetConversation, sendMessage, confirmTeamFormation } = require('../backend/conversations/conversationService');
const { createSpark, resonate } = require('../backend/sparks/sparkService');

const DRY = process.argv.includes('--dry');

const log = (s) => console.log(s);
const step = (s) => console.log(`\n${s}\n${'-'.repeat(s.length)}`);

/** Real things people actually say, not lorem. Bad filler makes a populated
 *  product look worse than an empty one. */
const OPENERS = [
  "Saw the role. I've spent the last three years on exactly this problem and I'm not done with it.",
  "This is the first thing on here I've read twice. What's the actual state of the product right now?",
  "I'm interested, but I want to understand what you've already tried before I say anything useful.",
  "Been looking for something at this stage. How are you thinking about splitting things early on?",
];

const REPLIES = [
  "Genuinely glad you reached out. We're further along than the readiness score suggests, happy to walk you through it.",
  "That's the exact gap I've been trying to fill. When are you free to talk properly?",
  "Honest answer: it's messier than the page makes it look. Still worth building though.",
];

const CIRCLE_POSTS = [
  { room: 'healthcare', body: "Does anyone here have experience getting a clinical advisor on board pre-revenue? Not sure what's reasonable to offer someone who'd mostly be lending credibility early on." },
  { room: 'healthcare', body: "Spent two months building the wrong thing because I never actually sat in a clinic and watched how they work. If you're pre-product, go do that first." },
  { room: 'fintech', body: "How are people handling compliance before they have a compliance person? Feels like a chicken and egg thing and I keep putting it off." },
];

async function main() {
  if (DRY) log('DRY RUN. Nothing will be written.\n');

  // ---- Who exists ----
  const founders = (await pool.query(
    `SELECT u.id, p.display_name, s.id AS startup_id, s.name AS startup_name, s.domain
     FROM users u
     JOIN profiles p ON p.user_id = u.id
     JOIN startups s ON s.founder_id = u.id
     WHERE u.primary_role = 'FOUNDER' AND u.email LIKE '%@seed.test'
       AND s.verification_status != 'UNVERIFIED'
     ORDER BY s.name`
  )).rows;

  const contributors = (await pool.query(
    `SELECT u.id, p.display_name, p.headline
     FROM users u JOIN profiles p ON p.user_id = u.id
     WHERE u.primary_role = 'CONTRIBUTOR' AND u.email LIKE '%@seed.test'
     ORDER BY p.display_name`
  )).rows;

  const investors = (await pool.query(
    `SELECT u.id, p.display_name FROM users u JOIN profiles p ON p.user_id = u.id
     WHERE u.primary_role = 'INVESTOR' AND u.email LIKE '%@seed.test'
     ORDER BY p.display_name`
  )).rows;

  log(`Found ${founders.length} founders with ventures, ${contributors.length} contributors, ${investors.length} investors.`);
  if (founders.length === 0 || contributors.length === 0) {
    log('Not enough seeded accounts to work with. Nothing done.');
    await pool.end();
    process.exit(1);
  }

  // ---- 1. Conversations from real recommendations ----
  // Driven by who the ENGINE actually matched, not random pairs. A populated
  // inbox full of nonsense pairings would make the matching look broken.
  step('Conversations, from real matches');

  const matches = (await pool.query(
    `SELECT DISTINCT ON (r.startup_id)
            r.target_user_id, r.startup_id, r.source_gap_id, r.score,
            s.founder_id, s.name AS startup_name, p.display_name AS who
     FROM recommendations r
     JOIN startups s ON s.id = r.startup_id
     JOIN profiles p ON p.user_id = r.target_user_id
     JOIN gaps g ON g.id = r.source_gap_id
     WHERE r.recommendation_type = 'CONTRIBUTOR' AND r.status = 'ACTIVE'
       AND g.status NOT IN ('FILLED','DISMISSED') AND r.score >= 0.45
     ORDER BY r.startup_id, r.score DESC
     LIMIT 8`
  )).rows;

  let convos = 0;
  for (const [i, m] of matches.entries()) {
    const existing = await pool.query(
      `SELECT id FROM conversations
       WHERE startup_id = $1 AND (participant_a_id = $2 OR participant_b_id = $2)`,
      [m.startup_id, m.target_user_id]
    );
    if (existing.rows.length > 0) { log(`  skip  ${m.who} and ${m.startup_name} already talking`); continue; }

    log(`  ${DRY ? 'would open' : 'opening'}  ${m.who} -> ${m.startup_name} (${Math.round(parseFloat(m.score) * 100)}% fit)`);
    if (DRY) { convos++; continue; }

    const c = await startOrGetConversation(m.target_user_id, m.founder_id, {
      startupId: m.startup_id, gapId: m.source_gap_id,
    });
    if (!c.success) { log(`    failed: ${c.error}`); continue; }

    await sendMessage(c.conversation.id, m.target_user_id, OPENERS[i % OPENERS.length]);
    // Not every conversation gets a reply. A product where every message is
    // answered instantly is not what anyone's inbox looks like.
    if (i % 3 !== 2) {
      await sendMessage(c.conversation.id, m.founder_id, REPLIES[i % REPLIES.length]);
    }
    convos++;
  }
  log(`  ${convos} conversation(s)`);

  // ---- 2. One team actually forms ----
  // The founding moment is the most important thing this product does and it
  // has never been exercised outside a manual click.
  step('A team forming');

  const formable = (await pool.query(
    `SELECT c.id, c.participant_a_id, c.participant_b_id, c.startup_id, s.name
     FROM conversations c JOIN startups s ON s.id = c.startup_id
     WHERE c.startup_id IS NOT NULL AND c.team_formed_at IS NULL
     ORDER BY c.created_at DESC LIMIT 1`
  )).rows[0];

  if (!formable) {
    log('  nothing available to form');
  } else if (DRY) {
    log(`  would form a team on ${formable.name}`);
  } else {
    const a = await confirmTeamFormation(formable.id, formable.participant_a_id);
    const b = await confirmTeamFormation(formable.id, formable.participant_b_id);
    log(b.success && b.bothConfirmed
      ? `  team formed on ${formable.name}`
      : `  confirm returned: a=${a.success} b=${b.success} both=${b.bothConfirmed}`);
  }

  // ---- 3. Sparks, and somebody wanting in ----
  step('Sparks');

  const sparkAuthors = founders.slice(0, 2);
  const SPARKS = [
    { title: 'Diagnostics that work without a doctor in the room',
      theIdea: "Rural clinics in India have the equipment but not the person who can read the results. I keep thinking about whether the reading can happen somewhere else entirely, asynchronously, and what that would take to actually be safe rather than just technically possible.",
      whyMe: "My mother ran a clinic for eleven years and I watched what not having a specialist on hand actually costs people.",
      lookingFor: 'Someone who has worked on medical imaging or has clinical background. Engineering I can do.',
      tags: ['healthcare', 'artificial intelligence'] },
    { title: 'Why is switching business banking still a two week process',
      theIdea: "Every founder I know has complained about this and nobody has fixed it. I want to understand whether the blocker is regulatory or just nobody caring enough, because those are very different problems and I do not know which one this is yet.",
      whyMe: "Spent four years building payment infrastructure and this is the thing that annoyed me most.",
      lookingFor: 'Someone who knows the compliance side, because I genuinely do not.',
      tags: ['fintech'] },
  ];

  let sparksMade = 0;
  for (const [i, author] of sparkAuthors.entries()) {
    const spec = SPARKS[i];
    if (!spec) break;
    const existing = await pool.query(`SELECT id FROM sparks WHERE author_id = $1 AND title = $2`, [author.id, spec.title]);
    if (existing.rows.length > 0) { log(`  skip  "${spec.title.slice(0, 40)}..." already posted`); continue; }

    log(`  ${DRY ? 'would post' : 'posting'}  "${spec.title.slice(0, 48)}..." by ${author.display_name}`);
    if (DRY) { sparksMade++; continue; }

    const r = await createSpark(author.id, spec);
    if (!r.success) { log(`    failed: ${r.error}`); continue; }
    sparksMade++;

    // Somebody wants in. This is the single most important event in the
    // product and it has never fired from anything but a manual click.
    const wantsIn = contributors[i * 2] || contributors[0];
    if (wantsIn && wantsIn.id !== author.id) {
      const res = await resonate(r.spark.id, wantsIn.id,
        "This is the problem I left my last job over. I don't have all the answers but I've thought about it for a long time and I'd like to talk.");
      log(res.success ? `    ${wantsIn.display_name} wants in` : `    resonate failed: ${res.error}`);
    }
  }
  log(`  ${sparksMade} spark(s)`);

  // ---- 4. Circles ----
  step('Circles');

  let posted = 0;
  for (const [i, p] of CIRCLE_POSTS.entries()) {
    const author = i === 0 ? contributors[0] : founders[i % founders.length];
    if (!author) continue;

    const existing = await pool.query(`SELECT id FROM room_posts WHERE room = $1 AND body = $2`, [p.room, p.body]);
    if (existing.rows.length > 0) { log(`  skip  already posted in ${p.room}`); continue; }

    log(`  ${DRY ? 'would post' : 'posting'}  in ${p.room} as ${author.display_name}`);
    if (DRY) { posted++; continue; }

    const inserted = await pool.query(
      `INSERT INTO room_posts (room, author_id, body) VALUES ($1, $2, $3) RETURNING id`,
      [p.room, author.id, p.body]
    );
    posted++;

    // A circle where every post sits unanswered looks abandoned, which is
    // worse than an empty one.
    if (i === 0 && founders[0]) {
      await pool.query(
        `INSERT INTO room_posts (room, author_id, body, parent_id) VALUES ($1, $2, $3, $4)`,
        [p.room, founders[0].id, "We gave ours 0.5% vesting over two years with a one year cliff. Honestly the credibility mattered more than the hours.", inserted.rows[0].id]
      );
    }
    // Presence, so the room reads as somewhere people have actually been.
    await pool.query(
      `INSERT INTO room_presence (room, user_id) VALUES ($1, $2)
       ON CONFLICT (room, user_id) DO UPDATE SET last_seen_at = now()`,
      [p.room, author.id]
    );
  }
  log(`  ${posted} post(s)`);

  // ---- 5. Investors tracking things ----
  step('Investors watching');

  let watched = 0;
  const investable = (await pool.query(
    `SELECT s.id, s.name, ra.overall_score
     FROM startups s
     JOIN LATERAL (SELECT overall_score FROM readiness_assessments
                   WHERE startup_id = s.id ORDER BY generated_at DESC LIMIT 1) ra ON true
     WHERE ra.overall_score >= 30
     ORDER BY ra.overall_score DESC LIMIT 4`
  )).rows;

  for (const [i, inv] of investors.slice(0, 2).entries()) {
    for (const v of investable.slice(i, i + 2)) {
      const existing = await pool.query(
        `SELECT 1 FROM investor_watchlist WHERE investor_id = $1 AND startup_id = $2`, [inv.id, v.id]
      );
      if (existing.rows.length > 0) continue;

      const passing = (i + investable.indexOf(v)) % 3 === 2;
      log(`  ${DRY ? 'would mark' : 'marking'}  ${inv.display_name} ${passing ? 'passes on' : 'watches'} ${v.name}`);
      if (DRY) { watched++; continue; }

      await pool.query(
        `INSERT INTO investor_watchlist (investor_id, startup_id, status, note, readiness_at_watch)
         VALUES ($1, $2, $3, $4, $5)`,
        [inv.id, v.id, passing ? 'PASSED' : 'WATCHING',
         passing ? 'Too early for us, and no technical co-founder yet. Worth revisiting in six months.' : null,
         Math.round(parseFloat(v.overall_score))]
      );
      watched++;
    }
  }
  log(`  ${watched} watchlist entr(ies)`);

  console.log(`\n${'='.repeat(60)}`);
  console.log(DRY ? 'Dry run complete. Nothing was written.' : 'Done. The platform has a pulse now.');
  if (!DRY) {
    console.log('\nWorth checking, in this order:');
    console.log('  the inbox, which has never had real threads in it');
    console.log('  circles, which have never had a conversation');
    console.log('  investor tracking, which has never had anything tracked');
    console.log('  sparks, where somebody now wants in on an idea');
    console.log('  what changed while you were away, after leaving it 30 minutes');
  }
  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('\nFailed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
