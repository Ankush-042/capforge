require('dotenv').config();
/**
 * Real discussions under the five launches.
 *
 * WHY THE WRITING MATTERS MORE THAN THE VOLUME. A room full of "looks great,
 * congrats" is worse than an empty one, because empty is honest and praise is
 * obviously seeded. What makes a launch discussion worth reading is people
 * disagreeing with each other, somebody admitting they did not understand
 * what the product was for, and the founder conceding a point.
 *
 * So every message below is something a person who had actually opened that
 * interface would plausibly type, including the ones that are unresolved,
 * blunt, or wrong.
 *
 * PEOPLE ARE RESOLVED FROM THE DATABASE, not named in this file. An earlier
 * seeding script hardcoded email addresses and two of them did not exist,
 * because they were written from memory. Each speaker here is described by
 * the field they work in and a real contributor in that field is found at run
 * time. If nobody fits, anybody is used rather than dropping the message.
 *
 * Posted through the real comment path, so if that is broken this breaks too.
 * Safe to re-run: it checks whether its own first message is already there.
 *
 * Usage:
 *   node scripts/seed-launch-discussions.js --dry
 *   node scripts/seed-launch-discussions.js
 */
const db = require('../backend/shared/db');
const { comment } = require('../backend/launches/launchService');

const DRY = process.argv.includes('--dry');
const step = (s) => console.log(`\n${s}\n${'-'.repeat(s.length)}`);

/**
 * Keyed by a word in the launch title, so each attaches to whichever launch
 * the founder actually posted rather than to an id written in here.
 *
 * who:     a field to find somebody in, or 'founder'
 * tried:   whether they opened it, which changes how every other word reads
 * replyTo: index of the message being replied to
 */
