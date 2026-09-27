require('dotenv').config();
/**
 * Conversations, sparks and circle posts for the ten new ventures.
 *
 * WHAT WAS MISSING AND WHY IT MATTERED. The depth pass gave the ten ventures
 * teams, readiness history and investors watching, and gave them no
 * conversations at all. That left something visibly wrong rather than merely
 * thin: people had JOINED these teams with no exchange explaining how, and on
 * this platform a team forms out of a conversation. A founder opening
 * Messages saw nothing while the Team page showed two people who had
 * apparently arrived from nowhere.
 *
 * So the conversations here are the ones that actually happened: the exchange
 * that ended with somebody joining. They are written backwards from the
 * outcome, which is why each one names the specific thing that venture is
 * about rather than being a generic approach.
 *
 * NOTHING TOUCHES LAUNCHES. Those need a real interface behind them and are
 * being handled separately.
 *
 * Everything goes through the real services, so this exercises the same code
 * a person does. Safe to re-run: each step checks its own first line.
 *
 * Usage:
 *   node scripts/seed-10-conversations.js --dry
 *   node scripts/seed-10-conversations.js
 */
const pool = require('../backend/shared/db');
const { startOrGetConversation, sendMessage } = require('../backend/conversations/conversationService');
const { createSpark, resonate } = require('../backend/sparks/sparkService');
const { createPost } = require('../backend/rooms/roomsService');

const DRY = process.argv.includes('--dry');
const DAY = 86400000;
const ago = (d) => new Date(Date.now() - d * DAY).toISOString();
const rand = (a, b) => a + Math.random() * (b - a);
const step = (s) => console.log(`\n${s}\n${'-'.repeat(s.length)}`);

/**
 * The exchange that ended with somebody joining, per venture. F is the
 * founder, C is the person who joined.
 *
 * Written backwards from an outcome that already exists in the database, so
 * each one is about that venture's actual problem rather than a template with
 * a name swapped in.
 */
