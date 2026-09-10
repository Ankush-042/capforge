require('dotenv').config();
/**
 * Fill every empty field that matching depends on, with content appropriate
 * to each specific venture and person. Not filler.
 *
 * Confirmed by audit:
 *   - 13/15 ventures have no founder_vision  -> vision alignment null for all
 *   - 37/37 contributors have no looking_for -> the mission signal is dead
 *   - 8/37 contributors have no preferred_domains -> domain scores 0 always
 *
 * Every vision below is written from that venture's actual problem and
 * solution. Every mission is written from that person's actual role and
 * skills. Nothing is copy-pasted between entries, because identical text
 * would produce identical embeddings and defeat the entire point.
 *
 * Only fills what is EMPTY. Never overwrites existing content.
 */
const pool = require('../backend/shared/db');

const VENTURE_VISIONS = {
  NeuraHealth: "A woman in a village three hours from the nearest hospital should not lose her sight to something a five minute look at her retina would have caught. The technology to prevent that already exists, it just lives in cities. I am building the version that runs on a phone a health worker already owns, because the gap here is distribution, not science.",

  EcoCharge: "India will not electrify because someone builds a better car. It will electrify when a driver in Nashik stops worrying about whether the charger at the other end will be working. I care about the unglamorous layer: the grid load, the uptime, the routing. Get that right and adoption follows on its own.",

  LearnLoop: "Every classroom moves at the pace of its median student, which means half the room is bored and half is drowning, every single day. I have watched bright children decide they are stupid because a syllabus moved on without them. Software can hold a different pace for each child in a way a teacher with sixty students physically cannot.",

  PayBridge: "A construction worker sending money home loses a week of wages to fees and spread, and nobody involved thinks that is strange. The rails are old, the intermediaries are many, and the person with least power pays for all of it. I want to make that cost visible first, then make it small.",

  LogiChain: "A truck running empty on its return leg is wasted diesel, wasted hours, and a driver away from home for nothing. The information to prevent it exists, it is just scattered across people who never talk. Coordination is the product, the software is just how coordination scales.",

  ClimateLens: "A smallholder farmer loses a season to weather and waits months for a claim to be assessed by someone who never visits the field. Satellites already see what happened, and the delay is pure process. I want payouts triggered by evidence rather than by paperwork, so the money arrives while it still matters.",

  SecureLayer: "Mid-market companies get breached with the same techniques that were documented five years ago, not because the defences do not exist, but because they are priced and staffed for enterprises. Security should not be a function of company size. I am building for the company with no security team at all.",

  KeyStack: "Property management still runs on WhatsApp threads, paper receipts and a spreadsheet only one person understands. Tenants chase repairs, owners chase rent, and nobody has a straight answer. It is not a hard problem technically, it is just one nobody has bothered to do properly for small landlords.",

  TeamPulse: "Companies discover someone is leaving at the exit interview, when it is already over. All the signals were there for months, sitting in calendars and comms and survey data nobody joined up. I want managers to know something is wrong while there is still time to have the conversation.",

  Streamline: "A creator earning across six platforms has no idea what they actually make, what they owe, or which work is worth repeating. They are running a business with none of the instruments a business gets. Independent work deserves the same financial clarity that a company takes for granted.",

  ClauseIQ: "Small companies sign contracts they have not fully read because a proper legal review costs more than the deal is worth. So risk gets accepted silently, and discovered later, expensively. I want the important clauses surfaced in plain language before someone signs, not after.",

  GeneForge: "Lab work is still bottlenecked on people manually transcribing results between instruments that do not speak to each other. Brilliant scientists spend their week on data janitorial work. Automating that plumbing does not make headlines, but it gives researchers back the part of the job that actually needs a human.",
};

