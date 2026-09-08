/**
 * Real, comprehensive fix: every remaining real account (founders,
 * contributors, investors) gets a real, distinct headline and bio —
 * no blanks anywhere. Per direct instruction: matching must be
 * explainable purely from real, visible profile data, never a blank
 * profile that happens to still produce a result.
 * Run: node scripts/fill-all-profiles.js
 */
require('dotenv').config();
const BASE = 'http://localhost:3000/api';
const PASSWORD = 'SeedPass123!';

const FOUNDERS = [
  { email: 'founder.neura@seed.test', headline: 'Founder & CEO, NeuraHealth', bio: 'Building AI-powered telemedicine for rural communities that lack specialist access.' },
  { email: 'founder.ecocharge@seed.test', headline: 'Founder & CEO, EcoCharge', bio: 'Building AI-driven smart-grid infrastructure for EV charging networks.' },
  { email: 'founder.learnloop@seed.test', headline: 'Founder & CEO, LearnLoop', bio: 'Building adaptive K-12 learning software that adjusts in real time to how each student actually learns.' },
  { email: 'founder.paybridge@seed.test', headline: 'Founder & CEO, PayBridge', bio: 'Building cross-border payment infrastructure for underbanked markets.' },
  { email: 'founder.logichain@seed.test', headline: 'Founder & CEO, LogiChain', bio: 'Building AI-powered logistics and supply-chain optimization for mid-market shippers.' },
  { email: 'founder.climatelens@seed.test', headline: 'Founder & CEO, ClimateLens', bio: 'Building satellite-driven agricultural risk assessment for crop insurers.' },
  { email: 'founder.securelayer@seed.test', headline: 'Founder & CEO, SecureLayer', bio: 'Building continuous security monitoring for small businesses too small to have a dedicated security team.' },
  { email: 'founder.keystack@seed.test', headline: 'Founder & CEO, KeyStack', bio: 'Building property management software for independent landlords and small real estate investors.' },
  { email: 'founder.teampulse@seed.test', headline: 'Founder & CEO, TeamPulse', bio: 'Building people-analytics software that catches burnout before it becomes attrition.' },
  { email: 'founder.streamline@seed.test', headline: 'Founder & CEO, Streamline', bio: 'Building a unified monetization platform for independent content creators.' },
  { email: 'founder.clauseiq@seed.test', headline: 'Founder & CEO, ClauseIQ', bio: 'Building AI-powered contract review for small law firms and in-house legal teams.' },
  { email: 'founder.geneforge@seed.test', headline: 'Founder & CEO, GeneForge', bio: 'Building lab automation infrastructure for synthetic biology researchers.' },
];

