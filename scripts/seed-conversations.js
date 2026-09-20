require('dotenv').config();
/**
 * Real conversations, not filler.
 *
 * bring-to-life.js gives the platform a pulse: a few conversations, one team,
 * two sparks, three posts. Enough to prove the screens work. Not enough to
 * read as a place people actually use.
 *
 * This adds the content that makes it convincing: sparks across several
 * accounts, and threaded discussions in the circles with real disagreement in
 * them.
 *
 * WHY THE WRITING MATTERS MORE THAN THE VOLUME. A community full of
 * well-adjusted questions and helpful answers reads as staged, because real
 * builder conversations are not like that. People admit they are stuck. People
 * disagree. Somebody says the thing everyone was thinking and nobody wanted to
 * put in writing. Filler makes a populated product look WORSE than an empty
 * one, because empty is honest and filler is obviously fake.
 *
 * So every post below is something a person in that situation would plausibly
 * type, including the ones that are unresolved, slightly bitter, or wrong.
 *
 * This is SEEDING, not product behaviour. Nothing in the app does any of this.
 *
 * Usage:
 *   node scripts/seed-conversations.js --dry
 *   node scripts/seed-conversations.js
 */
const pool = require('../backend/shared/db');
const { createSpark, resonate } = require('../backend/sparks/sparkService');

const DRY = process.argv.includes('--dry');
const step = (s) => console.log(`\n${s}\n${'-'.repeat(s.length)}`);

/**
 * Sparks, spread across different founders and different stages of thinking.
 * Some are well formed. One is barely more than an irritation, which is what
 * a real early idea usually is.
 */
const SPARKS = [
  {
    venture: 'learnloop', domain: 'edtech',
    title: 'Every student gets the same explanation, and most of them do not need it',
    theIdea: "A class of thirty gets one explanation of quadratics. Maybe eight of them needed it phrased that way. The rest either already understood it or needed something else entirely, and we have no mechanism for telling those two groups apart in real time. I keep wondering whether the signal is already there in how they attempt the problem, before they get it wrong.",
    whyMe: "Seven years teaching maths, and the thing that still bothers me is how much I was guessing about who was actually following.",
    lookingFor: 'Someone who has built adaptive or recommendation systems and cares whether the output is actually correct, not just plausible.',
    tags: ['edtech', 'artificial intelligence'],
    resonance: "I built recommendation systems for three years and left because nobody cared whether the recommendations were good, only whether engagement went up. Education is the one place where being wrong actually costs something. I want to talk.",
  },
  {
    venture: 'paybridge', domain: 'fintech',
    title: 'Freelancers in India lose about 8% before the money even arrives',
    theIdea: "Between the platform fee, the FX spread and the receiving bank, a freelancer invoicing in dollars sees maybe 92% of it. Every individual step is defensible and the total is absurd. I do not yet know whether the fix is a better rail or just making the loss visible enough that people switch.",
    whyMe: "I have been on the receiving end of this for five years and I have watched genuinely talented people price themselves badly because they never worked out what they were actually losing.",
    lookingFor: 'Someone who understands cross-border compliance, because that is the part that will kill this if I get it wrong.',
    tags: ['fintech'],
    resonance: "I have spent six years in AML and KYC and the honest answer is that the compliance burden is most of why nobody has fixed this. It is solvable. It is just not solvable the way most people assume. Worth a conversation.",
  },
  {
    venture: 'teampulse', domain: 'hr',
    title: 'You can see burnout in a team weeks before anyone says anything',
    theIdea: "Commit times drift later. Reviews get shorter. Someone who used to argue in design discussions stops arguing. None of it is private information, all of it is already in the tools, and every manager I know has noticed it in hindsight and nobody notices it in advance. The hard part is not detection, it is doing it without building surveillance.",
    whyMe: "I have watched two teams fall apart around me and both times someone said afterwards that they saw it coming.",
    lookingFor: 'Honestly, someone who will tell me if this is creepy. I think it can be done well and I am not certain.',
    tags: ['hr tech', 'saas'],
    resonance: "It is creepy if the output goes to the manager. It is not creepy if it goes to the person themselves. That distinction is the whole product and I would want it settled before writing a line of code.",
  },
  {
    venture: 'climatelens', domain: 'climate',
    title: 'Crop insurance pays out months after the farm has already failed',
    theIdea: "A smallholder loses a harvest in April and gets assessed in July. By then the damage is not the crop, it is the debt they took on to survive the gap. Satellite data could flag the loss within days. I do not know if the blocker is technical, regulatory, or just that nobody has cared enough about this customer.",
    whyMe: "My family farmed. I have watched the gap between the loss and the payout do more damage than the loss.",
    lookingFor: 'Someone who has worked with satellite or remote sensing data, or who knows the insurance side well enough to tell me where this breaks.',
    tags: ['climate', 'artificial intelligence'],
    resonance: "I work with satellite imagery for agriculture. The technical side is more solved than you would think. The reason nobody does it is that the payout model is built around assessment cost, not speed, and that is a business model problem wearing a technology costume.",
  },
];

