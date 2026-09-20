require('dotenv').config();
/**
 * Fill out the platform properly.
 *
 * Two things bring-to-life.js leaves thin:
 *
 *   Exactly ONE team has formed, so every venture looks like it is still
 *   searching and nothing looks like it worked.
 *
 *   Only three circles have anything in them, so most rooms read as
 *   abandoned, which is worse than empty. An empty room is new. A room with
 *   nothing in it and people listed as members is dead.
 *
 * THE BALANCE THAT MATTERS FOR TEAMS. It would be easy to fill every venture,
 * and it would ruin the demonstration: if nobody has open roles, the entire
 * matching side of the product has nothing left to show. A few ventures with
 * partial teams and most still hiring is both more realistic and more useful.
 * So this forms teams on ventures that will STILL have open roles afterwards,
 * and never fills a venture completely.
 *
 * THE WRITING, AGAIN. Every discussion here is something a person in that
 * situation would actually type, including the unresolved ones. A room full of
 * tidy questions and helpful answers reads as staged. Filler makes a populated
 * product look worse than an empty one.
 *
 * This is SEEDING, not product behaviour.
 *
 * Usage:
 *   node scripts/seed-depth.js --dry
 *   node scripts/seed-depth.js
 */
const pool = require('../backend/shared/db');
const { startOrGetConversation, sendMessage, confirmTeamFormation } = require('../backend/conversations/conversationService');

const DRY = process.argv.includes('--dry');
const TEAMS_TO_FORM = 5;
const step = (s) => console.log(`\n${s}\n${'-'.repeat(s.length)}`);

/**
 * One discussion per circle, in the person's own voice for that field.
 *
 * `starter` is who opens it: a contributor asking, or a founder thinking
 * aloud. `replies` mark who answers, resolved at runtime so this can never
 * name an account that does not exist.
 */
