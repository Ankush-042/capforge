require('dotenv').config();
/**
 * Ten more ventures, in the domains that were too thin to demonstrate.
 *
 * WHY THESE DOMAINS. The profile picker offers twelve fields and the platform
 * had one venture in most of them, so choosing cybersecurity returned a single
 * result. The venture-first ranking fixed the silence around that, but a list
 * of one still cannot show ranking doing anything. Five fields go to three or
 * four ventures each: edtech 1 to 3, healthtech 2 to 4, fintech 2 to 4,
 * climate 1 to 3, cybersecurity 1 to 3.
 *
 * WHY THE STATEMENTS READ THE WAY THEY DO. The weakest thing about the
 * original seed is that several ventures describe a CATEGORY rather than a
 * company. "AI for education" is a category. "A Class 8 student can solve a
 * quadratic in Marathi and fails the same question in English" is a company:
 * it names a person, a moment where the problem bites, and something you
 * could go and check. Every idea below is written that way, because the
 * structuring step, the matching engine and the alignment layer all read this
 * text, and vague input produces vague everything downstream.
 *
 * THROUGH THE REAL PATH, not inserted rows: register, create, structure,
 * confirm, diagnose. That means real AI structuring, real gap diagnosis, real
 * embeddings, real judgements, and it exercises the cold-signup path ten more
 * times. Slower, and worth it.
 *
 * Resume-safe: an interrupted run logs in rather than failing, and skips
 * whatever already exists.
 *
 * Usage:
 *   node backend/server.js          (in another terminal)
 *   node scripts/seed-10-ventures.js
 */
const BASE = process.env.SEED_BASE || 'http://localhost:3000/api';
const PASSWORD = 'SeedPass123!';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function post(path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, data: await res.json().catch(() => ({})) };
}
async function patch(path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, data: await res.json().catch(() => ({})) };
}

