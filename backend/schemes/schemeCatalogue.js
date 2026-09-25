/**
 * Indian government startup schemes, and the published rules that decide who
 * qualifies.
 *
 * WHY THIS FILE IS WRITTEN THE WAY IT IS. A wrong readiness score wastes
 * somebody's afternoon. A wrong eligibility answer means a founder either
 * misses ₹20 lakh they were entitled to or spends weeks on an application
 * they were never going to qualify for. So every rule below carries the URL
 * it came from and the date it was checked, and the engine reports three
 * states rather than two:
 *
 *   MET          a published criterion this venture satisfies
 *   NOT MET      a published criterion it fails, named exactly
 *   CANNOT CHECK something real that we have no way to verify
 *
 * The third state is the important one. Nothing here ever says "you are
 * eligible", because eligibility for most of these is decided by a committee
 * reading your application. It says which published criteria are satisfied
 * and which are not, and names the ones a human has to judge.
 *
 * VERIFIED 25 September 2026. Schemes change, deadlines pass, and this file
 * does not know that. Every entry shows its verification date to the founder
 * and links to the source so they can check the current position themselves.
 *
 * ONE CONFLICT WORTH RECORDING: sources disagree on the DPIIT turnover cap.
 * Several guides, including ones updated in 2026, state ₹100 crore, which was
 * the earlier rule. The official Startup India portal and sources describing
 * the 2026 notification G.S.R. 108(E) state ₹200 crore, with ₹300 crore for
 * DeepTech. The government source is used here and the disagreement is noted
 * on the criterion itself rather than quietly resolved.
 */

const VERIFIED_ON = '2026-09-25';

/** Years between a date and now, or null when the date is unknown. */
function yearsSince(dateStr) {
  if (!dateStr) return null;
  const then = new Date(dateStr);
  if (Number.isNaN(then.getTime())) return null;
  return (Date.now() - then.getTime()) / (365.25 * 24 * 3600 * 1000);
}

const ENTITY_LABEL = {
  PRIVATE_LIMITED: 'Private Limited Company',
  LLP: 'Limited Liability Partnership',
  REGISTERED_PARTNERSHIP: 'Registered Partnership Firm',
  COOPERATIVE_SOCIETY: 'Cooperative Society',
  SOLE_PROPRIETORSHIP: 'Sole Proprietorship',
  NOT_INCORPORATED: 'Not incorporated yet',
};

/**
 * Each criterion returns one of:
 *   { state: 'MET' | 'NOT_MET', detail }      we could check it
 *   { state: 'UNKNOWN', detail }              we lack the fact
 *   { state: 'HUMAN', detail }                a person decides this
 */
const UNKNOWN = (detail) => ({ state: 'UNKNOWN', detail });
const HUMAN = (detail) => ({ state: 'HUMAN', detail });
const MET = (detail) => ({ state: 'MET', detail });
const NOT_MET = (detail) => ({ state: 'NOT_MET', detail });


/**
 * Does this venture work in one of a scheme's sectors?
 *
 * EXACT MATCHING, DELIBERATELY. The first version compared substrings in both
 * directions, and 'medtech'.includes('edtech') is true, so an edtech venture
 * was told it qualified for a biotechnology grant. Substring matching on
 * short domain names produces exactly this class of silent wrong answer, and
 * on a page a founder will act on it is not acceptable.
 *
 * The sector lists are curated, so they carry their own variants rather than
 * relying on fuzzy matching to find them.
 */