const JOINING = {
  Bhasha: [
    ['C', "I taught in a Marathi-medium school for two years before moving into product, and the thing you describe in your second paragraph is the thing I could never explain to anybody outside that building. Children being moved into remedial maths for a reading problem."],
    ['F', "Then you already know the part I struggle to get across: the teacher usually knows. She just cannot prove it, so the process wins."],
    ['C', "What are you doing about the assessment itself? Translating an English question into Marathi is not the same as writing a Marathi question, and if you are doing the first one you will get numbers that look right and mean nothing."],
    ['F', "That is the whole difficulty and we do not have it solved. Right now items are written in Marathi first and checked back, which is slow and does not scale past one language."],
    ['C', "It scales if the item bank is built as concepts rather than sentences. I have wanted to build that for three years and never had a reason to."],
    ['F', "You have one now if you want it. I would rather have somebody who has stood in the classroom than somebody who has read about it."],
  ],
  DoseTrack: [
    ['C', "I build hardware and I have a bias I should declare: almost everything in this category should not be hardware. Yours probably should be, which is why I am writing."],
    ['F', "Say more about the bias, I would rather hear the objection than the compliment."],
    ['C', "Most connected-device products exist because a phone app was hard to get people to open, and the device does not fix that, it just moves the problem and adds a battery. Yours is different because the phone was never going to be the interface for a 71-year-old who uses it for calls."],
    ['F', "That is exactly the reasoning. It took us four months to stop trying to make the app work."],
    ['C', "Then the hard problem is the box, and specifically the battery. If it needs charging weekly you have built something that fails in month two."],
    ['F', "Agreed, and I do not have an answer. What would you want, realistically?"],
    ['C', "A year on a coin cell, which means the radio almost never wakes. It is doable and it constrains everything else. I would like to work on it."],
  ],
  NinetyDays: [
    ['C', "My father ran a small engineering unit in Rajkot. The ninety days you describe was the defining fact of our household finances and I did not understand it until I was about twenty."],
    ['F', "Most people who have not lived next to it think it is a cash flow problem. It is a growth problem, which is a different thing."],
    ['C', "Right, he turned down orders. He never framed it that way, he said he was being careful."],
    ['F', "That is the sentence I hear constantly and it always means the same thing underneath."],
    ['C', "The bit I want to understand is the buyer side. Why would a large buyer confirm an invoice digitally when the ambiguity currently works in their favour?"],
    ['F', "Because it costs them nothing and their procurement team is already chasing the same confirmations by email. We are not asking them to pay earlier, we are asking them to say yes once, in a way a lender can read."],
    ['C', "That is a better answer than I expected. I would like to build it."],
  ],
  VendorGate: [
    ['C', "I have filled in about forty of those questionnaires. I know exactly which three hundred questions you mean and I have opinions about which forty actually matter."],
    ['F', "Which forty? I have a list and I want to know how far off it is."],
    ['C', "Access control, logging, backups that have actually been restored from, and knowing which vendors hold your data. Almost everything else is either downstream of those or theatre."],
    ['F', "That is close to our list. We have a few more on incident response, because that is the one where a small company genuinely has nothing."],
    ['C', "Fair. Though I would say most small companies do not have an incident response plan because they would not survive the incident anyway, so the plan is for the buyer rather than for them."],
    ['F', "Which is a bleak way of putting something true. Do you want to build this?"],
    ['C', "Yes. Mostly because I want to stop doing it by hand."],
  ],
  ProofPoint: [
    ['C', "I sat through that first technical round eleven times in my final year and got through twice, and to this day I could not tell you what I did differently on those two occasions."],
    ['F', "That is the entire problem in one sentence. Nobody is told, so nobody improves, so the same thing happens to the next batch."],
    ['C', "What I am not sure about is the college side. Does a department actually want to know its cohort is weak? That information is uncomfortable and nobody is asking them for it."],
    ['F', "Some do not. The ones who do are usually a single placement officer who already knows and cannot prove it to anybody above them."],
    ['C', "Then that person is your customer, not the institution."],
    ['F', "Yes, and it took us a while to accept that, because it makes the sale smaller and much more real."],
  ],
  Uneven: [
    ['C', "I want to check something before anything else. Are you building a budgeting app for people with irregular income, or something else that happens to look like one?"],
    ['F', "Something else. A budgeting app tells you what you should have done. What somebody earning between nine hundred and three thousand four hundred a day needs is whether a specific thing is affordable, this week, given what actually came in."],
    ['C', "Good, because the first one has been built forty times and fails for the same reason each time."],
    ['F', "Which reason do you think it is?"],
    ['C', "It assumes the problem is discipline. It is not, it is variance, and you cannot budget your way out of not knowing what next week looks like."],
    ['F', "That is the sentence I would put on the front page if it did not sound like an argument."],
    ['C', "It is an argument. That is why it is worth saying. I would like to work on this."],
  ],
  CommonRoof: [
    ['C', "I live in a society that has had this exact conversation at four AGMs. I have watched it fail three times from the inside, which I think makes me either useful or bitter."],
    ['F', "What killed it each time?"],
    ['C', "Resale, every single time. Somebody asks what happens if they sell in two years and nobody has an answer, and the meeting moves on. It is not even a hard question, it is just nobody's job to answer it."],
    ['F', "That is the one we spent the longest on and the one nobody asks about in a demo."],
    ['C', "They will once they have been in the room. Do you handle a flat that refuses to participate at all?"],
    ['F', "Yes, and that is the other one that kills it. There is always one, and if the model cannot survive them, it does not survive."],
  ],
  NineHours: [
    ['C', "The nine hours framing is right and I want to push on one part of it. Detecting the forwarding rule is easy. Knowing what to tell the office manager is not, and that is where products like this usually fall over."],
    ['F', "Say more, because that is the part I am least sure about."],
    ['C', "If you tell her there is suspicious mailbox activity she will Google it and do nothing for two hours. If you tell her to open this page, click this button, and call these three suppliers, she will do it in ten minutes. Same information, completely different outcome."],
    ['F', "So the product is the instruction rather than the detection."],
    ['C', "The detection is table stakes, somebody will commoditise it. The instruction that a non-technical person can act on under pressure is the thing that is hard and nobody bothers with."],
    ['F', "Then that is what I want you working on rather than the pipeline."],
  ],
};

/** Live threads that have not resolved. A platform where every conversation
 *  ended in a team is obviously seeded. */