const CONTRIBUTOR_MISSIONS = {
  // --- Original 12 ---
  'c.priya@seed.test': { mission: "I want to work somewhere the data is genuinely messy and the answer actually changes a decision. Clean benchmark datasets bore me. I care most about problems where being wrong has a real cost, so the rigour matters rather than being ceremony." },
  'c.arjun@seed.test': { mission: "I want to build the thing people actually use, not the demo that impresses in a meeting. I am at my best early, when the architecture is still open and one person can hold the whole system in their head. Prefer a small team where I own real surface area." },
  'c.sara@seed.test': { mission: "I am looking for a problem where machine learning is genuinely the right tool, not a label applied to a rules engine. I would rather ship a modest model that holds up in production than a state of the art one that only works on the test set." },
  'c.rahul@seed.test': { mission: "I care about systems that stay correct under load and under change. My favourite work is the unglamorous kind: data models that do not need rewriting in a year, APIs that do not lie about their guarantees. I want a team that treats reliability as a feature." },
  'c.neha@seed.test': { mission: "I want to design for people who are not like me. Most products are built for confident users on good connections, and everyone else is treated as an edge case. I am drawn to teams where the hard part is making something genuinely usable by someone under pressure." },
  'c.vikram@seed.test': { mission: "I want to join before the infrastructure is a mess, not after. Getting deployment, observability and rollback right early costs a fraction of fixing it later. I care about teams that can ship on a Friday without fear." },
  'c.ananya@seed.test': { mission: "I want to grow something that deserves to grow. I have done growth for products with a leaky bucket and it is miserable and dishonest. Looking for a team where the product is genuinely good and the constraint is that not enough people know about it." },
  'c.karan@seed.test': { mission: "I want to build for phones that are three years old on connections that drop, because that is what most people actually have. The interesting constraints are offline sync, battery, and interfaces that work one-handed on a bus." },
  'c.divya@seed.test': { mission: "I care about the pipeline nobody sees until it breaks. Good analytics is downstream of boring, correct data engineering, and most teams discover that too late. I want to be the person who gets it right the first time." },
  'c.aditya@seed.test': { mission: "I want to sell something I would recommend to a friend. Early stage business development is really just finding the first ten people who genuinely need this, which needs honesty more than technique. Prefer a founder who wants the real feedback." },
  'c.meera@seed.test': { mission: "I want to work with a team that will actually change the product when the research says they should. Too much user research is theatre performed after decisions are made. I care about being involved early, when findings can still move something." },
  'c.rohan@seed.test': { mission: "I want security to be part of how a product is built rather than an audit at the end. I am drawn to teams handling something genuinely sensitive, where getting it wrong hurts a real person, because that is where the work matters." },

  // --- New 25 ---
  'c2.tanvi@seed.test': { mission: "I am interested in the narrow set of problems where a distributed ledger is genuinely the right answer, usually where multiple parties do not trust each other but must share state. Most of what I am pitched does not need it, and I will say so." },
  'c2.omar@seed.test': { mission: "I want to build spatial interfaces for people doing real physical work, not entertainment. Training, field maintenance, anything where someone needs both hands and information at the same time. That constraint makes the design problem interesting." },
  'c2.lisa@seed.test': { mission: "I want to join a team that treats quality as a shared responsibility rather than a stage at the end. The most valuable testing happens while something is still being designed. Drawn to products where a defect has real consequences.", domains: ['healthtech', 'fintech', 'saas'] },
  'c2.dev@seed.test': { mission: "I want to design infrastructure for a product that will genuinely need to scale, not one hoping it might. Equally happy making things smaller and cheaper. Cloud cost discipline is an engineering problem and most teams treat it as a finance one.", domains: ['saas', 'cybersecurity', 'fintech'] },
  'c2.simran@seed.test': { mission: "I want to work where software meets an actual patient or an actual lab bench. I have spent enough time in regulated environments to know the constraint is rarely the algorithm, it is validation, workflow and trust. That is the part I want to get right." },
  'c2.wei@seed.test': { mission: "I want to work on physical supply chains, where an optimisation either does or does not put a container in the right place. The feedback loop is honest in a way that purely digital work often is not." },
  'c2.sam@seed.test': { mission: "I want to own a product where the hard question is what to build rather than how fast to build it. I am most useful when the problem is genuinely ambiguous and someone needs to make a defensible call with incomplete information.", domains: ['climate', 'saas', 'hr tech'] },
  'c2.carlos@seed.test': { mission: "I want to be close to the decision the analysis feeds. Data science that ends in a dashboard nobody opens is wasted work. Drawn to teams small enough that I can see whether the model actually changed anything.", domains: ['fintech', 'logistics', 'saas'] },
  'c2.aisha@seed.test': { mission: "I want to write for a product that is genuinely hard to explain, because that is where content actually does something. Marketing a simple product is easy and forgettable. I like the work of making something complicated feel obvious.", domains: ['edtech', 'saas', 'healthtech'] },
  'c2.rohit@seed.test': { mission: "I want to work on something with hardware in the loop, where the software has to cope with sensors that lie and power that runs out. Constraints make better engineers, and pure cloud work has too few of them for my taste." },
  'c2.grace@seed.test': { mission: "I want to write the words inside the product, where a single sentence decides whether someone understands what just happened. Especially interested in error states and empty states, the moments everyone leaves until last.", domains: ['saas', 'fintech', 'edtech'] },
  'c2.imran@seed.test': { mission: "I want to help a team build compliance in from the start rather than retrofit it under deadline. Regulated products fail more often on process than on technology. I am drawn to founders who want to know the constraints early even when it slows them down." },
  'c2.nina@seed.test': { mission: "I want growth to be an engineering problem, measured properly and honest about causation. I would rather find one real activation bottleneck than run twenty inconclusive experiments. Looking for a product where retention is genuinely earned.", domains: ['saas', 'edtech', 'fintech'] },
  'c2.samuel@seed.test': { mission: "I want to work on agriculture where the end user is an actual farmer, not an agribusiness dashboard. The gap between what remote sensing can see and what reaches someone with five acres is enormous, and closing it is the interesting work." },
  'c2.priyanka@seed.test': { mission: "I care about interfaces that stay fast and accessible under real conditions, not just in a demo on good hardware. Drawn to teams where the frontend carries genuine complexity rather than being a thin layer over an API.", domains: ['healthtech', 'edtech', 'saas'] },
  'c2.jamal@seed.test': { mission: "I want to sit between the customer and the engineering team, translating in both directions. The best technical sales work is really requirements discovery. Prefer complex products where the buyer genuinely needs help understanding what they need.", domains: ['cybersecurity', 'saas', 'logistics'] },
  'c2.elena@seed.test': { mission: "I want privacy treated as a design constraint rather than a policy document. The interesting question is never whether you can collect data, it is whether you should, and most teams never ask it. Drawn to products handling genuinely sensitive information." },
  'c2.harish@seed.test': { mission: "I want to own reliability for something people depend on at an inconvenient hour. Good SRE work is mostly about making failure boring and recovery fast. Looking for a team that will actually fund that before the first serious outage." },
  'c2.mei@seed.test': { mission: "I want to design learning that works for the person who has already failed at this once. Most educational content is built for the motivated learner who barely needed it. The difficult and worthwhile case is everyone else." },
  'c2.victor@seed.test': { mission: "I want to build physical things that ship, with all the compromise that involves: cost, certification, manufacturability. Drawn to energy and infrastructure, where the hardware has to survive years outdoors and nobody will be there to reboot it." },
  'c2.zara@seed.test': { mission: "I want to build a community that would survive the company going quiet for a month. Most community work is a marketing channel with a friendlier name. I am interested in products where users genuinely help each other." },
  'c2.thabo@seed.test': { mission: "I want to work on models where the failure mode matters and someone has thought about it. Drawn to applied problems in the physical world rather than pure recommendation work. I care more about calibration and honest uncertainty than leaderboard scores." },
  'c2.isabella@seed.test': { mission: "I want to be the operational spine of an early team, the person who makes sure the money, the contracts and the compliance are handled so the founders can build. Small companies usually get this wrong late and expensively." },
  'c2.arvind@seed.test': { mission: "I want to work on backend systems where correctness genuinely matters, ideally involving money, health or safety. I would rather spend a week on the edge cases than ship something that mostly works. Prefer teams that write things down." },
  'c2.sofia@seed.test': { mission: "I want to do research that changes what gets built, which means being in the room early and being willing to deliver unwelcome findings. Drawn to products serving people whose context is very different from the team building it." },
};