function sectorMatch(domains, sectors) {
  const norm = (x) => String(x || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const wanted = new Set(sectors.map(norm));
  for (const d of domains || []) {
    if (wanted.has(norm(d))) return String(d);
  }
  return null;
}

const DPIIT_RECOGNITION = {
  id: 'DPIIT',
  name: 'DPIIT Startup Recognition',
  authority: 'Department for Promotion of Industry and Internal Trade',
  oneLine: 'The certificate almost every other scheme requires first. Free, and issued in days.',
  worth: 'Unlocks the Seed Fund Scheme, a three-year income tax holiday under Section 80-IAC, an 80% rebate on patent fees and 50% on trademarks, self-certification under nine labour and three environment laws, and government procurement preference on GeM.',
  cost: 'Free',
  applyAt: 'https://www.startupindia.gov.in/content/sih/en/startupgov/startup_recognition_page.html',
  source: 'https://www.startupindia.gov.in/content/sih/en/startup-scheme.html',
  verifiedOn: VERIFIED_ON,
  isGateway: true,
  criteria: [
    {
      label: 'Incorporated as a Private Limited Company, LLP, Registered Partnership Firm or Cooperative Society',
      note: 'A sole proprietorship does not qualify. Cooperative societies were added by the 2026 notification.',
      check: (v) => {
        if (!v.entity_type) return UNKNOWN('We do not know how this venture is incorporated.');
        if (v.entity_type === 'NOT_INCORPORATED') return NOT_MET('This venture is not incorporated yet, so it cannot be recognised.');
        if (v.entity_type === 'SOLE_PROPRIETORSHIP') return NOT_MET('A sole proprietorship is explicitly excluded.');
        return MET(`Incorporated as a ${ENTITY_LABEL[v.entity_type]}.`);
      },
    },
    {
      label: 'Within 10 years of incorporation',
      note: '20 years for DeepTech startups under the 2026 notification.',
      check: (v) => {
        const yrs = yearsSince(v.incorporation_date);
        if (yrs === null) return UNKNOWN('We do not know the incorporation date.');
        return yrs <= 10
          ? MET(`Incorporated about ${yrs.toFixed(1)} years ago.`)
          : NOT_MET(`Incorporated about ${yrs.toFixed(1)} years ago, past the 10-year limit.`);
      },
    },
    {
      label: 'Annual turnover has not exceeded ₹200 crore in any financial year',
      note: '₹300 crore for DeepTech. Several guides still state ₹100 crore, which was the earlier rule; the government portal states ₹200 crore.',
      check: () => HUMAN('This platform does not hold turnover figures. Almost certainly satisfied at this stage.'),
    },
    {
      label: 'Not formed by splitting up or reconstructing an existing business',
      check: () => HUMAN('Declared by the founder on the application.'),
    },
    {
      label: 'Working towards innovation, or a scalable model with potential for employment or wealth creation',
      note: 'Around 70% of rejections are attributed to a poorly written innovation statement rather than genuine ineligibility.',
      check: () => HUMAN('Judged from the innovation statement in the application.'),
    },
  ],
};

const SISFS = {
  id: 'SISFS',
  name: 'Startup India Seed Fund Scheme',
  authority: 'DPIIT, disbursed through approved incubators',
  oneLine: 'Up to ₹20 lakh as a grant for proof of concept, and up to ₹50 lakh for commercialisation.',
  worth: 'A ₹945 crore corpus across more than 300 approved incubators. The ₹20 lakh proof-of-concept component is a grant and is not repayable; the ₹50 lakh commercialisation component is debt or convertible debentures.',
  cost: 'Free to apply',
  applyAt: 'https://seedfund.startupindia.gov.in/',
  source: 'https://seedfund.startupindia.gov.in/',
  verifiedOn: VERIFIED_ON,
  requiresDpiit: true,
  deadline: { date: '2026-05-31', note: 'The last date for startups to apply in the cycle running when this was verified. Check the portal for the next cycle.' },
  howItWorks: 'You do not apply to the government. You apply through a DPIIT-approved incubator, and may name up to three in order of preference: if the first rejects you, the second is considered automatically. A rejected application can be resubmitted after three months.',
  criteria: [
    {
      label: 'DPIIT recognised',
      check: (v) => v.dpiit_recognized
        ? MET('This venture is recorded as DPIIT recognised.')
        : NOT_MET('Not DPIIT recognised. This is a hard prerequisite and the commonest reason an application cannot proceed.'),
    },
    {
      label: 'Not more than 2 years from the date of incorporation',
      note: 'Counted from the Certificate of Incorporation, not from when work on the idea began.',
      check: (v) => {
        const yrs = yearsSince(v.incorporation_date);
        if (yrs === null) return UNKNOWN('We do not know the incorporation date.');
        return yrs <= 2
          ? MET(`Incorporated about ${yrs.toFixed(1)} years ago, inside the two-year window.`)
          : NOT_MET(`Incorporated about ${yrs.toFixed(1)} years ago. The window closed at two years.`);
      },
    },
    {
      label: 'Incorporated as a Private Limited Company, LLP or Registered Partnership Firm',
      check: (v) => {
        if (!v.entity_type) return UNKNOWN('We do not know how this venture is incorporated.');
        if (['PRIVATE_LIMITED', 'LLP', 'REGISTERED_PARTNERSHIP'].includes(v.entity_type)) {
          return MET(`Incorporated as a ${ENTITY_LABEL[v.entity_type]}.`);
        }
        return NOT_MET(`${ENTITY_LABEL[v.entity_type]} is not an eligible entity type for this scheme.`);
      },
    },
    {
      label: 'Has not received more than ₹10 lakh of monetary support under any other central or state government scheme',
      check: (v) => {
        if (v.prior_govt_funding_lakhs === null || v.prior_govt_funding_lakhs === undefined) {
          return UNKNOWN('We do not know whether this venture has taken government money before.');
        }
        const n = parseFloat(v.prior_govt_funding_lakhs);
        return n <= 10
          ? MET(n === 0 ? 'No prior government funding.' : `₹${n} lakh taken previously, inside the ₹10 lakh limit.`)
          : NOT_MET(`₹${n} lakh already taken from other government schemes, above the ₹10 lakh limit.`);
      },
    },
    {
      label: 'At least 51% shareholding held by Indian promoters',
      check: () => HUMAN('This platform does not hold the shareholding pattern.'),
    },
  ],
};

const SECTION_80IAC = {
  id: '80IAC',
  name: 'Section 80-IAC income tax holiday',
  authority: 'Inter-Ministerial Board, on top of DPIIT recognition',
  oneLine: 'Three consecutive years of income tax exemption out of the first ten.',
  worth: 'A full exemption on profits for three years of the founder\'s choosing within the first ten, applied for separately after DPIIT recognition.',
  cost: 'Free to apply',
  applyAt: 'https://www.startupindia.gov.in/content/sih/en/startupgov/startup_recognition_page.html',
  source: 'https://www.patronaccounting.com/blog/dpiit-startup-recognition-2026-guide',
  verifiedOn: VERIFIED_ON,
  requiresDpiit: true,
  criteria: [
    {
      label: 'DPIIT recognised',
      check: (v) => v.dpiit_recognized
        ? MET('This venture is recorded as DPIIT recognised.')
        : NOT_MET('Not DPIIT recognised. The Board will not consider an application without the certificate.'),
    },
    {
      label: 'A Private Limited Company or LLP',
      note: 'A registered partnership firm qualifies for DPIIT recognition but not for this exemption.',
      check: (v) => {
        if (!v.entity_type) return UNKNOWN('We do not know how this venture is incorporated.');
        return ['PRIVATE_LIMITED', 'LLP'].includes(v.entity_type)
          ? MET(`Incorporated as a ${ENTITY_LABEL[v.entity_type]}.`)
          : NOT_MET(`${ENTITY_LABEL[v.entity_type]} is not eligible for this exemption.`);
      },
    },
    {
      label: 'Incorporated on or after 1 April 2016',
      check: (v) => {
        if (!v.incorporation_date) return UNKNOWN('We do not know the incorporation date.');
        const d = new Date(v.incorporation_date);
        return d >= new Date('2016-04-01')
          ? MET('Incorporated after the qualifying date.')
          : NOT_MET('Incorporated before 1 April 2016.');
      },
    },
  ],
};

const NIDHI_PRAYAS = {
  id: 'NIDHI_PRAYAS',
  name: 'NIDHI-PRAYAS',
  authority: 'Department of Science and Technology, through empanelled incubators',
  oneLine: 'Up to ₹10 lakh for building a hardware or deep-tech prototype.',
  worth: 'A pre-incubation grant aimed at turning an idea into a working prototype. Open to individual innovators, so a company is not required.',
  cost: 'Free to apply',
  applyAt: 'https://nidhi.dst.gov.in/',
  source: 'https://www.startupgrantsindia.com/type/grant',
  verifiedOn: VERIFIED_ON,
  sectors: ['hardware', 'deeptech', 'deep tech', 'manufacturing', 'energy', 'clean energy', 'cleantech', 'climate', 'robotics', 'iot', 'internet of things', 'electric vehicles', 'ev', 'smart grid', 'agritech', 'space', 'semiconductors'],
  criteria: [
    {
      label: 'A hardware or deep-technology product needing a physical prototype',
      check: (v) => {
        const hit = sectorMatch(v.domain, NIDHI_PRAYAS.sectors);
        if (hit) return MET(`This venture works in ${hit}, which fits the scheme's focus.`);
        return HUMAN('This looks like a software venture. PRAYAS is aimed at physical prototypes, so judge whether yours qualifies.');
      },
    },
    {
      label: 'Applied through a NIDHI-empanelled incubator or technology business incubator',
      check: () => HUMAN('You apply through an empanelled incubator rather than directly.'),
    },
    {
      label: 'At proof-of-concept or prototype stage',
      check: (v) => ['Idea', 'Prototype'].includes(v.stage)
        ? MET(`This venture is at ${v.stage} stage, which is what the scheme funds.`)
        : NOT_MET(`This venture is at ${v.stage || 'an unstated'} stage. PRAYAS funds work before that point.`),
    },
  ],
};

const BIRAC_BIG = {
  id: 'BIRAC_BIG',
  name: 'BIRAC Biotechnology Ignition Grant',
  authority: 'Biotechnology Industry Research Assistance Council',
  oneLine: 'Up to ₹50 lakh over 18 months for biotech and life sciences, with no equity given up.',
  worth: "India's largest early-stage biotech grant, non-dilutive, disbursed against milestones.",
  cost: 'Free to apply',
  applyAt: 'https://birac.nic.in/',
  source: 'https://companyavenueadvisory.com/startup-schemes',
  verifiedOn: VERIFIED_ON,
  sectors: ['biotech', 'biotechnology', 'healthcare', 'health', 'healthtech', 'medtech', 'medical devices', 'life sciences', 'lifesciences', 'pharma', 'pharmaceuticals', 'diagnostics', 'telemedicine', 'agritech', 'genomics'],
  criteria: [
    {
      label: 'Working in biotechnology, life sciences or medical technology',
      check: (v) => {
        const hit = sectorMatch(v.domain, BIRAC_BIG.sectors);
        return hit
          ? MET(`This venture works in ${hit}, which is within the scheme's remit.`)
          : NOT_MET('This venture is outside biotechnology and life sciences, which is what BIG funds.');
      },
    },
    {
      label: 'An idea with scientific merit at proof-of-concept stage',
      check: () => HUMAN('Assessed by a scientific review committee.'),
    },
  ],
};

const SCHEMES = [DPIIT_RECOGNITION, SISFS, SECTION_80IAC, NIDHI_PRAYAS, BIRAC_BIG];

module.exports = { SCHEMES, ENTITY_LABEL, VERIFIED_ON, yearsSince, sectorMatch };