const LIVE = {
  PanelRead: [
    ['C', "I work with lab systems and the thing I would want to know first is whether you can actually get the structured data out. Most Indian labs run software that exports a PDF and considers the job done."],
    ['F', "Some can, some cannot. Where they cannot, we parse, and I am not pretending that is a good answer."],
    ['C', "It is an honest one at least. Parsing a lab report is a worse problem than it sounds, because every lab formats its reference ranges differently and the errors are silent."],
    ['F', "That is what worries me about it, yes."],
  ],
  CircuitSense: [
    ['C', "How do you get past the landlord? In every commercial building I have worked in, the meter room is theirs and the tenant paying the bill has no access to it."],
    ['F', "We measure downstream of it, at the distribution board on each floor, which the tenant usually does control."],
    ['C', "That works until the tenant occupies half a floor. Then you are measuring somebody else's chillers along with theirs."],
  ],
  Bhasha: [
    ['C', "Is this only Marathi, or is the approach meant to generalise? I ask because the second one is a much harder product and a much more interesting one."],
    ['F', "Meant to generalise, currently only Marathi, and I would rather say that plainly than imply otherwise."],
  ],
};

/** Sparks from the new founders. A spark is a thought put out before it is a
 *  venture, so these are adjacent to what they are building rather than a
 *  restatement of it. */
const SPARKS = [
  {
    founder: 'founder.bhasha@seed.test',
    title: 'Every exam in this country is a reading test wearing a maths costume',
    theIdea: "I have been saying this about school assessment for years and I now think it is true of every competitive exam too. We test comprehension speed under time pressure and then call the result aptitude. Somebody should look at what a genuinely language-neutral aptitude test would even look like, because I am not sure anybody has tried.",
    whyMe: "Six years teaching in a Marathi-medium school and two years building assessment since.",
    lookingFor: "Somebody who has worked on psychometrics or test design and can tell me whether this is a known dead end.",
    tags: ['edtech', 'education'],
    resonance: "It is a known problem and not a dead end, but the reason nobody does it is that language-neutral items are extremely expensive to author and the market rewards volume. Worth talking about.",
  },
  {
    founder: 'founder.ninehours@seed.test',
    title: 'Small companies do not need a security team, they need a fire drill',
    theIdea: "Everything sold to a forty-person company assumes somebody will operate it. Nobody will. I keep thinking the right shape is not a tool at all but a rehearsed procedure: here is what you do, in order, when this happens, and you have practised it once so you are not reading it for the first time in a crisis.",
    whyMe: "Building incident response for companies with no IT function, and increasingly convinced the software is the smaller half.",
    lookingFor: "Anybody who has run security at a company too small to have a security team, and has opinions about what actually got used.",
    tags: ['cybersecurity'],
    resonance: "I was the accidental security person at a 30-person company for two years. The only thing that ever worked was a printed sheet by the door. Everything else was ignored within a month.",
  },
  {
    founder: 'founder.uneven@seed.test',
    title: 'Most financial advice assumes a salary and then blames you for not having one',
    theIdea: "Half this country earns irregularly and every piece of financial guidance, every product and every default in every app is written for the other half. The advice is not wrong exactly, it is addressed to somebody else, and the person reading it concludes they are bad with money when actually the model does not fit them.",
    whyMe: "Building planning tools for variable income and finding that the hardest part is unlearning the salary assumption.",
    lookingFor: "People who have built for this segment and know which behavioural assumptions break first.",
    tags: ['fintech'],
    resonance: "The one that broke first for us was the monthly cycle itself. People with variable income do not think in months, they think in weeks, and every screen we had built was wrong before we started.",
  },
];

/** Circle posts in the newly populated fields. */
const CIRCLE_POSTS = [
  { founder: 'founder.commonroof@seed.test', room: 'climate', body: "Something I did not expect: the technical case for rooftop solar on housing societies is overwhelming and irrelevant. Four AGMs, no decision, and not once was the blocker the engineering. It is always who pays, who benefits, and what happens on resale. I now think a large fraction of climate deployment in this country is blocked on agreements rather than technology, and almost nobody is working on the agreements." },
  { founder: 'founder.vendorgate@seed.test', room: 'cybersecurity', body: "An uncomfortable observation from talking to about thirty small software companies. Almost all of them have better practices than their paperwork suggests, and they lose deals anyway. The questionnaire does not measure security, it measures whether you have somebody whose job is answering questionnaires. That is a real market failure and it is also, annoyingly, a real business." },
  { founder: 'founder.ninety@seed.test', room: 'fintech', body: "If you are building anything that touches small business lending in India, the thing to internalise early is that the borrower is almost never the problem. The information is. A manufacturer with a confirmed order from a creditworthy buyer is a good credit risk and cannot prove it, and every rate he is offered is pricing our ignorance rather than his risk." },
  { founder: 'founder.dose@seed.test', room: 'healthtech', body: "We spent four months trying to make a phone app work for patients over seventy before accepting that the phone was never the answer. I would save somebody else those four months: if your user does not already open apps, no amount of design fixes that, and the honest move is to build for the thing they do touch. For us that was the medicine box." },
  { founder: 'founder.proof@seed.test', room: 'edtech', body: "A thing I have stopped arguing about: colleges are not the customer, a placement officer is. Institutions do not buy information that makes them look bad. One person inside who already knows the truth and needs it written down will. Smaller sale, much shorter conversation, and it actually closes." },
];