const DISCUSSIONS = [
  {
    room: 'saas',
    body: "How long did you give your first version before deciding it was not working?\n\nWe are four months in with eleven users and I genuinely cannot tell whether that is early or terminal. Everyone I ask tells me a different number and they all sound confident.",
    replies: [
      { who: 'founder', body: "Eleven users who use it, or eleven who signed up? We had sixty signups and four people who actually opened it twice, and the four were the only number that meant anything. Took me too long to stop counting the sixty." },
      { who: 'contributor', body: "Nobody can answer this for you because the number is not the signal. What did the eleven do after they used it once? That is the thing to look at." },
    ],
  },
  {
    room: 'logistics',
    body: "Every logistics pitch I see is a dashboard. Does anyone actually believe the problem is visibility?\n\nThe operators I have spoken to can already see the delay. They just cannot do anything about it, and no amount of showing it to them faster changes that.",
    replies: [
      { who: 'founder', body: "This is right and it took me eight months to accept it. We built visibility because it is easy to demo. What people paid for was the one screen that said which shipment to reroute first." },
    ],
  },
  {
    room: 'climate',
    body: "Serious question about climate startups and the funding cycle.\n\nMost of what I see needs five to seven years to prove anything, and is funded on a three year horizon. How are people squaring that, or is everyone just not talking about it?",
    replies: [
      { who: 'contributor', body: "Mostly not talking about it. The ones I have seen work out either had a near-term revenue line that was unrelated to the climate thesis, or found a grant structure that does not behave like venture money." },
      { who: 'founder', body: "We split it deliberately: a boring product that pays now, and the thing we actually care about running behind it. It is not romantic and it is the reason we still exist." },
    ],
  },
  {
    room: 'healthcare',
    body: "How much do you tell a clinical advisor before they have signed anything?\n\nWe need their input to know if the product is even viable, and they need to see the product to give input. I keep going round this and it feels like I am either being paranoid or naive.",
    replies: [
      { who: 'contributor', body: "Paranoid. Clinicians who advise startups have seen a hundred of these and the specifics of yours are not what makes it work. Show them. The thing worth protecting is the customer relationships, not the idea." },
    ],
  },
  {
    room: 'cybersecurity',
    body: "Does anyone else find that security buyers say they want automation and then refuse to let anything run unattended?\n\nEvery conversation ends with them asking for a human approval step, which removes most of the value. I do not know if that is a product problem or a trust problem I am supposed to solve some other way.",
    replies: [
      { who: 'founder', body: "It is a trust problem and it is solvable, just not by arguing. We shipped it read-only for three months, showed them every action it WOULD have taken, and then they asked us to turn it on. Nobody was ever going to agree to it in a meeting." },
    ],
  },
  {
    room: 'biotech',
    body: "The gap between what works in a lab and what survives contact with an actual lab workflow is enormous and nobody warns you.\n\nWe built something technically correct that added a step to a process people already resent. It did not matter that it was better.",
    replies: [
      { who: 'contributor', body: "This is the whole job in lab software. If it is not fewer clicks than what they do now, it is dead, however good the output is." },
    ],
  },
  {
    room: 'hr tech',
    body: "Where is the line between useful and surveillance?\n\nI keep coming back to this and I do not have a clean answer. Everything that would genuinely help a manager also reads as monitoring if you describe it slightly differently.",
    replies: [
      { who: 'founder', body: "The line is who the output goes to. If it goes to the person it is about, it is a tool. If it goes to their manager without them seeing it, it is surveillance. Everything else is a detail." },
      { who: 'contributor', body: "I would add: if you would not be comfortable showing someone exactly what you collected about them, you already know the answer." },
    ],
  },
  {
    room: 'proptech',
    body: "Small landlords are the most underserved customer I have ever looked at and the hardest to reach.\n\nThey have real problems and no budget, no procurement process, and no reason to trust software. Has anyone found a channel that actually works here?",
    replies: [
      { who: 'contributor', body: "Property managers, not landlords. They hold twenty doors each and they are the ones feeling the pain twenty times over. Selling to the individual owner is a treadmill." },
    ],
  },
  {
    room: 'real estate',
    body: "Rent collection is apparently a solved problem and yet every small landlord I know still chases people on WhatsApp.\n\nWhat is actually stopping adoption here? I cannot tell if it is the software or the habit.",
    replies: [
      { who: 'founder', body: "Habit, and the fact that the tenant has to change behaviour but the landlord buys the product. You are asking someone to pay so that somebody else changes what they do." },
    ],
  },
  {
    room: 'legal tech',
    body: "Anyone working on contract tooling: how do you handle being wrong?\n\nA missed clause is not a bad recommendation, it is a liability. I do not understand how people ship this confidently and I am suspicious of the ones who do.",
    replies: [
      { who: 'founder', body: "You do not ship it as an answer. You ship it as a first pass that flags what to look at, and you are relentless about never phrasing output as a conclusion. The moment it sounds certain, somebody stops reading the contract." },
    ],
  },
  {
    room: 'creator economy',
    body: "Creators do not want another dashboard. They want to know if this month was better than last month and why.\n\nEvery tool in this space gives them twelve charts and no answer. I think the whole category is solving for the wrong thing.",
    replies: [
      { who: 'contributor', body: "Agreed, and the reason is that the data is easy and the judgement is hard. Twelve charts is what you build when you do not want to commit to an interpretation." },
    ],
  },
  {
    room: 'artificial intelligence',
    body: "How are people handling the fact that the model is the least defensible part of the product?\n\nAnyone can call the same API. I keep being told the moat is data or workflow and I want to hear from someone who has actually found that to be true rather than said it in a pitch.",
    replies: [
      { who: 'founder', body: "Workflow, genuinely. The model is a commodity and our advantage is that we know which three things a user does before they need the output, and we are already there when they do." },
      { who: 'contributor', body: "The honest version is that for most products there is no moat and that is fine. Being first and being good is a position, it is just not a defensible one, and people are afraid to say that." },
    ],
  },
];

async function pickContributor(domain, used) {
  const r = await pool.query(
    `SELECT p.user_id AS id, p.display_name FROM contributor_profiles cp
     JOIN profiles p ON p.id = cp.profile_id
     JOIN users u ON u.id = p.user_id
     WHERE u.primary_role = 'CONTRIBUTOR' AND u.email LIKE '%@seed.test'
       AND p.user_id != ALL($1::uuid[])
       AND EXISTS (SELECT 1 FROM unnest(COALESCE(cp.preferred_domains, ARRAY[]::text[])) d
                   WHERE lower(d) LIKE $2)
     ORDER BY random() LIMIT 1`,
    [used, `%${domain.toLowerCase()}%`]
  );
  if (r.rows[0]) return r.rows[0];
  const any = await pool.query(
    `SELECT p.user_id AS id, p.display_name FROM contributor_profiles cp
     JOIN profiles p ON p.id = cp.profile_id
     JOIN users u ON u.id = p.user_id
     WHERE u.primary_role = 'CONTRIBUTOR' AND u.email LIKE '%@seed.test'
       AND p.user_id != ALL($1::uuid[])
     ORDER BY random() LIMIT 1`,
    [used]
  );
  return any.rows[0] || null;
}