const VENTURES = [
  // ---------------- edtech ----------------
  {
    email: 'founder.bhasha@seed.test', displayName: 'Mrunal Deshpande',
    headline: 'Former Marathi-medium teacher building assessment that separates language from understanding',
    startup: 'Bhasha',
    idea: `A Class 8 student in a Marathi-medium school in Nashik can solve a quadratic equation on paper and fails the same question in English. Her teacher knows this and cannot prove it, because every assessment she is given arrives in English and the result comes back as one mark. So the student is moved into remedial maths she does not need, and stops trying.

We let a student work through practice and assessment in the language they think in, and show the teacher two separate numbers: where the gap is language, and where the gap is actually the mathematics. The second number is the only one worth acting on and nobody currently has it.

We started because one of us taught in exactly that school for six years and watched it happen to a hundred children a year.`,
    vision: 'A child should never be marked down for the language a question was written in. We want the day a teacher can say with certainty "she understands this, she just cannot read it yet" — and do something different as a result.',
  },
  {
    email: 'founder.proof@seed.test', displayName: 'Ritvik Saxena',
    headline: 'Building the feedback loop between what colleges teach and what first employers test',
    startup: 'ProofPoint',
    idea: `A final-year engineering student in Nagpur has an 8.2 CGPA and cannot pass the first technical round anywhere that pays well. Four years of coursework tested none of what that round tests. Worse, rejection arrives with no reason attached, so he cannot tell whether he failed on data structures, on communication, or on something he has never heard of.

His department has the same blindness at scale: 180 students sat interviews last year, 31 got offers, and nobody in the college can say what the other 149 got wrong.

We give students practice against what companies actually ask in that first round, and give the department a view of where its cohort is weak while there is still a semester left to fix it.`,
    vision: 'A degree should mean something to the person who has to hire you. We want colleges to find out what their students are failing at in October rather than in June, when nothing can be done about it.',
  },

  // ---------------- healthtech ----------------
  {
    email: 'founder.dose@seed.test', displayName: 'Anjali Iyer',
    headline: 'Building medication adherence for elderly patients who live alone',
    startup: 'DoseTrack',
    idea: `A 71-year-old in Pune takes six medicines a day and lives alone. Her son calls every evening and asks whether she took them. She says yes, and she believes it, because at 71 the memory of taking a tablet and the memory of intending to are the same memory. Nobody finds out otherwise until the hospital admission.

Every product built for this problem lives on a phone she does not use for anything except calls. So it lives on the medicine box instead: the compartment reports when it was opened, and one nominated family member is told only when a dose is genuinely missed, not every day, because a daily notification becomes noise inside a week and then nobody reads the one that mattered.

Roughly half of long-term medication in India is taken incorrectly or not at all, and almost none of that is deliberate.`,
    vision: 'The people who need this most are the least likely to use an app. We want to be the company that accepted that instead of pretending otherwise, and built for the box rather than the phone.',
  },
  {
    email: 'founder.panel@seed.test', displayName: 'Farhan Sheikh',
    headline: 'Fixing the lab-to-doctor handoff, where structured data becomes an unreadable PDF',
    startup: 'PanelRead',
    idea: `A diagnostic lab in Indore sends a fourteen-page PDF to a doctor who has seven minutes with the patient. The doctor scans it for the two values he was looking for and misses a third that mattered, not through carelessness but because fourteen pages in seven minutes is not reading, it is sampling.

The lab had that result as structured data and threw the structure away at the moment of printing. It exists in their system as numbers with reference ranges and dates, and it arrives as a picture of a table.

We keep it as data. The doctor sees what is out of range, what has changed since the last test, and how fast it is moving — in that order, because that is the order a consultation actually needs.`,
    vision: 'The information was never missing. It was just formatted for a filing cabinet. We want a doctor to stop treating the report as an obstacle between them and the patient.',
  },

  // ---------------- fintech ----------------
  {
    email: 'founder.ninety@seed.test', displayName: 'Harsh Patel',
    headline: 'Making an unpaid invoice something a lender can actually price',
    startup: 'NinetyDays',
    idea: `A small manufacturer in Rajkot delivers a completed order to a large buyer and waits ninety days to be paid. During those ninety days he cannot fund the next order, so a business that could grow forty percent a year grows eight. He is not short of demand. He is short of the gap between delivering and being paid.

A bank will not lend against that invoice because it cannot verify it. The buyer confirmed receipt by email, or over the phone, or not at all, and none of that is evidence a credit committee can act on.

So we make the confirmation itself the product: the buyer verifies the invoice once, digitally, and that verified claim is a thing a lender can price and discount. The supplier gets paid in days at a known cost instead of ninety days at an unknown one.`,
    vision: 'Somebody who has already done the work should not be financing a company far larger than theirs for three months. We want the wait to become a price rather than a punishment.',
  },
  {
    email: 'founder.uneven@seed.test', displayName: 'Deepa Krishnan',
    headline: 'Building money planning for people whose income is different every week',
    startup: 'Uneven',
    idea: `A cab driver in Bengaluru earns between nine hundred and three thousand four hundred rupees a day. At the start of the month he cannot say whether he will make his daughter's school fee, so he borrows against it in the second week at rates he knows are bad, and is right to, because the alternative is she sits out the term.

Every budgeting product ever built assumes a salary arriving on the first. Enter a monthly income and it plans around a number he does not have. The advice that follows is not wrong so much as addressed to somebody else.

We plan from what actually came in last week, we are explicit about the range rather than the average, and we say plainly how confident we are — because for somebody in this position the difference between "probably" and "definitely" is the whole decision.`,
    vision: 'Half this country earns irregularly and every financial product is built for the other half. We want to be the one that starts from the variability instead of treating it as a flaw in the user.',
  },

  // ---------------- climate ----------------
  {
    email: 'founder.commonroof@seed.test', displayName: 'Nikhil Bhosale',
    headline: 'Solving the agreement problem that stops housing societies going solar',
    startup: 'CommonRoof',
    idea: `A housing society in Thane with eighty-four flats has a roof that could carry sixty kilowatts of solar. It has been discussed at four annual general meetings across four years and has not happened. Not because of the engineering, which is solved and cheap, but because nobody can answer three questions: who pays, who benefits, and what happens to both when a flat is sold.

The installer will not answer them because it is not their problem. The committee will not answer them because getting it wrong means a neighbour feels cheated and they have to live next to that person.

We answer them. A model that splits cost and benefit per flat against actual consumption, handles a resale without renegotiation, and produces a proposal a committee can vote on rather than argue about from first principles.`,
    vision: 'There are millions of usable roofs in this country sitting empty over a disagreement rather than a technical limit. We want the disagreement to be somebody\'s solved problem.',
  },
  {
    email: 'founder.circuit@seed.test', displayName: 'Tara Menon',
    headline: 'Telling facility managers where their electricity actually goes',
    startup: 'CircuitSense',
    idea: `A commercial building in Ahmedabad pays eleven lakh a month for electricity, and nobody who works in it can say which floor, which system or which hour is responsible. The bill is a single number and the meter is in a locked room the landlord controls.

So every efficiency decision is a guess. The facility manager switches to LED lighting because that is the thing everyone does, and the bill moves four percent, and he has no idea whether he just spent eight lakh on the fourth most important problem.

We measure at the circuit, not the building. The first thing almost every customer learns is something specific and slightly embarrassing: the chillers ran all Sunday night, and that is nine percent of the bill. You cannot find that in a monthly total and you cannot fix what you cannot find.`,
    vision: 'Most commercial energy waste is not a hard engineering problem, it is an invisible one. We want a building manager to be able to point at the thing costing them money instead of guessing at it.',
  },

  // ---------------- cybersecurity ----------------
  {
    email: 'founder.vendorgate@seed.test', displayName: 'Imran Vakil',
    headline: 'Getting small software companies through enterprise security reviews',
    startup: 'VendorGate',
    idea: `A fourteen-person software company in Coimbatore loses enterprise deals at the security questionnaire. Three hundred questions, most of which they can answer approximately, almost none of which they can evidence. The deal stalls for eleven weeks and then goes to a competitor who had the paperwork.

So they hire a consultant for three lakh who fills the form, hands over a folder and leaves. Six months later the next buyer asks for current evidence and the folder is worthless, because it described a moment rather than a practice.

We take the other path: work out the controls that genuinely matter for a company that size, set them up once, and generate the evidence continuously so the answers stay true. The questionnaire stops being a project and becomes an export.`,
    vision: 'A small company with genuinely good practices should not lose to a larger one with better paperwork. We want the evidence to be a side effect of doing the right thing rather than a separate job.',
  },
  {
    email: 'founder.ninehours@seed.test', displayName: 'Sneha Rathod',
    headline: 'Building what happens after a phishing click at a company with no IT team',
    startup: 'NineHours',
    idea: `Somebody in a forty-person company clicks a link in an email and types their password into a page that looks exactly like their mail login. There is no IT team. There is an office manager who is good with computers.

The first person to notice anything is an accountant, the following afternoon, looking at an invoice nobody in the company sent. Between the click and that invoice are about nine hours in which a forwarding rule was created, the sent folder was cleared, and three suppliers were emailed — every one of which is visible and stoppable if anybody is watching.

Nobody is watching, and the tools that do the watching are sold to companies with a security team to operate them. We are building the nine hours for everybody else: detect the rule, kill the session, tell the office manager what to do in words she can act on without a certification.`,
    vision: 'Most companies attacked this way are too small to have anybody whose job it is to notice. We want the response to happen without a specialist in the building, because there is never going to be one.',
  },
];