const DISCUSSIONS = [
  {
    match: 'maths',
    messages: [
      { who: 'edtech', tried: true, body: "Went through about fifteen questions. The adaptive part is doing something but I could not tell what. Two in a row got easier after I answered correctly, which felt wrong until I realised it was probably the time I took. If that is the signal, say so on screen." },
      { who: 'founder', replyTo: 0, body: "That is exactly the signal, and you are right that it is invisible. The line explaining it only appears after the second question, which is clearly too late." },
      { who: 'edtech', tried: true, body: "The teacher view is the strongest screen here. Thirty-two students colour-coded and I could see in about four seconds who was stuck. I would put that in front of schools before the student side." },
      { who: 'artificial intelligence', tried: true, replyTo: 2, body: "Disagree, and fairly strongly. Schools buy on the student experience because that is what parents see. The teacher view is what makes them renew, not what makes them sign." },
      { who: 'edtech', tried: true, body: "Unpopular opinion: the hint system is too generous. It gives away a step at a time until the answer is basically done. A student who is stuck will click it four times and learn nothing." },
      { who: 'founder', replyTo: 4, body: "Fair. We made it deliberately easy while testing so nobody got frustrated and quit, but you are right that it has become a way out rather than a nudge." },
      { who: 'saas', tried: false, body: "Have not opened it, only read the description. The phrase about adjusting to how they solved it is doing a lot of work and I do not know what it means. That might be a landing page problem rather than a product one." },
    ],
  },
  {
    match: 'payment',
    messages: [
      { who: 'fintech', tried: true, body: "The fee breakdown is the whole product and it lands. Seeing the intermediary bank line separated out is the first time I have seen that stated plainly anywhere. Most people genuinely do not know that charge exists." },
      { who: 'fintech', tried: true, body: "I want to push back on the comparison though. You are comparing against the worst case, a full service bank with no negotiation. Anybody invoicing twelve hundred dollars regularly has already moved to Wise or similar, and against that your margin looks much thinner." },
      { who: 'founder', replyTo: 1, body: "That is the objection I get most and I do not have a clean answer yet. The honest version is that we are better for smaller and irregular amounts and roughly level above a certain size." },
      { who: 'fintech', tried: true, replyTo: 1, body: "Depends who you mean. Every freelancer I know under about four lakh a year is still on their bank and has no idea what they are paying. That is a real market even if it is not the profitable one." },
      { who: 'saas', tried: true, body: "The rate lock screen confused me. I could not tell whether locking costs anything, and a countdown next to a number always makes me assume I am being rushed. I would state the cost even if it is zero." },
      { who: 'founder', replyTo: 4, body: "It is zero, and you are the third person to assume otherwise, so that is a wording problem rather than a pricing one." },
      { who: 'legal tech', tried: true, body: "Nothing on screen tells me who holds the money between my client paying and it reaching my account. For a payments product that is the first thing I want to know and I could not find it anywhere." },
      { who: 'logistics', tried: false, body: "Have not opened it. Going on the description alone, eight percent is a number I would want a source for. If that is measured from real invoices, say so, because it is the single most persuasive thing here and right now it reads as an estimate." },
    ],
  },
  {
    match: 'rent',
    messages: [
      { who: 'proptech', tried: true, body: "This is the first property tool I have seen that does not look designed for somebody managing four hundred units. The overdue list is genuinely readable. I would show this to my father and he would understand it, which is not something I say often." },
      { who: 'saas', tried: true, body: "Showing the exact WhatsApp message before it sends is the best decision in here. Everybody else hides that behind a template editor and people stop trusting it." },
      { who: 'proptech', tried: true, body: "Honest criticism: it is plain to the point of looking unfinished. I understand the reasoning, but there is a difference between plain and unstyled and a couple of these screens are on the wrong side of it." },
      { who: 'founder', replyTo: 2, body: "That is a fair hit and I over-corrected. The intent was that it should not look like software you need training for, but some of it just looks like nothing." },
      { who: 'real estate', tried: true, body: "The thing missing is what happens when somebody does not pay for three months. That is the actual nightmare for a small landlord and there is nowhere in here that helps with it." },
      { who: 'proptech', tried: true, replyTo: 4, body: "Would that not become a legal product rather than a rent product? I am not sure a landlord wants both in the same place." },
      { who: 'real estate', tried: true, replyTo: 4, body: "They are the same problem from where the landlord sits. The software already knows who has not paid and for how long, which is exactly the information that matters at that point." },
      { who: 'fintech', tried: false, body: "Not opened it, going on the description. Small landlords are famously unwilling to pay for anything, and nothing here tells me why this one is different. That is the question I would answer before the screens." },
    ],
  },
  {
    match: 'retinopathy',
    messages: [
      { who: 'healthcare', tried: true, body: "The verdict screen is right. Big, unambiguous, reason in plain language underneath. I have used clinical tools that bury the recommendation under three confidence intervals and nobody reads them." },
      { who: 'healthcare', tried: true, body: "One thing worries me. Refer urgently and monitor look too similar at a glance. In a real PHC with a queue outside, somebody will read the shape of the screen rather than the words. They need different colours and different layouts, not the same card with different text." },
      { who: 'founder', replyTo: 1, body: "Noted, and that is the kind of thing I would not have caught without somebody who has stood in that room. Changing it." },
      { who: 'artificial intelligence', tried: true, body: "What happens when the model is not confident? I clicked through three patients and got a clear verdict every time, which cannot be right. An honest cannot tell, refer anyway is more useful than a confident wrong answer here." },
      { who: 'founder', replyTo: 3, body: "The interface does not show that state yet. It exists in the thinking and not on screen, which is the same as not existing." },
      { who: 'healthcare', tried: true, body: "The capture frame guide is good but it assumes a steady hand and reasonable light. Worth showing what a bad image looks like so the worker knows to retake it rather than sending something unreadable." },
      { who: 'biotech', tried: false, body: "Reading the description only. The part I would want stated is who is accountable for a wrong call. Not a design question, but it is the first thing anybody at district level will ask." },
    ],
  },
  {
    match: 'creator',
    messages: [
      { who: 'creator economy', tried: true, body: "The screen about what is worth repeating is the reason to use this. I have never once been able to answer that question and I have been at this four years. Seeing one newsletter out-earn four videos would change what I do next week." },
      { who: 'fintech', tried: true, body: "The tax screen made me uncomfortable in a useful way. Showing money set aside next to money owed is the right pairing, though I would be careful how precise the estimate looks. People will treat it as advice." },
      { who: 'creator economy', tried: true, replyTo: 1, body: "Strongly agree. Round it or band it. A number to the rupee implies you have filed it for me." },
      { who: 'founder', replyTo: 1, body: "Both fair. It is currently far too precise for something that is an estimate from incomplete data." },
      { who: 'saas', tried: true, body: "Six platforms in one number is the pitch, but the screen does not tell me how the data gets there. If it is manual entry this is a very different product from what it looks like, and I would say so up front." },
      { who: 'creator economy', tried: true, body: "Small thing that is not small: the breakdown uses platform names but not their colours or icons. I scan by colour, everybody in this space does, and it took me twice as long to read as it should have." },
      { who: 'hr tech', tried: false, body: "Not my field and I have not opened it, but the description reads like a finance tool for people who hate finance tools. That is a good line and it is not on the screen anywhere." },
    ],
  },
];