/**
 * Circle discussions. Threaded, with real disagreement.
 *
 * Deliberately not all resolved. A room where every question gets a clean
 * answer reads as a FAQ, not a conversation.
 */
const DISCUSSIONS = [
  {
    room: 'fintech',
    authorIs: 'contributor',
    body: "Genuine question, not rhetorical: at what point do you actually need a compliance person rather than a founder who has read a lot?\n\nI keep seeing pre-seed fintechs where someone technical has absorbed enough regulation to be dangerous. Sometimes that works for eighteen months. Sometimes it ends the company. I cannot tell from the outside what separates the two.",
    replies: [
      { founderOf: 'paybridge', body: "From the other side of this: I delayed it and I would delay it again. What changed things for us was not hiring someone, it was paying a consultant for two days to tell us which of our assumptions were wrong. Three of five were. That cost less than a month of salary and it reshaped the whole roadmap." },
      { contributor: true, body: "The thing nobody says is that it depends entirely on whether you are touching money or just data about money. Those are completely different regulatory positions and people conflate them constantly." },
      { sameAsAuthor: true, body: "That distinction is the useful part, thank you. We were treating them as the same problem." },
    ],
  },
  {
    room: 'healthcare',
    authorIs: 'contributor',
    body: "I turned down a stable job to join something at idea stage and I have been second-guessing it for three weeks.\n\nNot looking for reassurance. I want to know from people who did this: what actually told you it was working, early on, before there was any revenue to point at?",
    replies: [
      { founderOf: 'neura', body: "For us it was the third clinic asking when they could have it, without us having asked them anything. Before that every positive signal was something we had gone looking for, which means it was worthless." },
      { contributor: true, body: "Honestly? Nothing told me. I did it twice, one worked and one did not, and I could not have distinguished them at three weeks in. The thing I would actually check is whether you still believe the problem is real on a bad day, because that is what you will be running on." },
    ],
  },
  {
    room: 'edtech',
    authorIs: 'contributor',
    body: "Unpopular opinion: most adaptive learning is adaptive pacing wearing a costume.\n\nIt speeds you up or slows you down. It almost never changes HOW something is explained, which is the part that actually matters when a student is stuck. Happy to be told I am wrong, I would genuinely rather be wrong about this.",
    replies: [
      { founderOf: 'learnloop', body: "You are not wrong, and it is the thing I am most worried about building. Pacing is easy to measure and easy to sell. Changing the explanation requires knowing WHY someone got it wrong, and we mostly do not." },
      { sameAsAuthor: true, body: "That is a more honest answer than I expected. The why is the whole problem. A student who has an arithmetic slip and a student who does not understand what the equation represents produce the same wrong answer." },
    ],
  },
  {
    room: 'saas',
    authorIs: 'contributor',
    body: "Has anyone here actually agreed equity with a co-founder without it getting weird?\n\nWe have been building for four months, it works, and neither of us has raised the conversation because we are both waiting for the other one to. Which is obviously the worst possible approach.",
    replies: [
      { contributor: true, body: "Four months of unsaid is already the expensive version. The thing that worked for us was writing down what each of us would do if the other left tomorrow, separately, then comparing. It turned a negotiation about feelings into a conversation about work." },
    ],
  },
  {
    room: 'cybersecurity',
    authorIs: 'contributor',
    body: "Every security startup pitch I read says the same three things about the threat landscape and none of them say what they would actually do differently.\n\nIf you are building in this space: what is the thing you believe that most of your competitors would disagree with?",
    replies: [
      { founderOf: 'securelayer', body: "That mid-market companies do not want a better dashboard. They want somebody to tell them which two things to fix this quarter. Everyone builds visibility and nobody builds prioritisation, because prioritisation means being wrong in public." },
    ],
  },
];