(async () => {
  console.log(`Creating ${VENTURES.length} ventures through the real path.`);
  console.log('Register, create, structure, confirm, diagnose. Roughly 3 minutes.\n');

  let made = 0, resumed = 0, failed = 0;

  for (const v of VENTURES) {
    await sleep(8000);   // POST /startups runs real structuring; 8s stays under the rate limit

    let token;
    const reg = await post('/auth/register', {
      email: v.email, password: PASSWORD, primaryRole: 'FOUNDER', displayName: v.displayName,
    });
    if (reg.ok && reg.data.token) {
      token = reg.data.token;
    } else if (reg.data.error === 'EMAIL_ALREADY_EXISTS') {
      const login = await post('/auth/login', { email: v.email, password: PASSWORD });
      if (!login.ok) { console.log(`  FAILED ${v.startup}: exists but login failed`); failed++; continue; }
      token = login.data.token;
    } else {
      console.log(`  FAILED ${v.startup}: registration — ${reg.data.error || 'unknown'}`); failed++; continue;
    }

    // The founder's own profile matters: it is what a contributor sees, and
    // an empty one makes a real venture look abandoned.
    await patch('/profiles/me', { headline: v.headline, displayName: v.displayName }, token);

    const mine = await fetch(`${BASE}/startups/mine`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).catch(() => ({}));

    let startupId;
    if (mine.success && mine.startups?.length > 0) {
      startupId = mine.startups[0].id;
      console.log(`  resume  ${v.startup} already exists`);
      resumed++;
    } else {
      // founderVision goes in HERE. There is no PATCH /startups/:id, only
      // /confirm, so setting it afterwards would have silently 404'd and left
      // every one of these ten with no vision — which means no alignment
      // score against any contributor's mission, which is most of what makes
      // the ranking work.
      const create = await post('/startups', {
        name: v.startup, rawIdea: v.idea, founderVision: v.vision,
      }, token);
      if (!create.ok || !create.data.success) {
        console.log(`  FAILED ${v.startup}: structuring — ${create.data.error || ''} ${create.data.detail || ''}`);
        failed++; continue;
      }
      startupId = create.data.startup.id;

      const confirm = await patch(`/startups/${startupId}/confirm`, {}, token);
      if (!confirm.ok || !confirm.data.success) {
        console.log(`  FAILED ${v.startup}: confirm — ${confirm.data.error || ''}`);
        failed++; continue;
      }

      const diag = await post(`/startups/${startupId}/diagnose`, {}, token);
      const roles = diag.data?.gaps?.length || 0;
      console.log(`  created ${v.startup.padEnd(14)} ${roles} role(s) diagnosed`);
      made++;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`${made} created, ${resumed} already existed, ${failed} failed.`);
  if (failed === 0) console.log('\nNEXT: node scripts/seed-10-depth.js');
  process.exit(failed > 0 ? 1 : 0);
})().catch((e) => { console.error('Failed:', e.message); process.exit(1); });