const CONTRIBUTORS = [
  { email: 'c.priya@seed.test', bio: 'Data scientist focused on ML modeling and applied statistics.' },
  { email: 'c.arjun@seed.test', bio: 'Full stack engineer who recently moved into fintech compliance work.' },
  { email: 'c.sara@seed.test', bio: 'ML engineer specializing in computer vision and model architecture.' },
  { email: 'c.rahul@seed.test', bio: 'Backend engineer with real compliance-systems experience from fintech.' },
  { email: 'c.neha@seed.test', bio: 'Product designer focused on end-to-end UX from research through prototyping.' },
  { email: 'c.vikram@seed.test', bio: 'DevOps engineer running production Kubernetes infrastructure at scale.' },
  { email: 'c.ananya@seed.test', bio: 'Growth marketer with a background in B2B sales and content strategy.' },
  { email: 'c.karan@seed.test', bio: 'Mobile engineer building native iOS, Android, and React Native apps.' },
  { email: 'c.divya@seed.test', bio: 'Data engineer specializing in ETL pipelines and logistics data.' },
  { email: 'c.aditya@seed.test', bio: 'Business development lead with enterprise sales and partnership experience.' },
  { email: 'c.meera@seed.test', bio: 'UX researcher focused on usability testing and qualitative research.' },
  { email: 'c.rohan@seed.test', bio: 'Security engineer with application-security and compliance background.' },
  { email: 'c2.tanvi@seed.test', bio: 'Blockchain engineer building smart contracts and Web3 infrastructure.' },
  { email: 'c2.omar@seed.test', bio: 'AR/VR engineer specializing in spatial computing and 3D graphics.' },
  { email: 'c2.lisa@seed.test', bio: 'QA engineer building test automation into CI/CD pipelines.' },
  { email: 'c2.dev@seed.test', bio: 'Cloud infrastructure architect with cloud-security specialization across AWS, Azure, and GCP.' },
  { email: 'c2.simran@seed.test', bio: 'Biomedical engineer with regulatory-affairs and clinical-validation experience.' },
  { email: 'c2.wei@seed.test', bio: 'Supply chain analyst focused on logistics optimization and demand forecasting.' },
  { email: 'c2.sam@seed.test', bio: 'Product manager with a track record in roadmapping and user research across B2B products.' },
  { email: 'c2.carlos@seed.test', bio: 'Data scientist specializing in statistical modeling and applied ML.' },
  { email: 'c2.aisha@seed.test', bio: 'Content strategist focused on SEO and brand voice for early-stage products.' },
  { email: 'c2.rohit@seed.test', bio: 'Embedded systems engineer building firmware for IoT hardware.' },
  { email: 'c2.grace@seed.test', bio: 'UX writer specializing in microcopy and design systems.' },
  { email: 'c2.imran@seed.test', bio: 'Compliance specialist with deep AML/KYC and regulatory-reporting experience.' },
  { email: 'c2.nina@seed.test', bio: 'Growth engineer running A/B tests and analytics instrumentation.' },
  { email: 'c2.samuel@seed.test', bio: 'Agricultural technologist specializing in remote sensing and precision agriculture.' },
  { email: 'c2.priyanka@seed.test', bio: 'Frontend engineer focused on accessible, production React applications.' },
  { email: 'c2.jamal@seed.test', bio: 'Sales engineer bridging technical solution architecture and B2B deals.' },
  { email: 'c2.elena@seed.test', bio: 'Data privacy officer with GDPR compliance and security-policy experience.' },
  { email: 'c2.harish@seed.test', bio: 'Site reliability engineer focused on monitoring and incident response.' },
  { email: 'c2.mei@seed.test', bio: 'Instructional designer with a background in learning science and curriculum design.' },
  { email: 'c2.victor@seed.test', bio: 'Hardware engineer specializing in PCB design and electrical prototyping.' },
  { email: 'c2.zara@seed.test', bio: 'Community manager with real experience building and running online communities.' },
  { email: 'c2.thabo@seed.test', bio: 'ML engineer focused on computer vision and MLOps deployment.' },
  { email: 'c2.isabella@seed.test', bio: 'Finance and operations lead with fundraising-support experience for early-stage startups.' },
  { email: 'c2.arvind@seed.test', bio: 'Backend engineer specializing in distributed systems and PostgreSQL.' },
  { email: 'c2.sofia@seed.test', bio: 'Design researcher focused on usability testing and design thinking.' },
];

const INVESTORS = [
  { email: 'investor@test.com', headline: 'Early-stage investor', bio: 'Backing early food-tech and hospitality SaaS founders.' },
  { email: 'i.raj@seed.test', headline: 'Early-stage investor, food-tech & hospitality', bio: 'Raj Capital backs early founders building food-tech and hospitality SaaS.' },
  { email: 'i.meridian@seed.test', headline: 'Seed-to-Series A investor, health-tech & fintech', bio: 'Meridian Ventures invests in health-tech and fintech infrastructure from seed through Series A.' },
  { email: 'i.greenseed@seed.test', headline: 'Pre-seed/seed investor, climate & energy', bio: 'GreenSeed Partners backs climate and energy infrastructure at the earliest stages.' },
  { email: 'i.nextwave@seed.test', headline: 'Early-stage generalist investor', bio: 'NextWave Angels invests opportunistically across edtech, SaaS, and logistics at the idea and prototype stage.' },
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function login(email) {
  const res = await fetch(`${BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: PASSWORD }) });
  return (await res.json()).token;
}
async function fillProfile(email, headline, bio) {
  await sleep(3500); // real fix: confirmed authLimit is 20 requests/60s on /auth/login — this paces every account safely under that cap
  const token = await login(email);
  if (!token) { console.log(`  ✗ ${email}: login failed`); return; }
  const body = { bio };
  if (headline) body.headline = headline;
  const res = await fetch(`${BASE}/profiles/me`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  const data = await res.json();
  console.log(data.success ? `  ✓ ${email}` : `  ✗ ${email}: ${data.error}`);
}

async function run() {
  console.log('=== Filling real headline/bio for every remaining founder ===');
  for (const f of FOUNDERS) await fillProfile(f.email, f.headline, f.bio);
  console.log('\n=== Filling real bio for every remaining contributor (headlines already set) ===');
  for (const c of CONTRIBUTORS) await fillProfile(c.email, null, c.bio);
  console.log('\n=== Filling real headline/bio for every remaining investor ===');
  for (const i of INVESTORS) await fillProfile(i.email, i.headline, i.bio);
  console.log('\n=== Done. ===');
}
run();