/**
 * Real people, resolved at runtime.
 *
 * The first version hardcoded email addresses and two of them did not exist,
 * because I wrote them from memory. Naming accounts that may not be there is
 * how a seeding script half-runs and leaves the data in a worse state than
 * before it started.
 *
 * Everybody is looked up from the database now: a founder by their venture, a
 * contributor by the field they actually chose. If nobody fits, the entry is
 * skipped and says so, rather than failing partway through.
 */
const pickedContributors = new Set();

async function founderOf(startupNameFragment) {
  const r = await pool.query(
    `SELECT s.founder_id AS id, p.display_name
     FROM startups s JOIN profiles p ON p.user_id = s.founder_id
     JOIN users u ON u.id = s.founder_id
     WHERE lower(s.name) LIKE $1 AND u.email LIKE '%@seed.test'
     LIMIT 1`,
    [`%${startupNameFragment.toLowerCase()}%`]
  );
  return r.rows[0] || null;
}

/**
 * A contributor who genuinely cares about this field, preferring somebody not
 * already used, so the same three names do not appear on every thread.
 */
async function contributorIn(domain, { exclude = [] } = {}) {
  const r = await pool.query(
    `SELECT p.user_id AS id, p.display_name, p.headline
     FROM contributor_profiles cp
     JOIN profiles p ON p.id = cp.profile_id
     JOIN users u ON u.id = p.user_id
     WHERE u.primary_role = 'CONTRIBUTOR' AND u.email LIKE '%@seed.test'
       AND EXISTS (
         SELECT 1 FROM unnest(COALESCE(cp.preferred_domains, ARRAY[]::text[])) d
         WHERE lower(d) LIKE $1
       )
       ${exclude.length ? `AND p.user_id != ALL($2::uuid[])` : ''}
     ORDER BY random() LIMIT 1`,
    exclude.length ? [`%${domain.toLowerCase()}%`, exclude] : [`%${domain.toLowerCase()}%`]
  );
  if (r.rows[0]) return r.rows[0];

  // Nobody in that field: any contributor is better than skipping the thread,
  // since the point is a populated room rather than a perfect casting.
  const any = await pool.query(
    `SELECT p.user_id AS id, p.display_name, p.headline
     FROM contributor_profiles cp
     JOIN profiles p ON p.id = cp.profile_id
     JOIN users u ON u.id = p.user_id
     WHERE u.primary_role = 'CONTRIBUTOR' AND u.email LIKE '%@seed.test'
       ${exclude.length ? `AND p.user_id != ALL($1::uuid[])` : ''}
     ORDER BY random() LIMIT 1`,
    exclude.length ? [exclude] : []
  );
  return any.rows[0] || null;
}