async function userByEmail(email) {
  const r = await pool.query(`SELECT id FROM users WHERE email = $1`, [email]);
  return r.rows[0]?.id || null;
}

/** Backdate a whole thread so it does not all land in one second. */
async function retime(conversationId, startDaysAgo) {
  const msgs = (await pool.query(
    `SELECT id FROM messages WHERE conversation_id = $1 ORDER BY created_at, id`, [conversationId]
  )).rows;
  let t = Date.now() - startDaysAgo * DAY;
  for (const [i, m] of msgs.entries()) {
    t += rand(0.5, 26) * 3600000;
    if (t > Date.now() - 2 * 3600000) t = Date.now() - rand(2, 20) * 3600000;
    const read = i < msgs.length - 1 ? new Date(Math.min(t + rand(0.3, 5) * 3600000, Date.now() - 60000)).toISOString() : null;
    await pool.query(`UPDATE messages SET created_at = $2, read_at = $3 WHERE id = $1`,
      [m.id, new Date(t).toISOString(), read]);
  }
  await pool.query(
    `UPDATE conversations SET created_at = (SELECT MIN(created_at) FROM messages WHERE conversation_id = $1),
                              last_message_at = (SELECT MAX(created_at) FROM messages WHERE conversation_id = $1)
     WHERE id = $1`, [conversationId]
  );
}