async function pickPerson(domain, used) {
  const r = await db.query(
    `SELECT p.user_id AS id, p.display_name
     FROM contributor_profiles cp
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

  // Nobody in that field. Anybody is better than dropping the message: the
  // point is a populated room, not perfect casting.
  const any = await db.query(
    `SELECT p.user_id AS id, p.display_name
     FROM contributor_profiles cp
     JOIN profiles p ON p.id = cp.profile_id
     JOIN users u ON u.id = p.user_id
     WHERE u.primary_role = 'CONTRIBUTOR' AND u.email LIKE '%@seed.test'
       AND p.user_id != ALL($1::uuid[])
     ORDER BY random() LIMIT 1`,
    [used]
  );
  return any.rows[0] || null;
}

(async () => {
  if (DRY) console.log('DRY RUN. Nothing will be written.\n');

  const launches = (await db.query(
    `SELECT l.id, l.title, l.founder_id, s.name AS startup_name
     FROM launches l JOIN startups s ON s.id = l.startup_id
     ORDER BY l.posted_at`
  )).rows;

  if (launches.length === 0) {
    console.log('No launches have been posted yet. Put them up first.');
    await db.end();
    process.exit(1);
  }
  console.log(`${launches.length} launch(es) posted.`);

  let totalPosted = 0, skipped = 0;

  for (const d of DISCUSSIONS) {
    const launch = launches.find((l) =>
      l.title.toLowerCase().includes(d.match) || l.startup_name.toLowerCase().includes(d.match));

    if (!launch) { console.log(`\n  skip  no launch matching "${d.match}"`); skipped++; continue; }

    step(`${launch.startup_name} — ${launch.title.slice(0, 48)}`);

    const already = await db.query(
      `SELECT 1 FROM launch_comments WHERE launch_id = $1 AND body = $2`,
      [launch.id, d.messages[0].body]
    );
    if (already.rows.length > 0) { console.log('  skip  this discussion is already there'); skipped++; continue; }

    const used = [launch.founder_id];
    const postedIds = [];

    for (const [i, m] of d.messages.entries()) {
      let speaker;
      if (m.who === 'founder') {
        speaker = { id: launch.founder_id, display_name: 'the founder' };
      } else {
        speaker = await pickPerson(m.who, used);
        if (!speaker) { console.log(`  skip  nobody available for message ${i + 1}`); postedIds.push(null); continue; }
        // Somebody who already spoke can speak again, which is what an
        // argument actually looks like, but not on every line.
        if (i % 2 === 0) used.push(speaker.id);
      }

      const parentId = m.replyTo !== undefined ? postedIds[m.replyTo] : null;
      console.log(`  ${DRY ? 'would post' : 'posting'}  ${speaker.display_name}${m.replyTo !== undefined ? ' (reply)' : ''}: ${m.body.slice(0, 52)}...`);

      if (DRY) { postedIds.push(`dry-${i}`); totalPosted++; continue; }

      const r = await comment(speaker.id, launch.id, {
        body: m.body,
        parentId: parentId || undefined,
        triedIt: m.tried,
      });
      if (!r.success) { console.log(`    failed: ${r.error}`); postedIds.push(null); continue; }
      postedIds.push(r.comment.id);
      totalPosted++;
    }
  }

  console.log(`\n${'='.repeat(64)}`);
  console.log(DRY
    ? `Dry run complete. ${totalPosted} message(s) would be posted.`
    : `Done. ${totalPosted} message(s) posted, ${skipped} discussion(s) skipped.`);
  if (!DRY && totalPosted > 0) {
    console.log('\nNow log in as any of the five founders, open their launch, and ask');
    console.log('the assistant: "What is the main thing stopping people?"');
  }
  await db.end();
  process.exit(0);
})().catch((e) => { console.error('\nFailed:', e.message); console.error(e.stack); process.exit(1); });