async function pickFounder(domain, used) {
  const r = await pool.query(
    `SELECT s.founder_id AS id, p.display_name FROM startups s
     JOIN profiles p ON p.user_id = s.founder_id
     JOIN users u ON u.id = s.founder_id
     WHERE u.email LIKE '%@seed.test' AND s.founder_id != ALL($1::uuid[])
       AND EXISTS (SELECT 1 FROM unnest(COALESCE(s.domain, ARRAY[]::text[])) d
                   WHERE lower(d) LIKE $2)
     ORDER BY random() LIMIT 1`,
    [used, `%${domain.toLowerCase()}%`]
  );
  if (r.rows[0]) return r.rows[0];
  const any = await pool.query(
    `SELECT s.founder_id AS id, p.display_name FROM startups s
     JOIN profiles p ON p.user_id = s.founder_id
     JOIN users u ON u.id = s.founder_id
     WHERE u.email LIKE '%@seed.test' AND s.founder_id != ALL($1::uuid[])
     ORDER BY random() LIMIT 1`,
    [used]
  );
  return any.rows[0] || null;
}

(async () => {
  if (DRY) console.log('DRY RUN. Nothing will be written.\n');

  // ---- TEAMS ----
  step(`Forming teams (target ${TEAMS_TO_FORM})`);

  // Strong matches on ventures that will still have open roles afterwards.
  // Filling a venture completely removes it from the matching side of the
  // product, which is the thing the demonstration is actually about.
  // The threshold is deliberately the same bar the product itself uses to
  // show a match at all. An earlier version required 0.50 and formed ZERO
  // teams without saying why: the mismatch dampener had lowered real scores
  // since that number was picked, and a hardcoded threshold silently stopped
  // matching reality. A seeding script that does nothing and reports success
  // is worse than one that fails loudly.
  const MIN_FIT = 0.35;

  const pool_all = (await pool.query(
    `SELECT DISTINCT ON (r.startup_id)
            r.target_user_id, r.startup_id, r.source_gap_id, r.score,
            s.founder_id, s.name AS startup_name, p.display_name AS who,
            (SELECT COUNT(*) FROM gaps g2
             WHERE g2.startup_id = s.id AND g2.status NOT IN ('FILLED','DISMISSED')) AS open_roles,
            EXISTS (SELECT 1 FROM conversations c
                    WHERE c.startup_id = r.startup_id AND c.team_formed_at IS NOT NULL) AS already_formed
     FROM recommendations r
     JOIN startups s ON s.id = r.startup_id
     JOIN profiles p ON p.user_id = r.target_user_id
     JOIN gaps g ON g.id = r.source_gap_id
     WHERE r.recommendation_type = 'CONTRIBUTOR' AND r.status = 'ACTIVE'
       AND g.status NOT IN ('FILLED','DISMISSED')
     ORDER BY r.startup_id, r.score DESC`
  )).rows;

  // Say what was rejected and why, so a zero result is explicable rather than
  // mysterious.
  const tooWeak = pool_all.filter(c => parseFloat(c.score) < MIN_FIT).length;
  const alreadyDone = pool_all.filter(c => c.already_formed).length;
  const tooFull = pool_all.filter(c => parseInt(c.open_roles) < 2).length;

  const candidates = pool_all
    .filter(c => parseFloat(c.score) >= MIN_FIT)
    .filter(c => !c.already_formed)
    .filter(c => parseInt(c.open_roles) >= 2)  // leave something open
    .sort((a, b) => parseFloat(b.score) - parseFloat(a.score))
    .slice(0, TEAMS_TO_FORM);

  console.log(`  ${pool_all.length} venture(s) with a best match; ${candidates.length} eligible`);
  if (candidates.length === 0) {
    console.log(`    ${tooWeak} below ${Math.round(MIN_FIT * 100)}% fit`);
    console.log(`    ${alreadyDone} already have a formed team`);
    console.log(`    ${tooFull} would be left with fewer than 2 open roles`);
    const best = pool_all.sort((a, b) => parseFloat(b.score) - parseFloat(a.score))[0];
    if (best) console.log(`    best available anywhere: ${Math.round(parseFloat(best.score) * 100)}% (${best.who} at ${best.startup_name})`);
  }

  let formed = 0;
  for (const c of candidates) {
    console.log(`  ${DRY ? 'would form' : 'forming'}  ${c.who} joins ${c.startup_name} (${Math.round(parseFloat(c.score) * 100)}% fit, ${c.open_roles} roles open)`);
    if (DRY) { formed++; continue; }

    const convo = await startOrGetConversation(c.target_user_id, c.founder_id, {
      startupId: c.startup_id, gapId: c.source_gap_id,
    });
    if (!convo.success) { console.log(`    could not open a conversation: ${convo.error}`); continue; }

    await sendMessage(convo.conversation.id, c.target_user_id,
      "I read what you are building and I would like to be part of it. What does the next three months actually look like?");
    await sendMessage(convo.conversation.id, c.founder_id,
      "Messy, honestly. But the problem is real and I would rather have someone who asks that question than someone who does not.");

    // Both sides confirm. This exercises the real formation path, which
    // recalculates readiness and fills the gap.
    await confirmTeamFormation(convo.conversation.id, c.target_user_id);
    const b = await confirmTeamFormation(convo.conversation.id, c.founder_id);
    if (b.success && b.bothConfirmed) { console.log(`    formed`); formed++; }
    else console.log(`    confirm did not complete: ${b.error || 'unknown'}`);
  }
  console.log(`  ${formed} team(s)`);

  // ---- DISCUSSIONS ----
  step('Discussions, one per circle');

  let threads = 0, posts = 0, skipped = 0;
  const usedContributors = [];
  const usedFounders = [];

  for (const d of DISCUSSIONS) {
    const existing = await pool.query('SELECT id FROM room_posts WHERE room = $1 AND body = $2', [d.room, d.body]);
    if (existing.rows.length > 0) { console.log(`  skip  ${d.room} already has this`); skipped++; continue; }

    const starter = await pickContributor(d.room, usedContributors);
    if (!starter) { console.log(`  skip  nobody available for ${d.room}`); skipped++; continue; }

    console.log(`  ${DRY ? 'would start' : 'starting'}  ${d.room} — ${starter.display_name} (${d.replies.length} ${d.replies.length === 1 ? 'reply' : 'replies'})`);
    if (DRY) { threads++; posts += 1 + d.replies.length; continue; }

    usedContributors.push(starter.id);
    const parent = await pool.query(
      'INSERT INTO room_posts (room, author_id, body) VALUES ($1, $2, $3) RETURNING id',
      [d.room, starter.id, d.body]
    );
    threads++; posts++;

    for (const reply of d.replies) {
      const who = reply.who === 'founder'
        ? await pickFounder(d.room, usedFounders)
        : await pickContributor(d.room, [...usedContributors, starter.id]);
      if (!who) continue;
      (reply.who === 'founder' ? usedFounders : usedContributors).push(who.id);

      await pool.query(
        'INSERT INTO room_posts (room, author_id, body, parent_id) VALUES ($1, $2, $3, $4)',
        [d.room, who.id, reply.body, parent.rows[0].id]
      );
      posts++;
      await pool.query(
        `INSERT INTO room_presence (room, user_id) VALUES ($1, $2)
         ON CONFLICT (room, user_id) DO UPDATE SET last_seen_at = now()`,
        [d.room, who.id]
      );
    }

    await pool.query(
      `INSERT INTO room_presence (room, user_id) VALUES ($1, $2)
       ON CONFLICT (room, user_id) DO UPDATE SET last_seen_at = now()`,
      [d.room, starter.id]
    );

    // The person who asked marks the reply that helped. A room where nothing
    // is ever acknowledged reads as ignored.
    const firstReply = await pool.query(
      'SELECT id FROM room_posts WHERE parent_id = $1 ORDER BY created_at LIMIT 1',
      [parent.rows[0].id]
    );
    if (firstReply.rows[0]) {
      await pool.query(
        'INSERT INTO room_post_helped (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [firstReply.rows[0].id, starter.id]
      );
    }
  }
  console.log(`  ${threads} thread(s), ${posts} post(s), ${skipped} skipped`);

  console.log(`\n${'='.repeat(60)}`);
  console.log(DRY ? 'Dry run complete. Nothing was written.' : 'Done.');
  if (!DRY) {
    console.log('\nEvery circle now has a conversation in it, and several ventures');
    console.log('have somebody who joined. All of them still have roles open, so the');
    console.log('matching side still has something to show.');
  }
  await pool.end();
  process.exit(0);
})().catch((err) => { console.error('Failed:', err.message); console.error(err.stack); process.exit(1); });