(async () => {
  let vFilled = 0, vSkipped = [];
  console.log('=== FOUNDER VISIONS ===');
  for (const [name, vision] of Object.entries(VENTURE_VISIONS)) {
    const r = await pool.query(
      `UPDATE startups SET founder_vision = $1
       WHERE name = $2 AND (founder_vision IS NULL OR trim(founder_vision) = '')
       RETURNING id, name`,
      [vision, name]
    );
    if (r.rows.length > 0) { console.log(`  FILLED  ${name}`); vFilled++; }
    else console.log(`  skipped ${name} (already has one, or name not found)`);
  }

  // Report any venture still without a vision that we had no content for
  const stillEmpty = await pool.query(
    `SELECT s.name FROM startups s JOIN users u ON u.id = s.founder_id
     WHERE (s.founder_vision IS NULL OR trim(s.founder_vision) = '')
       AND u.email != 'system.import@capforge.internal' AND s.verification_status != 'UNVERIFIED'`
  );
  if (stillEmpty.rows.length > 0) {
    console.log('\n  NO CONTENT WRITTEN FOR (deliberately not fabricated):');
    for (const s of stillEmpty.rows) console.log(`    ${s.name}`);
  }

  console.log('\n=== CONTRIBUTOR MISSIONS + DOMAINS ===');
  let cFilled = 0, dFilled = 0;
  for (const [email, data] of Object.entries(CONTRIBUTOR_MISSIONS)) {
    const prof = await pool.query(
      `SELECT cp.id FROM contributor_profiles cp
       JOIN profiles p ON p.id = cp.profile_id
       JOIN users u ON u.id = p.user_id WHERE u.email = $1`,
      [email]
    );
    if (prof.rows.length === 0) { console.log(`  MISSING PROFILE  ${email}`); continue; }
    const cpId = prof.rows[0].id;

    const m = await pool.query(
      `UPDATE contributor_profiles SET looking_for = $1
       WHERE id = $2 AND (looking_for IS NULL OR trim(looking_for) = '') RETURNING id`,
      [data.mission, cpId]
    );
    if (m.rows.length > 0) cFilled++;

    if (data.domains) {
      const d = await pool.query(
        `UPDATE contributor_profiles SET preferred_domains = $1
         WHERE id = $2 AND (preferred_domains IS NULL OR cardinality(preferred_domains) = 0) RETURNING id`,
        [data.domains, cpId]
      );
      if (d.rows.length > 0) dFilled++;
    }
    console.log(`  ${m.rows.length > 0 ? 'FILLED ' : 'skipped'} ${email}${data.domains ? ' (+domains)' : ''}`);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Ventures given a vision: ${vFilled}`);
  console.log(`Contributors given a mission: ${cFilled}`);
  console.log(`Contributors given domains: ${dFilled}`);
  console.log(`\nNEXT: run scripts/backfill-vision-embeddings.js, then rerank-everything.js`);
  await pool.end();
  process.exit(0);
})();