(async () => {
  if (DRY) console.log('DRY RUN. Nothing will be written.\n');
  let threads = 0, sparks = 0, posts = 0;

  // ==========================================================================
  step('The conversations that ended with somebody joining');

  for (const [venture, script] of Object.entries(JOINING)) {
    const v = (await pool.query(
      `SELECT s.id, s.founder_id FROM startups s WHERE s.name = $1`, [venture]
    )).rows[0];
    if (!v) { console.log(`  skip  ${venture} not found`); continue; }

    // The person who actually joined. The conversation has to be with them,
    // or it explains nothing.
    const member = (await pool.query(
      `SELECT tm.user_id, p.display_name FROM startup_team_members tm
       JOIN profiles p ON p.user_id = tm.user_id
       WHERE tm.startup_id = $1 AND tm.is_founder = false
       ORDER BY tm.joined_at LIMIT 1`, [v.id]
    )).rows[0];
    if (!member) { console.log(`  skip  ${venture} has nobody who joined`); continue; }

    const exists = await pool.query(
      `SELECT 1 FROM messages m JOIN conversations c ON c.id = m.conversation_id
       WHERE c.startup_id = $1 AND m.content = $2`, [v.id, script[0][1]]
    );
    if (exists.rows.length > 0) { console.log(`  skip  ${venture} already has this thread`); continue; }

    console.log(`  ${DRY ? 'would open' : 'opening'}  ${venture} with ${member.display_name}, ${script.length} messages`);
    if (DRY) { threads++; continue; }

    const convo = await startOrGetConversation(member.user_id, v.founder_id, { startupId: v.id });
    if (!convo.success) { console.log(`    failed: ${convo.error}`); continue; }
    const cid = convo.conversation.id;

    for (const [who, body] of script) {
      await sendMessage(cid, who === 'F' ? v.founder_id : member.user_id, body);
    }
    await retime(cid, rand(24, 32));   // before they joined, which was ~16-23 days ago
    threads++;
  }

  // ==========================================================================
  step('Threads that have not resolved');

  for (const [venture, script] of Object.entries(LIVE)) {
    const v = (await pool.query(`SELECT id, founder_id FROM startups WHERE name = $1`, [venture])).rows[0];
    if (!v) { console.log(`  skip  ${venture} not found`); continue; }

    const exists = await pool.query(
      `SELECT 1 FROM messages m JOIN conversations c ON c.id = m.conversation_id
       WHERE c.startup_id = $1 AND m.content = $2`, [v.id, script[0][1]]
    );
    if (exists.rows.length > 0) { console.log(`  skip  ${venture} already has this thread`); continue; }

    // Somebody who genuinely fits an open role and has not joined anything here.
    const person = (await pool.query(
      `SELECT p.user_id, p.display_name
       FROM profiles p JOIN users u ON u.id = p.user_id
       JOIN contributor_profiles cp ON cp.profile_id = p.id
       WHERE u.primary_role = 'CONTRIBUTOR' AND u.email LIKE '%@seed.test'
         AND NOT EXISTS (SELECT 1 FROM startup_team_members tm
                         WHERE tm.user_id = p.user_id AND tm.startup_id = $1)
       ORDER BY random() LIMIT 1`, [v.id]
    )).rows[0];
    if (!person) { console.log(`  skip  ${venture}: nobody available`); continue; }

    console.log(`  ${DRY ? 'would open' : 'opening'}  ${venture} with ${person.display_name}, unresolved`);
    if (DRY) { threads++; continue; }

    const convo = await startOrGetConversation(person.user_id, v.founder_id, { startupId: v.id });
    if (!convo.success) { console.log(`    failed: ${convo.error}`); continue; }
    for (const [who, body] of script) {
      await sendMessage(convo.conversation.id, who === 'F' ? v.founder_id : person.user_id, body);
    }
    await retime(convo.conversation.id, rand(3, 9));
    threads++;
  }

  // ==========================================================================
  step('Sparks');

  for (const sp of SPARKS) {
    const authorId = await userByEmail(sp.founder);
    if (!authorId) { console.log(`  skip  ${sp.founder} not found`); continue; }

    const exists = await pool.query(`SELECT 1 FROM sparks WHERE title = $1`, [sp.title]);
    if (exists.rows.length > 0) { console.log(`  skip  "${sp.title.slice(0, 40)}..." already exists`); continue; }

    console.log(`  ${DRY ? 'would post' : 'posting'}  "${sp.title.slice(0, 52)}..."`);
    if (DRY) { sparks++; continue; }

    const created = await createSpark(authorId, {
      title: sp.title, theIdea: sp.theIdea, whyMe: sp.whyMe,
      lookingFor: sp.lookingFor, tags: sp.tags,
    });
    if (!created.success) { console.log(`    failed: ${created.error}`); continue; }

    const responder = (await pool.query(
      `SELECT p.user_id FROM profiles p JOIN users u ON u.id = p.user_id
       WHERE u.primary_role = 'CONTRIBUTOR' AND u.email LIKE '%@seed.test' AND p.user_id != $1
       ORDER BY random() LIMIT 1`, [authorId]
    )).rows[0];
    if (responder) await resonate(created.spark.id, responder.user_id, sp.resonance);

    await pool.query(`UPDATE sparks SET created_at = $2 WHERE id = $1`,
      [created.spark.id, ago(rand(4, 18))]);
    sparks++;
  }

  // ==========================================================================
  step('Circle posts');

  for (const cp of CIRCLE_POSTS) {
    const authorId = await userByEmail(cp.founder);
    if (!authorId) { console.log(`  skip  ${cp.founder} not found`); continue; }

    const exists = await pool.query(`SELECT 1 FROM room_posts WHERE body = $1`, [cp.body]);
    if (exists.rows.length > 0) { console.log(`  skip  ${cp.room} post already exists`); continue; }

    console.log(`  ${DRY ? 'would post' : 'posting'}  in ${cp.room}`);
    if (DRY) { posts++; continue; }

    const r = await createPost(authorId, cp.room, cp.body, null);
    if (!r.success) { console.log(`    failed: ${r.error}`); continue; }
    await pool.query(`UPDATE room_posts SET created_at = $2 WHERE id = $1`,
      [r.post.id, ago(rand(2, 15))]);
    posts++;
  }

  console.log(`\n${'='.repeat(62)}`);
  console.log(DRY ? 'Dry run complete.' : 'Done.');
  console.log(`  conversations: ${threads}`);
  console.log(`  sparks:        ${sparks}`);
  console.log(`  circle posts:  ${posts}`);
  await pool.end();
  process.exit(0);
})().catch((e) => { console.error('\nFailed:', e.message); console.error(e.stack); process.exit(1); });