(async () => {
  if (DRY) console.log('DRY RUN. Nothing will be written.\n');

  // ---- Sparks ----
  step('Sparks');
  let sparks = 0, sparkSkipped = 0;

  for (const spec of SPARKS) {
    const author = await founderOf(spec.venture);
    if (!author) { console.log(`  skip  no venture matching "${spec.venture}"`); sparkSkipped++; continue; }
    const authorId = author.id;

    const existing = await pool.query('SELECT id FROM sparks WHERE author_id = $1 AND title = $2', [authorId, spec.title]);
    if (existing.rows.length > 0) { console.log(`  skip  already posted: "${spec.title.slice(0, 44)}..."`); sparkSkipped++; continue; }

    console.log(`  ${DRY ? 'would post' : 'posting'}  "${spec.title.slice(0, 52)}..."`);
    if (DRY) { sparks++; continue; }

    const r = await createSpark(authorId, {
      title: spec.title, theIdea: spec.theIdea, whyMe: spec.whyMe,
      lookingFor: spec.lookingFor, tags: spec.tags,
    });
    if (!r.success) { console.log(`    failed: ${r.error}`); continue; }
    sparks++;

    const resonator = await contributorIn(spec.domain, { exclude: [authorId, ...pickedContributors] });
    if (resonator && resonator.id !== authorId) {
      pickedContributors.add(resonator.id);
      const res = await resonate(r.spark.id, resonator.id, spec.resonance);
      console.log(res.success ? `    ${resonator.display_name} wants in` : `    resonate failed: ${res.error}`);
    }
  }
  console.log(`  ${sparks} posted, ${sparkSkipped} already there`);

  // ---- Discussions ----
  step('Circle discussions');
  let threads = 0, posts = 0;

  for (const d of DISCUSSIONS) {
    const author = await contributorIn(d.room, { exclude: [...pickedContributors] });
    if (!author) { console.log(`  skip  nobody available to start a thread in ${d.room}`); continue; }
    const authorId = author.id;
    pickedContributors.add(authorId);

    const existing = await pool.query('SELECT id FROM room_posts WHERE room = $1 AND body = $2', [d.room, d.body]);
    if (existing.rows.length > 0) { console.log(`  skip  already posted in ${d.room}`); continue; }

    console.log(`  ${DRY ? 'would start' : 'starting'}  a thread in ${d.room} (${d.replies.length} ${d.replies.length === 1 ? 'reply' : 'replies'})`);
    if (DRY) { threads++; posts += 1 + d.replies.length; continue; }

    const parent = await pool.query(
      'INSERT INTO room_posts (room, author_id, body) VALUES ($1, $2, $3) RETURNING id',
      [d.room, authorId, d.body]
    );
    threads++; posts++;

    for (const reply of d.replies) {
      let replier = null;
      if (reply.sameAsAuthor) replier = author;
      else if (reply.founderOf) replier = await founderOf(reply.founderOf);
      else replier = await contributorIn(d.room, { exclude: [authorId, ...pickedContributors] });

      if (!replier) { console.log(`    (no one available for a reply, skipping it)`); continue; }
      const replierId = replier.id;
      if (!reply.sameAsAuthor && !reply.founderOf) pickedContributors.add(replierId);
      await pool.query(
        'INSERT INTO room_posts (room, author_id, body, parent_id) VALUES ($1, $2, $3, $4)',
        [d.room, replierId, reply.body, parent.rows[0].id]
      );
      posts++;
      // Presence, so the room reads as somewhere people have actually been
      // rather than a wall of text nobody visited.
      await pool.query(
        `INSERT INTO room_presence (room, user_id) VALUES ($1, $2)
         ON CONFLICT (room, user_id) DO UPDATE SET last_seen_at = now()`,
        [d.room, replierId]
      );
    }
    await pool.query(
      `INSERT INTO room_presence (room, user_id) VALUES ($1, $2)
       ON CONFLICT (room, user_id) DO UPDATE SET last_seen_at = now()`,
      [d.room, authorId]
    );

    // Mark a couple of the sharper replies as having helped somebody, since a
    // room where nothing is ever acknowledged reads as ignored.
    const replies = await pool.query(
      'SELECT id FROM room_posts WHERE parent_id = $1 ORDER BY created_at LIMIT 2',
      [parent.rows[0].id]
    );
    for (const rep of replies.rows) {
      await pool.query(
        `INSERT INTO room_post_helped (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [rep.id, authorId]
      );
    }
  }
  console.log(`  ${threads} thread(s), ${posts} post(s) in total`);

  console.log(`\n${'='.repeat(60)}`);
  console.log(DRY ? 'Dry run complete. Nothing was written.' : 'Done.');
  if (!DRY) {
    console.log('\nWorth reading:');
    console.log('  Circles > fintech      when do you need a compliance person');
    console.log('  Circles > healthcare   someone second-guessing leaving a stable job');
    console.log('  Circles > edtech       a founder agreeing with a criticism of their own product');
    console.log('  Sparks                 four new ideas, each with somebody already wanting in');
  }
  await pool.end();
  process.exit(0);
})().catch((err) => { console.error('Failed:', err.message); process.exit(1); });
